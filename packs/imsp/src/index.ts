import { Datapack, latestVersion } from "../../../mcgen/src/index.ts";

const PACK_FORMAT = latestVersion();

export function build(): Datapack {
  const d = new Datapack(
    "imsp",
    PACK_FORMAT,
    "An improvement to the normal spectator.",
  );

  const load = d.defineFunction("load", ["scoreboard objectives add imsp dummy"]);

  const saveGamemodeUuid = d.defineFunction("save_gamemode_uuid", [
    "$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 0",
    "$execute as @s[gamemode=creative] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 1",
    "$execute as @s[gamemode=adventure] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 2",
    "$execute as @s[gamemode=spectator] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 3",
    "",
    "$execute store success score different imsp run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode_prev set from storage imsp:$(0)$(1)$(2)$(3) gamemode",
    "",
    "$execute if score different imsp matches 1 as @s[gamemode=survival] run function imsp:tp with storage imsp:$(0)$(1)$(2)$(3)",
    "$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) x set from entity @s Pos[0]",
    "$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) y set from entity @s Pos[1]",
    "$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) z set from entity @s Pos[2]",
  ]);

  const saveGamemode = d.defineFunction("save_gamemode", [
    "data modify storage imsp:uuid 0 set from entity @s UUID[0]",
    "data modify storage imsp:uuid 1 set from entity @s UUID[1]",
    "data modify storage imsp:uuid 2 set from entity @s UUID[2]",
    "data modify storage imsp:uuid 3 set from entity @s UUID[3]",
    `function ${saveGamemodeUuid.name} with storage imsp:uuid`,
  ]);

  d.defineFunction("tp", ["$tp @s $(x) $(y) $(z)"]);

  const tick = d.defineFunction("tick", [
    `execute as @a run function ${saveGamemode.name} with entity @s`,
  ]);

  d.onLoad(load);
  d.onTick(tick);

  return d;
}
