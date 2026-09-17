import type { Datapack } from "../mcgen/src/index.ts";
import { build as buildAom } from "../packs/aom/src/index.ts";
import { build as buildDps } from "../packs/dps/src/index.ts";
import { build as buildImsp } from "../packs/imsp/src/index.ts";
import { build as buildUnbreakable } from "../packs/unbreakable/src/index.ts";

export interface PackEntry {
  name: string;
  build: () => Datapack;
}

export const packs: PackEntry[] = [
  { name: "aom", build: buildAom },
  { name: "dps", build: buildDps },
  { name: "imsp", build: buildImsp },
  { name: "unbreakable", build: buildUnbreakable },
];
