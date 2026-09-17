import {
  Datapack,
  defineUninstall,
  latestVersion,
  objectiveAdd,
  text,
  tellraw,
  triggerDispatch,
} from "../../../mcgen/src/index.ts";

const PACK_FORMAT = latestVersion();

function triggerLink(command: string, hover: string) {
  return text(command, {
    color: "aqua",
    underlined: true,
    click_event: { action: "run_command", command },
    hover_event: { action: "show_text", value: hover },
  });
}

export function build(): Datapack {
  const d = new Datapack(
    "imsp",
    PACK_FORMAT,
    "An improvement to the normal spectator.",
  );

  const load = d.defineFunction("load", [
    "scoreboard objectives remove imsp",
    objectiveAdd("imsp", "trigger"),
    objectiveAdd("imsp.toggle", "trigger"),
    objectiveAdd("imsp_enabled", "dummy"),
    objectiveAdd("imsp_initialized", "dummy"),
    objectiveAdd("imsp_tmp", "dummy"),
    objectiveAdd("imsp_id", "dummy"),
    objectiveAdd("imsp_gamemode", "dummy"),
    objectiveAdd("imsp_gamemode_prev", "dummy"),
  ]);

  const initPlayer = d.defineFunction("init_player", [
    "scoreboard players set @s imsp_enabled 1",
    "scoreboard players set @s imsp_initialized 1",
  ]);

  // Each player gets a unique body tag so a mannequin can be matched back to
  // exactly one player and cleaned up on return.
  const assignId = d.defineFunction("body/assign_id", [
    "scoreboard players add #next imsp_id 1",
    "scoreboard players operation @s imsp_id = #next imsp_id",
  ]);

  // `$(id)` is the unique body tag. Coords are relative because this is always
  // invoked at the player. The profile and rotation are copied after the fact
  // so the only macro value is a plain integer.
  const summonBody = d.defineFunction("body/summon", [
    '$summon minecraft:mannequin ~ ~ ~ {Tags:["imsp_body","imsp_body_$(id)"],Invulnerable:1b,Silent:1b,hide_description:1b}',
    "$data modify entity @e[tag=imsp_body_$(id),limit=1] profile.id set from entity @s UUID",
    "$data modify entity @e[tag=imsp_body_$(id),limit=1] Rotation set from entity @s Rotation",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] armor.head from entity @s armor.head",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] armor.chest from entity @s armor.chest",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] armor.legs from entity @s armor.legs",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] armor.feet from entity @s armor.feet",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] weapon.mainhand from entity @s weapon.mainhand",
    "$item replace entity @e[tag=imsp_body_$(id),limit=1] weapon.offhand from entity @s weapon.offhand",
  ]);

  const finishBody = d.defineFunction("body/finish", [
    "execute store result storage imsp:finish id int 1 run scoreboard players get @s imsp_id",
    "function imsp:body/finish/run with storage imsp:finish",
  ]);

  d.defineFunction("body/finish/run", [
    "$execute at @e[tag=imsp_body_$(id),limit=1] run tp @s ~ ~ ~ ~ ~",
    "$kill @e[tag=imsp_body_$(id)]",
  ]);

  // Restore to the body whenever the player ends up back in survival, however
  // that happened (our trigger or an admin /gamemode).
  const gamemodeCheck = d.defineFunction("gamemode/check", [
    "execute if entity @s[gamemode=survival] run scoreboard players set @s imsp_gamemode 0",
    "execute if entity @s[gamemode=creative] run scoreboard players set @s imsp_gamemode 1",
    "execute if entity @s[gamemode=adventure] run scoreboard players set @s imsp_gamemode 2",
    "execute if entity @s[gamemode=spectator] run scoreboard players set @s imsp_gamemode 3",
    "scoreboard players operation @s imsp_tmp = @s imsp_gamemode",
    "scoreboard players operation @s imsp_tmp -= @s imsp_gamemode_prev",
    "execute if score @s imsp_gamemode matches 0..0 unless score @s imsp_tmp matches 0..0 run function imsp:body/finish",
    "scoreboard players operation @s imsp_gamemode_prev = @s imsp_gamemode",
  ]);

  const spectateOn = d.defineFunction("spectate/on", [
    "execute if score @s imsp_id matches 0..0 run function imsp:body/assign_id",
    "execute store result storage imsp:body id int 1 run scoreboard players get @s imsp_id",
    "function imsp:body/summon with storage imsp:body",
    "gamemode spectator @s",
    tellraw("@s", [
      text("[Spectator] ", { color: "gray" }),
      text("Your body stays behind. Run ", { color: "white" }),
      triggerLink("/trigger imsp", "Return to your body"),
      text(" to return to it.", { color: "white" }),
    ]),
  ]);

  const spectateOff = d.defineFunction("spectate/off", [
    "function imsp:body/finish",
    "gamemode survival @s",
    tellraw("@s", [
      text("[Spectator] ", { color: "gray" }),
      text("Welcome back to your body. Run ", { color: "white" }),
      triggerLink("/trigger imsp", "Spectate again"),
      text(" to spectate again.", { color: "white" }),
    ]),
  ]);

  const spectate = d.defineFunction("trigger/spectate", [
    "execute if score @s imsp_enabled matches 0..0 run return fail",
    "execute if entity @s[gamemode=spectator] run function imsp:spectate/off",
    "execute unless entity @s[gamemode=spectator] run function imsp:spectate/on",
  ]);

  const toggle = d.defineFunction("trigger/toggle", [
    "execute if score @s imsp_enabled matches 0..0 run scoreboard players set @s imsp_tmp 1",
    "execute if score @s imsp_enabled matches 1..1 run scoreboard players set @s imsp_tmp 0",
    "scoreboard players operation @s imsp_enabled = @s imsp_tmp",
    "execute if score @s imsp_enabled matches 1..1 run function imsp:trigger/toggle/on",
    "execute if score @s imsp_enabled matches 0..0 run function imsp:trigger/toggle/off",
  ]);

  d.defineFunction("trigger/toggle/on", [
    tellraw("@s", [
      text("[Spectator] ", { color: "gray" }),
      text("Improved spectator enabled. Run ", { color: "white" }),
      triggerLink("/trigger imsp.toggle", "Disable improved spectator"),
      text(" to disable.", { color: "white" }),
    ]),
  ]);

  d.defineFunction("trigger/toggle/off", [
    tellraw("@s", [
      text("[Spectator] ", { color: "gray" }),
      text("Improved spectator disabled. Run ", { color: "white" }),
      triggerLink("/trigger imsp.toggle", "Enable improved spectator"),
      text(" to enable.", { color: "white" }),
    ]),
    `execute if entity @s[gamemode=spectator] run function ${spectateOff.name}`,
  ]);

  const tick = d.defineFunction("tick", [
    `execute as @a[scores={imsp_initialized=0..0}] run function ${initPlayer.name}`,
    `execute as @a[scores={imsp_enabled=1..1}] run function ${gamemodeCheck.name}`,
    "",
    ...triggerDispatch([
      { objective: "imsp", handler: spectate },
      { objective: "imsp.toggle", handler: toggle },
    ]),
  ]);

  d.onLoad(load);
  d.onTick(tick);

  defineUninstall(d, {
    objectives: [
      "imsp",
      "imsp.toggle",
      "imsp_enabled",
      "imsp_initialized",
      "imsp_tmp",
      "imsp_id",
      "imsp_gamemode",
      "imsp_gamemode_prev",
    ],
    storage: ["imsp:body id", "imsp:finish id"],
    kill: ["@e[tag=imsp_body]"],
  });

  return d;
}
