// Per-pack uninstall function.
//
// Datapacks leave scoreboard objectives, command storage, tagged entities and
// scheduled functions behind when their folder is deleted. A major update
// should therefore run the old version's `<namespace>:uninstall` first, then
// remove it. Every pack registers one so the workflow is always the same.

import { tellraw } from "./commands.ts";
import type { Datapack } from "./pack.ts";
import { text } from "./text.ts";

export interface UninstallSpec {
  /** Scoreboard objectives created by the pack. */
  readonly objectives?: readonly string[];
  /** `storage <id> [<path>]` targets created by the pack. */
  readonly storage?: readonly string[];
  /** Entity selectors to remove (e.g. `@e[tag=foo]`). */
  readonly kill?: readonly string[];
  /** Scheduled function names to clear. */
  readonly schedules?: readonly string[];
}

export function defineUninstall(d: Datapack, spec: UninstallSpec): void {
  const sections: string[][] = [];

  const clean = (values: readonly string[] | undefined): string[] =>
    (values ?? []).filter((value) => value.length > 0);

  const schedules = clean(spec.schedules);
  if (schedules.length) {
    sections.push(schedules.map((name) => `schedule clear ${name}`));
  }

  const objectives = clean(spec.objectives);
  if (objectives.length) {
    sections.push(objectives.map((name) => `scoreboard objectives remove ${name}`));
  }

  const storage = clean(spec.storage);
  if (storage.length) {
    sections.push(storage.map((target) => `data remove storage ${target}`));
  }

  const kill = clean(spec.kill);
  if (kill.length) {
    sections.push(kill.map((selector) => `kill ${selector}`));
  }

  sections.push([
    tellraw("@a", [
      text(`[${d.namespace}] `, { color: "gray" }),
      text("Uninstalled. Remove the datapack and run ", { color: "white" }),
      text("/reload", { color: "aqua" }),
      text(".", { color: "white" }),
    ]),
  ]);

  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length) lines.push("");
    lines.push(...section);
  }

  d.defineFunction("uninstall", lines);
}
