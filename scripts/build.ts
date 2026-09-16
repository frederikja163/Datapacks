import { Datapack } from "../mcgen/src/index.ts";
import { build as buildDps } from "../packs/dps/src/index.ts";
import { build as buildImsp } from "../packs/imsp/src/index.ts";
import { build as buildUnbreakable } from "../packs/unbreakable/src/index.ts";

const packs: Array<{ name: string; build: () => Datapack }> = [
  { name: "dps", build: buildDps },
  { name: "imsp", build: buildImsp },
  { name: "unbreakable", build: buildUnbreakable },
];

const only = process.argv[2];

let built = 0;
for (const { name, build } of packs) {
  if (only && only !== name) continue;
  const pack = build();
  pack.writeTo(`packs/${name}/build/${pack.namespace}`);
  built += 1;
}

if (only && built === 0) {
  console.error(`Unknown pack: ${only}`);
  process.exit(1);
}
