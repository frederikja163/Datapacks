import { packs } from "./packs.ts";

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
