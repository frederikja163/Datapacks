import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Version } from "./models/index.ts";

/**
 * A resource pack built from TypeScript, the asset-side counterpart to
 * {@link Datapack}. Anything written through the `assets` helpers lands under
 * `assets/<namespace>/...`; `pack.mcmeta` is generated on write with the
 * resource pack format for {@link version}.
 *
 * A pack may contain both text (JSON models, item definitions) and raw binary
 * assets (PNGs), so the file map holds either.
 */
export class ResourcePack {
  private readonly files = new Map<string, string | Uint8Array>();

  constructor(
    readonly namespace: string,
    readonly version: Version,
    readonly description: string | Record<string, unknown>,
    /** Human label used by install/uninstall chat messages. */
    readonly label: string = namespace,
  ) {}

  /** Write a JSON asset, e.g. `assets/<ns>/items/foo.json` or a model. */
  json(path: string, value: unknown): void {
    this.set(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  /** Write a text asset verbatim. */
  text(path: string, content: string): void {
    this.set(path, content);
  }

  /** Write a binary asset (e.g. a PNG texture). */
  binary(path: string, data: Uint8Array): void {
    this.set(path, data);
  }

  /** Copy a file from disk into the pack, preserving its bytes. */
  copy(path: string, source: string): void {
    this.set(path, readFileSync(source));
  }

  has(path: string): boolean {
    return this.files.has(path);
  }

  private set(path: string, content: string | Uint8Array): void {
    if (this.files.has(path)) {
      throw new Error(`Duplicate resource pack file: ${path}`);
    }
    this.files.set(path, content);
  }

  writeTo(root: string): void {
    const meta = {
      pack: {
        description: this.description,
        min_format: this.version.resourcePackFormat,
        max_format: this.version.resourcePackFormat,
      },
    };

    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "pack.mcmeta"), `${JSON.stringify(meta, null, 2)}\n`);
    for (const [path, content] of this.files) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
  }
}
