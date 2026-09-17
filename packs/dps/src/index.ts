import {
  Datapack,
  defineUninstall,
  latestVersion,
  nbt,
  score,
  selector,
  snbt,
  summonItem,
  text,
  type EffectId,
  type FunctionRef,
  type ItemId,
  type Lines,
  type TextComponent,
} from "../../../mcgen/src/index.ts";
import { ACTIONS, type Action } from "./actions.ts";

type SkillName = keyof typeof ACTIONS;
type Powerup = "effect" | "tree_cutter" | "none";

interface SkillConfig {
  readonly name: SkillName;
  readonly display: string;
  readonly powerup: Powerup;
  readonly effect?: EffectId;
  readonly effectDisplay?: string;
  readonly useEffectArg?: string;
}

const SKILLS: readonly SkillConfig[] = [
  {
    name: "combat",
    display: "⚔ Combat",
    powerup: "effect",
    effect: "minecraft:strength",
    effectDisplay: "Strength",
    useEffectArg: "strength",
  },
  {
    name: "digging",
    display: "🪏 Digging",
    powerup: "effect",
    effect: "minecraft:haste",
    effectDisplay: "Haste",
  },
  {
    name: "mining",
    display: "⛏ Mining",
    powerup: "effect",
    effect: "minecraft:haste",
    effectDisplay: "Haste",
    useEffectArg: "haste",
  },
  { name: "woodcutting", display: "🪓 Woodcutting", powerup: "tree_cutter" },
  { name: "farming", display: "☘ Farming", powerup: "none" },
  { name: "enchanting", display: "✨ Enchanting", powerup: "none" },
  { name: "fishing", display: "🐟 Fishing", powerup: "none" },
];

const LOG_TYPES = [
  "acacia",
  "birch",
  "cherry",
  "dark_oak",
  "jungle",
  "mangrove",
  "oak",
  "pale_oak",
  "spruce",
] as const;

const STRIPPED_LOG: Record<(typeof LOG_TYPES)[number], ItemId> = {
  acacia: "minecraft:stripped_acacia_log",
  birch: "minecraft:stripped_birch_log",
  cherry: "minecraft:stripped_cherry_log",
  dark_oak: "minecraft:stripped_dark_oak_log",
  jungle: "minecraft:stripped_jungle_log",
  mangrove: "minecraft:stripped_mangrove_log",
  oak: "minecraft:stripped_oak_log",
  pale_oak: "minecraft:stripped_pale_oak_log",
  spruce: "minecraft:stripped_spruce_log",
};

const LOG_OFFSETS: Array<[number, number, number]> = [];
for (const dx of [1, 0, -1]) {
  for (const dy of [1, 0, -1]) {
    for (const dz of [1, 0, -1]) {
      if (dx === 0 && dy === 0 && dz === 0) continue;
      LOG_OFFSETS.push([dx, dy, dz]);
    }
  }
}

const sb = (skill: SkillName): string => `dps_${skill}`;

function displayText(): TextComponent {
  return nbt("$(skill).display", { storage: "dps:skill" }, {
    interpret: true,
    color: "gold",
  });
}

function effectText(): TextComponent {
  return nbt("$(skill).Effect", { storage: "dps:skill" }, {
    interpret: true,
    color: "gold",
  });
}

function actionLines(skill: SkillName): string[] {
  const lines: string[] = [];
  let shownXp: number | undefined;
  for (const action of ACTIONS[skill] as readonly Action[]) {
    if (action.xp !== shownXp) {
      lines.push(`# ${action.xp}xp`);
      shownXp = action.xp;
    }
    lines.push(
      `$function $(function) ${JSON.stringify({
        skill: sb(skill),
        name: action.objective,
        scoreboard: action.criteria,
        xp: action.xp,
      })}`,
    );
  }
  return lines;
}

