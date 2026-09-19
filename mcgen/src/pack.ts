import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Version } from "./models/index.ts";

export type CommandLine = string | undefined | null | false;
export type Lines = CommandLine[];

/** A tag entry: a plain id, or `{ id, required: false }` to tolerate the id
 *  being absent (e.g. an enchantment defined by another datapack). */
export type TagValue = string | { id: string; required?: boolean };

/** A compile-time handle to a datapack function. Calling/referencing anything
 *  that is not a `FunctionRef` is a type error, so dangling function names are
 *  caught by `tsc` instead of at runtime. */
export interface FunctionRef {
  readonly namespace: string;
  readonly path: string;
  readonly name: string;
}

export class Datapack {
  private readonly files = new Map<string, string>();
  private readonly load: FunctionRef[] = [];
  private readonly tick: FunctionRef[] = [];

  constructor(
    readonly namespace: string,
    readonly version: Version,
    readonly description: string | Record<string, unknown>,
  ) {}

  ref(path: string): FunctionRef {
    return { namespace: this.namespace, path, name: `${this.namespace}:${path}` };
  }

  defineFunction(path: string, lines: Lines): FunctionRef {
    const ref = this.ref(path);
    const body = lines
      .filter(
        (line): line is string => typeof line === "string" && line.length > 0,
      )
      // Minecraft rejects a `$` line with no `$(...)` placeholder
      // ("No variables in macro") and fails to load the whole function, so a
      // prefixed line that ended up without macros is emitted as a plain line.
      // The inverse is a silent runtime bug: a line with `$(...)` that is not
      // prefixed is never substituted, so the literal `$(name)` reaches the
      // game. Reject it at build time instead.
      .map((line) => {
        if (line.includes("$(") && !line.startsWith("$")) {
          throw new Error(
            `Macro line in ${path} is missing the leading $: ${line}`,
          );
        }
        for (const match of line.matchAll(/\$/g)) {
          const at = match.index ?? 0;
          if (at !== 0 && line[at + 1] !== "(") {
            throw new Error(
              `Unexpected $ in the middle of ${path}: ${line}`,
            );
          }
        }
        return line.startsWith("$") && !line.includes("$(")
          ? line.slice(1)
          : line;
      });
    this.set(
      `data/${this.namespace}/function/${path}.mcfunction`,
      body.length ? `${body.join("\n")}\n` : "",
    );
    return ref;
  }

  onLoad(...refs: FunctionRef[]): void {
    this.load.push(...refs);
  }

  onTick(...refs: FunctionRef[]): void {
    this.tick.push(...refs);
  }

  predicate(path: string, value: unknown): void {
    this.json(`data/${this.namespace}/predicate/${path}.json`, value);
  }

  itemModifier(path: string, value: unknown): void {
    this.json(`data/${this.namespace}/item_modifier/${path}.json`, value);
  }

  advancement(path: string, value: unknown): void {
    this.json(`data/${this.namespace}/advancement/${path}.json`, value);
  }

  recipe(path: string, value: unknown): void {
    this.json(`data/${this.namespace}/recipe/${path}.json`, value);
  }

  enchantment(path: string, value: unknown): void {
    this.json(`data/${this.namespace}/enchantment/${path}.json`, value);
  }

  /** Extends a vanilla tag (`data/minecraft/tags/<registry>/<path>.json`).
   *  Tags merge additively across datapacks unless `replace` is set, so this
   *  adds entries to the vanilla tag rather than overwriting it. An entry may
   *  be `{ id, required: false }` so a missing registry element (e.g. an
   *  enchantment referenced before the registry reloads) does not fail the
   *  whole tag and everything that depends on it. */
  vanillaTag(registry: string, path: string, values: TagValue[]): void {
    this.json(`data/minecraft/tags/${registry}/${path}.json`, { values });
  }

  /** A tag in this pack's own namespace (`data/<ns>/tags/<registry>/<path>`). */
  tag(registry: string, path: string, values: TagValue[]): void {
    this.json(`data/${this.namespace}/tags/${registry}/${path}.json`, { values });
  }

  itemTag(path: string, values: string[]): void {
    this.json(`data/${this.namespace}/tags/item/${path}.json`, { values });
  }

  blockTag(path: string, values: string[]): void {
    this.json(`data/${this.namespace}/tags/block/${path}.json`, { values });
  }

  private json(path: string, value: unknown): void {
    this.set(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  private set(path: string, content: string): void {
    if (this.files.has(path)) {
      throw new Error(`Duplicate datapack file: ${path}`);
    }
    this.files.set(path, content);
  }

  writeTo(root: string): void {
    this.json("pack.mcmeta", {
      pack: {
        description: this.description,
        min_format: this.version.packFormat,
        max_format: this.version.packFormat,
      },
    });
    if (this.load.length) {
      this.json("data/minecraft/tags/function/load.json", {
        values: this.load.map((ref) => ref.name),
      });
    }
    if (this.tick.length) {
      this.json("data/minecraft/tags/function/tick.json", {
        values: this.tick.map((ref) => ref.name),
      });
    }

    rmSync(root, { recursive: true, force: true });
    for (const [path, content] of this.files) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
  }
}
