import type { Datapack, PackDocs } from "../mcgen/src/index.ts";
import { build as buildAom } from "../packs/aom/src/index.ts";
import { DOCS as aomDocs } from "../packs/aom/src/docs.ts";
import { build as buildDps } from "../packs/dps/src/index.ts";
import { DOCS as dpsDocs } from "../packs/dps/src/docs.ts";
import { build as buildImsp } from "../packs/imsp/src/index.ts";
import { DOCS as imspDocs } from "../packs/imsp/src/docs.ts";
import { build as buildSoulbound } from "../packs/soulbound/src/index.ts";
import { DOCS as soulboundDocs } from "../packs/soulbound/src/docs.ts";
import { build as buildTechdemo } from "../packs/techdemo/src/index.ts";
import { DOCS as techdemoDocs } from "../packs/techdemo/src/docs.ts";
import { build as buildUnbreakable } from "../packs/unbreakable/src/index.ts";
import { DOCS as unbreakableDocs } from "../packs/unbreakable/src/docs.ts";

export interface PackEntry {
  name: string;
  build: () => Datapack;
  docs: PackDocs;
}

export const packs: PackEntry[] = [
  { name: "aom", build: buildAom, docs: aomDocs },
  { name: "dps", build: buildDps, docs: dpsDocs },
  { name: "imsp", build: buildImsp, docs: imspDocs },
  { name: "soulbound", build: buildSoulbound, docs: soulboundDocs },
  { name: "techdemo", build: buildTechdemo, docs: techdemoDocs },
  { name: "unbreakable", build: buildUnbreakable, docs: unbreakableDocs },
];