export function build(): Datapack {
  const d = new Datapack(
    "dps",
    latestVersion(),
    "Data Pack Skills. Inspired by MCMMO, but in datapack form",
  );

  const utility = {
    calcPercentage: d.defineFunction("utility/calc_percentage", [
      "$scoreboard players operation @s $(skill)_percentage = @s $(skill)_xp",
      "$scoreboard players operation @s $(skill)_percentage *= 100 dps_globals",
      "$scoreboard players operation @s $(skill)_percentage /= @s $(skill)_req",
    ]),
    defineAction: d.defineFunction("utility/define_action", [
      "$scoreboard objectives add $(name) $(scoreboard)",
      "$scoreboard players set $(name) dps_xp_config $(xp)",
    ]),
    nop: d.defineFunction("utility/nop", []),
    removeDurability: d.defineFunction("utility/remove_durability", [
      "execute if items entity @s weapon.mainhand *[minecraft:unbreakable] run return fail",
      "summon minecraft:armor_stand ~ ~ ~ {Tags:[dps_durability]}",
      "",
      "item replace entity @e[tag=dps_durability,limit=1] weapon.mainhand from entity @s weapon.mainhand",
      "execute as @e[tag=dps_durability,limit=1] store result score @s dps_tmp run data get entity @s equipment.mainhand.components.minecraft:damage",
      "execute as @e[tag=dps_durability,limit=1] store result entity @s equipment.mainhand.components.minecraft:damage int 1 run scoreboard players add @s dps_tmp 1",
      "item replace entity @s weapon.mainhand from entity @e[tag=dps_durability,limit=1] weapon.mainhand",
      "",
      "kill @e[tag=dps_durability,limit=1]",
      "",
    ]),
    skillInit: d.defineFunction("utility/skill_init", [
      "$scoreboard objectives add $(skill) trigger",
      "$scoreboard objectives add $(skill)_level dummy",
      "$scoreboard objectives add $(skill)_xp dummy",
      "$scoreboard objectives add $(skill)_req dummy",
      "$scoreboard objectives add $(skill)_percentage dummy",
      "",
      '$data modify storage dps:skill $(skill).display set value "$(display)"',
    ]),
    giveXpSuccess: d.defineFunction("utility/give_xp/success", [
      "$scoreboard players operation @s $(name) *= $(name) dps_xp_config",
      "$scoreboard players operation @s $(skill)_xp += @s $(name)",
      "$scoreboard players set @s $(name) 0",
      "",
      "$function dps:utility/calc_percentage {skill: $(skill)}",
    ]),
    giveXp: d.defineFunction("utility/give_xp/", [
      '$execute as @a[scores={$(name)=1..}] run function dps:utility/give_xp/success {skill: "$(skill)", name: "$(name)"}',
    ]),
    levelupPlaysound: d.defineFunction("utility/levelup/playsound", [
      "execute if score @s dps_lvl_up_type matches 2..2 run playsound minecraft:entity.firework_rocket.twinkle_far",
      "execute if score @s dps_lvl_up_type matches 1..1 run playsound minecraft:entity.player.levelup",
      "execute if score @s dps_lvl_up_type matches 0..0 run playsound minecraft:entity.experience_orb.pickup",
    ]),
    levelupAnnounce: d.defineFunction("utility/levelup/announce", [
      `$execute if score @s dps_lvl_up_type matches 1.. run tellraw @a[scores={dps_lvl_up_type=0..0}] ${snbt([
        text("[", { color: "gray" }),
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text("] ", { color: "gray" }),
        selector("@s", { color: "white" }),
      ])}`,
      `$tellraw @s ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" • ", { color: "dark_gray" }),
        text("📊 Total ", { color: "gold" }),
        score("@s", "dps_total_level", { color: "aqua" }),
        text("", { color: "yellow" }),
      ])}`,
    ]),
    rayCastRecursive: d.defineFunction("utility/ray_cast/recursive", [
      "scoreboard players remove __raycast__ dps_tmp 1",
      "execute if score __raycast__ dps_tmp matches ..0 run return fail",
      "",
      '$execute unless block ~ ~ ~ $(block) positioned ^ ^ ^0.1 run function dps:utility/ray_cast/recursive {success:"$(success)",block:"$(block)"}',
      "$execute if block ~ ~ ~ $(block) run $(success)",
    ]),
    rayCast: d.defineFunction("utility/ray_cast/", [
      "scoreboard players set __raycast__ dps_tmp 50",
      "",
      '$function dps:utility/ray_cast/recursive { success: "$(success)", block: "$(block)"}',
    ]),
  };

  const levelup: FunctionRef = d.defineFunction("utility/levelup/", [
    "# Has player leveled up.",
    "$execute if score @s $(skill)_xp < @s $(skill)_req run return fail",
    "",
    "# level up",
    "$scoreboard players operation @s $(skill)_xp -= @s $(skill)_req",
    "$scoreboard players add @s $(skill)_level 1",
    "scoreboard players add @s dps_total_level 1",
    "",
    "# normal",
    "scoreboard players set @s dps_lvl_up_type 0",
    "# minor",
    "$scoreboard players operation @s dps_tmp = @s $(skill)_level",
    "scoreboard players operation @s dps_tmp %= 10 dps_globals",
    "execute if score @s dps_tmp matches 0..0 run scoreboard players set @s dps_lvl_up_type 1",
    "#mayor",
    "$scoreboard players operation @s dps_tmp = @s $(skill)_level",
    "scoreboard players operation @s dps_tmp %= 100 dps_globals",
    "execute if score @s dps_tmp matches 0..0 run scoreboard players set @s dps_lvl_up_type 2",
    "",
    `execute as @s at @s run function ${utility.levelupPlaysound.name}`,
    '$function dps:utility/levelup/announce {skill: "$(skill)"}',
    '$function $(success) {skill: "$(skill)"}',
    '$function dps:utility/calc_percentage {skill: "$(skill)"}',
    "",
    "scoreboard players set @s dps_lvl_up_type 0",
    "",
    "# Calculate new requirement.",
    "$scoreboard players operation @s $(skill)_req = @s $(skill)_level",
    "",
    "$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req *= 2 dps_globals",
    "$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req += 7 dps_globals",
    "",
    "$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req *= 5 dps_globals",
    "$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req -= 38 dps_globals",
    "",
    "$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req *= 9 dps_globals",
    "$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req -= 158 dps_globals",
  ]);

  const effect = {
    init: d.defineFunction("powerup/effect/init", [
      '$function dps:utility/skill_init {skill: "$(skill)", display: "$(display)"}',
      "",
      "$scoreboard objectives add $(skill)_cooldown dummy",
      "$scoreboard objectives add $(skill)_time dummy",
      "$scoreboard objectives add $(skill)_time_max dummy",
      "$scoreboard objectives add $(skill)_amplifier dummy",
      "$scoreboard objectives add $(skill)_Amplifier dummy",
      "",
      '$data modify storage dps:skill $(skill).effect set value "$(effect)"',
      '$data modify storage dps:skill $(skill).Effect set value "$(Effect)"',
    ]),
    giveEffect: d.defineFunction("powerup/effect/give_effect", [
      "$effect give @s $(effect) $(time) $(amplifier)",
    ]),
    levelup: d.defineFunction("powerup/effect/levelup", [
      "$scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown",
      "",
      "$scoreboard players operation @s dps_tmp = @s $(skill)_Amplifier",
      "$scoreboard players operation @s $(skill)_amplifier = @s $(skill)_level",
      "$scoreboard players operation @s $(skill)_amplifier /= 100 dps_globals",
      "$scoreboard players operation @s $(skill)_Amplifier = @s $(skill)_amplifier",
      "$scoreboard players add @s $(skill)_Amplifier 1",
      `$execute unless score @s dps_tmp = @s $(skill)_Amplifier run tellraw @s ${snbt([
        "    ",
        effectText(),
        " ",
        score("@s", "dps_tmp", { color: "gold" }),
        text(" → ", { color: "white" }),
        effectText(),
        " ",
        score("@s", "$(skill)_Amplifier", { color: "gold" }),
      ])}`,
      "",
      "$scoreboard players operation @s dps_tmp = @s $(skill)_time_max",
      "$scoreboard players operation @s $(skill)_time_max = @s $(skill)_level",
      "$scoreboard players operation @s $(skill)_time_max /= 10 dps_globals",
      "$scoreboard players add @s $(skill)_time_max 1",
      `$execute unless score @s dps_tmp = @s $(skill)_time_max run tellraw @s ${snbt([
        "    ",
        effectText(),
        " ",
        score("@s", "dps_tmp", { color: "aqua" }),
        text("s", { color: "aqua" }),
        text(" → ", { color: "white" }),
        score("@s", "$(skill)_time_max", { color: "aqua" }),
        text("s", { color: "aqua" }),
      ])}`,
      "",
    ]),
    second: d.defineFunction("powerup/effect/second", [
      `$execute as @a[scores={$(skill)_cooldown=1..1}] run tellraw @s ${snbt([
        displayText(),
        text(" • ", { color: "dark_gray" }),
        effectText(),
        " ",
        score("@s", "$(skill)_Amplifier", { color: "gold" }),
        text(" Ready!", { color: "green" }),
      ])}`,
      "$execute as @a[scores={$(skill)_cooldown=1..1}] at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 0.2 0.2",
      "$execute as @a[scores={$(skill)_cooldown=1..}] run scoreboard players remove @s $(skill)_cooldown 1",
      "$execute as @a[scores={$(skill)_time=1..1}] at @s run playsound minecraft:block.note_block.bell player @s ~ ~ ~ 0.4 1.2 0.2",
      `$execute as @a[scores={$(skill)_time=1..1}] run tellraw @s ${snbt([
        displayText(),
        text(" • ", { color: "dark_gray" }),
        effectText(),
        " ",
        score("@s", "$(skill)_Amplifier", { color: "gold" }),
        text(" Stopped!", { color: "red" }),
      ])}`,
      "$execute as @a[scores={$(skill)_time=1..}] run scoreboard players remove @s $(skill)_time 1",
    ]),
    trigger: d.defineFunction("powerup/effect/trigger", [
      `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
      "",
      `$tellraw @s ${snbt([
        effectText(),
        " ",
        score("$(name)", "$(skill)_Amplifier"),
      ])}`,
      `$tellraw @s ${snbt([
        text("Duration: ", { color: "gold" }),
        score("$(name)", "$(skill)_time_max", { color: "aqua" }),
        text("s", { color: "aqua" }),
      ])}`,
      `tellraw @s ${snbt([
        text("Cooldown: ", { color: "gold" }),
        text("300s", { color: "aqua" }),
      ])}`,
      "",
      `$execute if score @s $(skill)_cooldown matches 0..0 run tellraw @s ${snbt([
        text("Status: ", { color: "gold" }),
        text("Ready", { color: "green" }),
      ])}`,
      `$execute if score @s $(skill)_cooldown matches 1.. if score @s $(skill)_time matches 0..0 run tellraw @s ${snbt([
        text("Status: ", { color: "gold" }),
        text("⏳", { color: "red" }),
        score("$(name)", "$(skill)_cooldown", { color: "red" }),
        text("s", { color: "red" }),
      ])}`,
      `$execute if score @s $(skill)_time matches 1.. run tellraw @s ${snbt([
        text("Status: ", { color: "gold" }),
        text("⏳", { color: "green" }),
        score("$(name)", "$(skill)_time", { color: "green" }),
        text("s", { color: "green" }),
      ])}`,
    ]),
    use: d.defineFunction("powerup/effect/use", [
      "# Still on cooldown",
      "$execute if score @s $(skill)_cooldown matches 1.. run return fail",
      "",
      "# Already using effect.",
      "$execute if score @s $(skill)_cooldown matches ..-1 run return fail",
      "",
      "# Calculate amplifier",
      "$execute store result storage dps:powerup effect.amplifier int 1 run scoreboard players get @s $(skill)_amplifier",
      "# Calculate time",
      "$execute store result storage dps:powerup effect.time int 1 run scoreboard players get @s $(skill)_time_max",
      "",
      "$data modify storage dps:powerup effect.effect set from storage dps:skill $(skill).effect",
      "",
      "function dps:powerup/effect/give_effect with storage dps:powerup effect",
      "",
      `$tellraw @s ${snbt([
        displayText(),
        text(" • ", { color: "dark_gray" }),
        effectText(),
        " ",
        score("@s", "$(skill)_Amplifier", { color: "gold" }),
        text(" Started!", { color: "green" }),
        text(" • ", { color: "dark_gray" }),
        nbt("effect.time", { storage: "dps:powerup" }, { color: "aqua" }),
        text("s", { color: "aqua" }),
      ])}`,
      "execute at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 1.2 0.2",
      "",
      "data remove storage dps:powerup effect",
      "",
      "# Convert to ticks.",
      "$scoreboard players operation @s $(skill)_time = @s $(skill)_time_max",
      "$scoreboard players set @s $(skill)_cooldown 300",
    ]),
    wearingTool: d.defineFunction("powerup/effect/wearing_tool", [
      "$execute if score @s $(skill)_cooldown matches 0..0 run item modify entity @s weapon.mainhand dps:make_consumable",
      "$execute unless score @s $(skill)_cooldown matches 0..0 run item modify entity @s weapon.mainhand dps:remove_consumable",
      "",
      `$execute if score @s $(skill)_cooldown matches 0..0 run title @s actionbar ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_percentage", { color: "yellow" }),
        text("%", { color: "yellow" }),
        text(")", { color: "white" }),
        text(" • ", { color: "dark_gray" }),
        text("Ready", { color: "green" }),
      ])}`,
      `$execute if score @s $(skill)_cooldown matches 1.. if score @s $(skill)_time matches 0..0 run title @s actionbar ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_percentage", { color: "yellow" }),
        text("%", { color: "yellow" }),
        text(")", { color: "white" }),
        text(" • ", { color: "dark_gray" }),
        text("⏳", { color: "red" }),
        score("@s", "$(skill)_cooldown", { color: "red" }),
        text("s", { color: "red" }),
      ])}`,
      `$execute if score @s $(skill)_time matches 1.. run title @s actionbar ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_percentage", { color: "yellow" }),
        text("%", { color: "yellow" }),
        text(")", { color: "white" }),
        text(" • ", { color: "dark_gray" }),
        text("⏳", { color: "green" }),
        score("@s", "$(skill)_time", { color: "green" }),
        text("s", { color: "green" }),
      ])}`,
    ]),
  };

  const tree = {
    init: d.defineFunction("powerup/tree_cutter/init", [
      '$function dps:utility/skill_init {skill: "$(skill)", display: "$(display)"}',
      "",
      "$scoreboard objectives add $(skill)_cooldown dummy",
      "$scoreboard objectives add $(skill)_cooldown_max dummy",
      "$scoreboard objectives add $(skill)_charges dummy",
      "$scoreboard objectives add $(skill)_charges_max dummy",
    ]),
    levelup: d.defineFunction("powerup/tree_cutter/levelup", [
      "$scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown",
      "",
      "$scoreboard players operation @s dps_tmp = @s $(skill)_charges_max",
      "$scoreboard players operation @s $(skill)_charges_max = @s $(skill)_level",
      "$scoreboard players operation @s $(skill)_charges_max /= 100 dps_globals",
      "$scoreboard players add @s $(skill)_charges_max 1",
      `$execute unless score @s dps_tmp = @s $(skill)_charges_max run tellraw @s ${snbt([
        "    ",
        text("Tree cutter", { color: "gold" }),
        " ",
        score("@s", "dps_tmp", { color: "aqua" }),
        text("⚡", { color: "yellow" }),
        text(" → ", { color: "white" }),
        score("@s", "$(skill)_charges_max", { color: "aqua" }),
        text("⚡", { color: "yellow" }),
      ])}`,
      "",
      "$scoreboard players operation @s dps_tmp = @s $(skill)_cooldown_max",
      "$scoreboard players operation @s $(skill)_cooldown_max = @s $(skill)_level",
      "$scoreboard players operation @s $(skill)_cooldown_max /= 2 dps_globals",
      "$scoreboard players remove @s $(skill)_cooldown_max 300",
      "$scoreboard players operation @s $(skill)_cooldown_max *= -1 dps_globals",
      `$execute unless score @s dps_tmp = @s $(skill)_cooldown_max run tellraw @s ${snbt([
        "    ",
        text("Tree cutter", { color: "gold" }),
        text(" ⏳", { color: "red" }),
        score("@s", "dps_tmp", { color: "aqua" }),
        text("s", { color: "aqua" }),
        text(" → ", { color: "white" }),
        text(" ⏳", { color: "red" }),
        score("@s", "$(skill)_cooldown_max", { color: "aqua" }),
      ])}`,
    ]),
    recursive: d.defineFunction("powerup/tree_cutter/recursive", [
      ...LOG_TYPES.map((type) =>
        summonItem("~ ~ ~", STRIPPED_LOG[type]).replace(
          "summon minecraft:item",
          `execute if block ~ ~ ~ #minecraft:${type}_logs run summon minecraft:item`,
        ),
      ),
      "",
      "setblock ~ ~ ~ air",
      "function dps:utility/remove_durability",
      "scoreboard players add @s dps_oak_log 1",
      "",
      ...LOG_OFFSETS.map(
        ([dx, dy, dz]) =>
          `$execute positioned ~${dx} ~${dy} ~${dz} if block ~ ~ ~ #dps:logs run function dps:powerup/tree_cutter/recursive {skill: "$(skill)"}`,
      ),
      "",
    ]),
    hit: d.defineFunction("powerup/tree_cutter/hit", [
      "$scoreboard players remove @s $(skill)_charges 1",
      "",
      `$tellraw @s ${snbt([
        displayText(),
        text(" • ", { color: "dark_gray" }),
        text("Tree cutter", { color: "gold" }),
        " ",
        text(" Used!", { color: "green" }),
      ])}`,
      "execute at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 1.2 0.2",
      "",
      '$function dps:powerup/tree_cutter/recursive {skill: "$(skill)"}',
    ]),
    use: d.defineFunction("powerup/tree_cutter/use", [
      "$execute if score @s $(skill)_charges matches ..0 run return fail",
      "",
      '$execute anchored eyes run function dps:utility/ray_cast/ {success: "function dps:powerup/tree_cutter/hit {skill: \'$(skill)\'}", block: "#dps:logs"}',
    ]),
    second: d.defineFunction("powerup/tree_cutter/second", [
      "$execute as @a[scores={$(skill)_cooldown=1..}] if score @s $(skill)_charges < @s $(skill)_charges_max run scoreboard players remove @s $(skill)_cooldown 1",
      "$execute as @a if score @s $(skill)_cooldown > @s $(skill)_cooldown_max run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max",
      "",
      "$execute as @a[scores={$(skill)_cooldown=0..0}] run scoreboard players add @s $(skill)_charges 1",
      `$execute as @a[scores={$(skill)_cooldown=0..0}] run tellraw @s ${snbt([
        displayText(),
        text(" • ", { color: "dark_gray" }),
        effectText(),
        text("Tree cutter", { color: "gold" }),
        text(" +1!", { color: "green" }),
        text("⚡", { color: "yellow" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_charges", { color: "green" }),
        text("/", { color: "green" }),
        score("@s", "$(skill)_charges_max", { color: "green" }),
        text("⚡", { color: "yellow" }),
        text(")", { color: "white" }),
      ])}`,
      "$execute as @a[scores={$(skill)_cooldown=0..0}] run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max",
    ]),
    trigger: d.defineFunction("powerup/tree_cutter/trigger", [
      `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
      "",
      `tellraw @s ${snbt([text("Tree cutter", { color: "gold" })])}`,
      `$tellraw @s ${snbt([
        text("Recharge time: ", { color: "gold" }),
        score("$(name)", "$(skill)_cooldown_max", { color: "aqua" }),
      ])}`,
      `$tellraw @s ${snbt([
        text("Charges: ", { color: "gold" }),
        score("$(name)", "$(skill)_charges", { color: "aqua" }),
      ])}`,
      `$tellraw @s ${snbt([
        text("Charges max: ", { color: "gold" }),
        score("$(name)", "$(skill)_charges_max", { color: "aqua" }),
      ])}`,
      "",
      `$execute if score @s $(skill)_charges < @s $(skill)_charges_max run tellraw @s ${snbt([
        text("Status: ", { color: "gold" }),
        score("$(name)", "$(skill)_charges", { color: "green" }),
        text("/", { color: "green" }),
        score("$(name)", "$(skill)_charges_max", { color: "green" }),
        text("⚡ ", { color: "yellow" }),
        text("(", { color: "gray" }),
        text("+1 ", { color: "green" }),
        text("⏳", { color: "red" }),
        score("$(name)", "$(skill)_cooldown", { color: "red" }),
        text("s", { color: "red" }),
        text(")", { color: "gray" }),
      ])}`,
      `$execute if score @s $(skill)_charges = @s $(skill)_charges_max run tellraw @s ${snbt([
        text("Status: ", { color: "gold" }),
        score("$(name)", "$(skill)_charges", { color: "green" }),
        text("/", { color: "green" }),
        score("$(name)", "$(skill)_charges_max", { color: "green" }),
        text("⚡ ", { color: "yellow" }),
      ])}`,
    ]),
    wearingTool: d.defineFunction("powerup/tree_cutter/wearing_tool", [
      "$execute unless score @s $(skill)_charges matches 0..0 run item modify entity @s weapon.mainhand dps:make_consumable",
      "$execute if score @s $(skill)_charges matches 0..0 run item modify entity @s weapon.mainhand dps:remove_consumable",
      "",
      `$execute if score @s $(skill)_charges < @s $(skill)_charges_max run title @s actionbar ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_percentage", { color: "yellow" }),
        text("%", { color: "yellow" }),
        text(")", { color: "white" }),
        text(" • ", { color: "dark_gray" }),
        score("@s", "$(skill)_charges", { color: "green" }),
        text("/", { color: "green" }),
        score("@s", "$(skill)_charges_max", { color: "green" }),
        text("⚡ ", { color: "yellow" }),
        text("(", { color: "gray" }),
        text("+1 ", { color: "green" }),
        text("⏳", { color: "red" }),
        score("@s", "$(skill)_cooldown", { color: "red" }),
        text("s", { color: "red" }),
        text(")", { color: "gray" }),
      ])}`,
      `$execute if score @s $(skill)_charges >= @s $(skill)_charges_max run title @s actionbar ${snbt([
        displayText(),
        text(" Lv", { color: "aqua" }),
        score("@s", "$(skill)_level", { color: "aqua" }),
        text(" (", { color: "white" }),
        score("@s", "$(skill)_percentage", { color: "yellow" }),
        text("%", { color: "yellow" }),
        text(")", { color: "white" }),
        text(" • ", { color: "dark_gray" }),
        score("@s", "$(skill)_charges", { color: "green" }),
        text("/", { color: "green" }),
        score("@s", "$(skill)_charges_max", { color: "green" }),
        text("⚡ ", { color: "yellow" }),
      ])}`,
    ]),
  };

  const triggerSkill = d.defineFunction("triggers/skill/", [
    `$tellraw @s ${snbt([
      text("=== [", { color: "yellow" }),
      nbt("$(skill).display", { storage: "dps:skill" }, {
        interpret: true,
        color: "yellow",
      }),
      text("] ===", { color: "yellow" }),
    ])}`,
    `$tellraw @s ${snbt([
      text("Level: ", { color: "gold" }),
      score("@s", "$(skill)_level", { color: "aqua" }),
      text(" (", { color: "white" }),
      score("@s", "$(skill)_percentage", { color: "yellow" }),
      text("%", { color: "yellow" }),
      text(")", { color: "white" }),
    ])}`,
    `$tellraw @s ${snbt([
      text("Xp: ", { color: "gold" }),
      score("@s", "$(skill)_xp", { color: "aqua" }),
      text("/", { color: "aqua" }),
      score("@s", "$(skill)_req", { color: "aqua" }),
    ])}`,
    '$function $(effect) {skill: "$(skill)", name: "$(name)"}',
    `$tellraw @s ${snbt([
      text("=== [", { color: "yellow" }),
      nbt("$(skill).display", { storage: "dps:skill" }, {
        interpret: true,
        color: "yellow",
      }),
      text("] ===", { color: "yellow" }),
    ])}`,
    "$scoreboard players set @s $(skill) 0",
  ]);

  const triggerDpsSkill = d.defineFunction("triggers/dps/skill", [
    `$tellraw @s ${snbt([
      displayText(),
      text(" Lv", { color: "aqua" }),
      score("$(name)", "$(skill)_level", { color: "aqua" }),
      text(" (", { color: "white" }),
      score("$(name)", "$(skill)_percentage", { color: "yellow" }),
      text("%", { color: "yellow" }),
      text(")", { color: "white" }),
    ])}`,
  ]);

  const triggerDps = d.defineFunction("triggers/dps/", [
    `tellraw @s ${snbt([text("=== [Data Pack Skills] ===", { color: "yellow" })])}`,
    ...(["combat", "digging", "mining", "woodcutting", "enchanting", "farming"] as const).map(
      (skill) => `$function ${triggerDpsSkill.name} {skill: "${sb(skill)}", name:"$(name)"}`,
    ),
    `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
    `$tellraw @s ${snbt([
      text("📊 Total", { color: "gold" }),
      text(" Lv", { color: "aqua" }),
      score("$(name)", "dps_total_level", { color: "aqua" }),
    ])}`,
    `tellraw @s ${snbt([text("=== [Data Pack Skills] ===", { color: "yellow" })])}`,
    "scoreboard players set @s dps 0",
  ]);

  const triggerFor = (skill: SkillConfig): FunctionRef => {
    if (skill.powerup === "effect") return effect.trigger;
    if (skill.powerup === "tree_cutter") return tree.trigger;
    return utility.nop;
  };

  for (const skill of SKILLS) {
    const scoreboard = sb(skill.name);

    const loadLines: Lines = [];
    if (skill.powerup === "effect") {
      loadLines.push(
        `function dps:powerup/effect/init {skill: "${scoreboard}", display: "${skill.display}", effect: "${skill.effect}", Effect: "${skill.effectDisplay}"}`,
      );
    } else if (skill.powerup === "tree_cutter") {
      loadLines.push(
        `function dps:powerup/tree_cutter/init {skill: "${scoreboard}", display: "${skill.display}"}`,
      );
    } else {
      loadLines.push(
        `function dps:utility/skill_init {skill: "${scoreboard}", display: "${skill.display}"}`,
      );
    }
    loadLines.push(
      "",
      `function dps:skill/${skill.name}/actions {function: "dps:utility/define_action"}`,
    );
    d.defineFunction(`skill/${skill.name}/load`, loadLines);

    const tickLines: Lines = [
      `function dps:skill/${skill.name}/actions {function: "dps:utility/give_xp/"}`,
      "",
    ];
    const success =
      skill.powerup === "effect"
        ? "dps:powerup/effect/levelup"
        : skill.powerup === "tree_cutter"
          ? "dps:powerup/tree_cutter/levelup"
          : "dps:utility/nop";
    tickLines.push(
      `execute as @a run function ${levelup.name} {"skill": "${scoreboard}", success: "${success}"}`,
      "",
    );
    if (skill.powerup === "effect") {
      tickLines.push(
        `execute as @a if predicate dps:wearing_${skill.name}_tool run function dps:powerup/effect/wearing_tool {"skill": "${scoreboard}"}`,
      );
    } else if (skill.powerup === "tree_cutter") {
      tickLines.push(
        `execute as @a if predicate dps:wearing_${skill.name}_tool run function dps:powerup/tree_cutter/wearing_tool {"skill": "${scoreboard}"}`,
      );
    } else {
      tickLines.push("");
    }
    d.defineFunction(`skill/${skill.name}/tick`, tickLines);

    d.defineFunction(
      `skill/${skill.name}/actions`,
      actionLines(skill.name),
    );

    if (skill.powerup === "effect") {
      const useArgs: Record<string, string> = { skill: scoreboard };
      if (skill.useEffectArg) useArgs.effect = skill.useEffectArg;
      d.defineFunction(`skill/${skill.name}/use`, [
        `advancement revoke @s only dps:${skill.name}_use`,
        `function dps:powerup/effect/use ${JSON.stringify(useArgs)}`,
      ]);
      d.defineFunction(`skill/${skill.name}/second`, [
        `function dps:powerup/effect/second {"skill":"${scoreboard}"}`,
      ]);
    } else if (skill.powerup === "tree_cutter") {
      d.defineFunction(`skill/${skill.name}/use`, [
        `advancement revoke @s only dps:${skill.name}_use`,
        `function dps:powerup/tree_cutter/use {skill: "${scoreboard}"}`,
      ]);
      d.defineFunction(`skill/${skill.name}/second`, [
        `function dps:powerup/tree_cutter/second {skill: "${scoreboard}"}`,
      ]);
    }
  }

  const load = d.defineFunction("load", [
    "scoreboard objectives add dps trigger",
    "scoreboard objectives add dps_tmp dummy",
    "scoreboard objectives add dps_globals dummy",
    "scoreboard objectives add dps_xp_config dummy",
    "# 0 = normal, 1 = minor, 2 = mayor",
    "scoreboard objectives add dps_lvl_up_type dummy",
    "",
    "scoreboard players set -1 dps_globals -1",
    "scoreboard players set 1 dps_globals 1",
    "scoreboard players set 2 dps_globals 2",
    "scoreboard players set 5 dps_globals 5",
    "scoreboard players set 7 dps_globals 7",
    "scoreboard players set 9 dps_globals 9",
    "scoreboard players set 10 dps_globals 10",
    "scoreboard players set 38 dps_globals 38",
    "scoreboard players set 100 dps_globals 100",
    "scoreboard players set 158 dps_globals 158",
    "scoreboard players set 300 dps_globals 300",
    "",
    "scoreboard objectives add dps_total_level dummy",
    "",
    ...SKILLS.map((skill) => `function dps:skill/${skill.name}/load`),
    "",
    "function dps:second",
  ]);

  const second = d.defineFunction("second", [
    "schedule function dps:second 1s replace",
    "",
    ...SKILLS.filter(
      (skill) =>
        skill.powerup === "effect" || skill.powerup === "tree_cutter",
    ).map((skill) => `function dps:skill/${skill.name}/second`),
  ]);

  const tick = d.defineFunction("tick", [
    ...SKILLS.map((skill) => `function dps:skill/${skill.name}/tick`),
    "",
    `execute as @a[scores={dps=1..}] run function ${triggerDps.name} {"name":"@s"}`,
    "scoreboard players enable @a dps",
    "",
    ...SKILLS.flatMap((skill) => {
      const scoreboard = sb(skill.name);
      const triggerFn = triggerFor(skill);
      return [
        `execute as @a[scores={${scoreboard}=1..}] run function ${triggerSkill.name} {"name":"@s","skill":"${scoreboard}","effect":"${triggerFn.name}"}`,
        `scoreboard players enable @a ${scoreboard}`,
      ];
    }),
  ]);

  d.onLoad(load);
  d.onTick(tick);

  d.itemModifier("make_consumable", {
    type: "minecraft:set_components",
    components: { "minecraft:consumable": { consume_seconds: 100000000 } },
  });
  d.itemModifier("remove_consumable", {
    type: "minecraft:set_components",
    components: { "!minecraft:consumable": {} },
  });

  d.blockTag("logs", [
    "#minecraft:oak_logs",
    "#minecraft:spruce_logs",
    "#minecraft:birch_logs",
    "#minecraft:jungle_logs",
    "#minecraft:acacia_logs",
    "#minecraft:dark_oak_logs",
    "#minecraft:mangrove_logs",
    "#minecraft:cherry_logs",
  ]);

  d.itemTag("combat_tool", ["#minecraft:swords"]);
  d.itemTag("digging_tool", ["#minecraft:shovels"]);
  d.itemTag("mining_tool", ["#minecraft:pickaxes"]);
  d.itemTag("woodcutting_tool", ["#minecraft:axes"]);

  for (const skill of ["combat", "digging", "mining", "woodcutting"] as const) {
    d.predicate(`wearing_${skill}_tool`, {
      type: "minecraft:entity_properties",
      entity: "this",
      predicate: {
        "minecraft:equipment": { mainhand: { items: `#dps:${skill}_tool` } },
      },
    });
  }

  for (const skill of ["combat", "digging", "mining", "woodcutting"] as const) {
    d.advancement(`${skill}_use`, {
      criteria: {
        using_item: {
          trigger: "using_item",
          conditions: { item: { items: `#dps:${skill}_tool` } },
        },
      },
      rewards: { function: `dps:skill/${skill}/use` },
    });
  }

  const uninstallObjectives = [
    "dps",
    "dps_tmp",
    "dps_globals",
    "dps_xp_config",
    "dps_lvl_up_type",
    "dps_total_level",
    ...SKILLS.flatMap((skill) => {
      const base = `dps_${skill.name}`;
      const suffixes = ["", "_level", "_xp", "_req", "_percentage"];
      if (skill.powerup === "effect") {
        suffixes.push(
          "_cooldown",
          "_time",
          "_time_max",
          "_amplifier",
          "_Amplifier",
        );
      }
      if (skill.powerup === "tree_cutter") {
        suffixes.push(
          "_cooldown",
          "_cooldown_max",
          "_charges",
          "_charges_max",
        );
      }
      return suffixes.map((suffix) => `${base}${suffix}`);
    }),
    ...Object.values(ACTIONS).flatMap((actions) =>
      actions.map((action) => action.objective),
    ),
  ];

  defineUninstall(d, {
    objectives: uninstallObjectives,
    storage: [
      "dps:powerup effect",
      ...SKILLS.map((skill) => `dps:skill ${skill.name}`),
    ],
    kill: ["@e[tag=dps_durability]"],
    schedules: ["dps:second"],
  });

  return d;
}
