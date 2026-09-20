// Install announcement.
//
// A pack can't run code once its folder is deleted, so "installed" is shown to
// each player the first time they are online with the pack, and "removed" is
// printed by the `<namespace>:uninstall` function. Each player carries a tag so
// the enabled message is shown exactly once per install; `defineUninstall`
// removes the tag, so reinstalling announces again.

import { tellraw } from "./commands.ts";
import type { Datapack } from "./pack.ts";
import { text } from "./text.ts";

export const INSTALL_TAG_PREFIX = "mcgen_installed_";

export function installTag(namespace: string): string {
  return `${INSTALL_TAG_PREFIX}${namespace}`;
}

export function defineInstall(d: Datapack): void {
  const tag = installTag(d.namespace);
  const announce = d.defineFunction("internal/install_announce", [
    tellraw("@s", [
      text(`[${d.namespace}] `, { color: "gray" }),
      text(`${d.label} enabled.`, { color: "green" }),
    ]),
    `tag @s add ${tag}`,
  ]);
  d.onTick(
    d.defineFunction("internal/install_check", [
      `execute as @a[tag=!${tag}] run function ${announce.name}`,
    ]),
  );
}
