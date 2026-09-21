import { packs } from "./packs.ts";

const only = process.argv[2];

let built = 0;
for (const { name, build, resourcePack } of packs) {
  if (only && only !== name) continue;
  const pack = build();
  pack.writeTo(`packs/${name}/build/${pack.namespace}`);
  if (resourcePack) {
    const rp = resourcePack();
    rp.writeTo(`packs/${name}/build/${rp.namespace}-rp`);
  }
  built += 1;
}

if (only && built === 0) {
  console.error(`Unknown pack: ${only}`);
  process.exit(1);
}
