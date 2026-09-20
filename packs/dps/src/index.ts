import {
  Datapack,
  defineInstall,
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

export type SkillName = keyof typeof ACTIONS;
export type Powerup =
  | "effect"
  | "tree_cutter"
  | "none"
  | "harvest"
  | "repair"
  | "effect_extend"
  | "arrow_recovery"
  | "twins"
  | "fall_guard"
  | "angler";

export interface SkillConfig {
  readonly name: SkillName;
  readonly display: string;
  readonly powerup: Powerup;
  readonly effect?: EffectId;
  readonly effectDisplay?: string;
  readonly useEffectArg?: string;
}

export const SKILLS: readonly SkillConfig[] = [
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
  { name: "farming", display: "☘ Farming", powerup: "harvest" },
  { name: "enchanting", display: "✨ Enchanting", powerup: "repair" },
  { name: "fishing", display: "🐟 Fishing", powerup: "angler" },
  { name: "archery", display: "🏹 Archery", powerup: "arrow_recovery" },
  { name: "taming", display: "🐾 Taming", powerup: "twins" },
  { name: "alchemy", display: "⚗ Alchemy", powerup: "effect_extend" },
  { name: "acrobatics", display: "🤸 Acrobatics", powerup: "fall_guard" },
  { name: "trading", display: "💱 Trading", powerup: "none" },
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

// Crops Harvest Moon can harvest and replant. The age is the fully-grown
// block state value; replanting uses age 0.
const HARVEST_CROPS = [
  { block: "minecraft:wheat", age: 7 },
  { block: "minecraft:carrots", age: 7 },
  { block: "minecraft:potatoes", age: 7 },
  { block: "minecraft:beetroots", age: 3 },
] as const;

// Chebyshev rings around the player, used to grow the harvest area with level.
const HARVEST_RINGS: Record<number, Array<[number, number, number]>> = {};
for (const radius of [1, 2, 3]) {
  const ring: Array<[number, number, number]> = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
      for (const dy of [-1, 0, 1]) {
        ring.push([dx, dy, dz]);
      }
    }
  }
  HARVEST_RINGS[radius] = ring;
}

// Breedable animals eligible for Twins. Each type gets its own `bred_animals`
// advancement so the newborn can be identified and cloned. Egg-layers (turtle,
// sniffer) and frogs are omitted: the trigger's `child` entity never exists for
// them, so the advancement could never fire.
const BREEDABLE_ANIMALS = [
  "minecraft:armadillo",
  "minecraft:axolotl",
  "minecraft:bee",
  "minecraft:camel",
  "minecraft:cat",
  "minecraft:chicken",
  "minecraft:cow",
  "minecraft:donkey",
  "minecraft:fox",
  "minecraft:goat",
  "minecraft:hoglin",
  "minecraft:horse",
  "minecraft:llama",
  "minecraft:mooshroom",
  "minecraft:ocelot",
  "minecraft:panda",
  "minecraft:pig",
  "minecraft:rabbit",
  "minecraft:sheep",
  "minecraft:strider",
  "minecraft:wolf",
] as const;

// Drinkable potions whose positive effect Extended Potions lengthens. The
// duration is the vanilla base in ticks and the amplifier matches the potion
// strength; `strong_*` potions are level II. Durations are converted to
// seconds before `/effect give`, which takes seconds.
const POSITIVE_POTIONS = [
  { potion: "minecraft:swiftness", effect: "minecraft:speed", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_swiftness", effect: "minecraft:speed", duration: 9600, amplifier: 0 },
  { potion: "minecraft:strong_swiftness", effect: "minecraft:speed", duration: 1800, amplifier: 1 },
  { potion: "minecraft:leaping", effect: "minecraft:jump_boost", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_leaping", effect: "minecraft:jump_boost", duration: 9600, amplifier: 0 },
  { potion: "minecraft:strong_leaping", effect: "minecraft:jump_boost", duration: 1800, amplifier: 1 },
  { potion: "minecraft:strength", effect: "minecraft:strength", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_strength", effect: "minecraft:strength", duration: 9600, amplifier: 0 },
  { potion: "minecraft:strong_strength", effect: "minecraft:strength", duration: 1800, amplifier: 1 },
  { potion: "minecraft:regeneration", effect: "minecraft:regeneration", duration: 900, amplifier: 0 },
  { potion: "minecraft:long_regeneration", effect: "minecraft:regeneration", duration: 1800, amplifier: 0 },
  { potion: "minecraft:strong_regeneration", effect: "minecraft:regeneration", duration: 450, amplifier: 1 },
  { potion: "minecraft:fire_resistance", effect: "minecraft:fire_resistance", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_fire_resistance", effect: "minecraft:fire_resistance", duration: 9600, amplifier: 0 },
  { potion: "minecraft:water_breathing", effect: "minecraft:water_breathing", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_water_breathing", effect: "minecraft:water_breathing", duration: 9600, amplifier: 0 },
  { potion: "minecraft:invisibility", effect: "minecraft:invisibility", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_invisibility", effect: "minecraft:invisibility", duration: 9600, amplifier: 0 },
  { potion: "minecraft:night_vision", effect: "minecraft:night_vision", duration: 3600, amplifier: 0 },
  { potion: "minecraft:long_night_vision", effect: "minecraft:night_vision", duration: 9600, amplifier: 0 },
  { potion: "minecraft:slow_falling", effect: "minecraft:slow_falling", duration: 1800, amplifier: 0 },
  { potion: "minecraft:long_slow_falling", effect: "minecraft:slow_falling", duration: 4800, amplifier: 0 },
  { potion: "minecraft:turtle_master", effect: "minecraft:resistance", duration: 400, amplifier: 2 },
  { potion: "minecraft:long_turtle_master", effect: "minecraft:resistance", duration: 800, amplifier: 2 },
  { potion: "minecraft:strong_turtle_master", effect: "minecraft:resistance", duration: 400, amplifier: 3 },
] as const;

const ANVIL_BLOCKS = [
  "minecraft:anvil",
  "minecraft:chipped_anvil",
  "minecraft:damaged_anvil",
] as const;

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
        divisor: action.divisor ?? 1,
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
    "Data Pack Skills",
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
      "execute if predicate dps:holding_unbreakable run return fail",
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
      "$scoreboard players operation @s $(name) /= $(divisor) dps_globals",
      "$scoreboard players operation @s $(name) *= $(name) dps_xp_config",
      "$scoreboard players operation @s $(skill)_xp += @s $(name)",
      "$scoreboard players set @s $(name) 0",
      "",
      "# Seed the requirement so the first xp grant has something to divide by.",
      "$execute unless score @s $(skill)_req matches 1.. run scoreboard players set @s $(skill)_req 7",
      "$function dps:utility/calc_percentage {skill: $(skill)}",
    ]),
    giveXp: d.defineFunction("utility/give_xp/", [
      '$execute as @a[scores={$(name)=1..}] run function dps:utility/give_xp/success {skill: "$(skill)", name: "$(name)", divisor: $(divisor)}',
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
    "# Seed xp and the level-0 requirement (2 * 0 + 7) for players who have not",
    "# gained xp yet. Without it both scores are absent, so the comparison below",
    "# is skipped and every skill levels up to 1 the moment a player joins.",
    "$scoreboard players add @s $(skill)_xp 0",
    "$execute unless score @s $(skill)_req matches 1.. run scoreboard players set @s $(skill)_req 7",
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

  // --- Harvest Moon (farming) ---------------------------------------------
  const harvestAt = d.defineFunction(
    "powerup/harvest/at",
    HARVEST_CROPS.flatMap((crop) => [
      `execute if block ~ ~ ~ ${crop.block}[age=${crop.age}] run loot spawn ~ ~ ~ mine ~ ~ ~`,
      `execute if block ~ ~ ~ ${crop.block}[age=${crop.age}] run setblock ~ ~ ~ ${crop.block}[age=0]`,
    ]),
  );
  const harvestRing = (radius: number): FunctionRef =>
    d.defineFunction(
      `powerup/harvest/ring_${radius}`,
      (HARVEST_RINGS[radius] ?? []).map(
        ([dx, dy, dz]) =>
          `execute positioned ~${dx} ~${dy} ~${dz} run function ${harvestAt.name}`,
      ),
    );
  const harvestRing1 = harvestRing(1);
  const harvestRing2 = harvestRing(2);
  const harvestRing3 = harvestRing(3);
  const harvest = {
    use: d.defineFunction("skill/farming/harvest", [
      "advancement revoke @s only dps:farming_harvest",
      `function ${harvestRing1.name}`,
      `execute if score @s dps_farming_level matches 200.. run function ${harvestRing2.name}`,
      `execute if score @s dps_farming_level matches 400.. run function ${harvestRing3.name}`,
    ]),
    levelup: d.defineFunction("powerup/harvest/levelup", [
      "# radius = 1, +1 at level 200 and again at level 400",
      "scoreboard players set __power__ dps_tmp 1",
      "execute if score @s dps_farming_level matches 200.. run scoreboard players add __power__ dps_tmp 1",
      "execute if score @s dps_farming_level matches 400.. run scoreboard players add __power__ dps_tmp 1",
      `tellraw @s ${snbt([
        "    ",
        text("🌾 Harvest Moon", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Harvest radius ", { color: "gold" }),
        score("__power__", "dps_tmp", { color: "aqua" }),
      ])}`,
    ]),
  };

  // --- Arcane Repair (enchanting) -----------------------------------------
  const repair = {
    init: d.defineFunction("powerup/repair/init", [
      '$function dps:utility/skill_init {skill: "$(skill)", display: "$(display)"}',
      "$scoreboard objectives add $(skill)_cooldown dummy",
    ]),
    use: d.defineFunction("skill/enchanting/repair", [
      "advancement revoke @s only dps:enchanting_repair",
      "# Cooldown",
      "execute if score @s dps_enchanting_cooldown matches 1.. run return fail",
      "# Needs a damageable, non-unbreakable item.",
      "execute unless items entity @s weapon.mainhand *[minecraft:damage] run return fail",
      "execute unless items entity @s weapon.mainhand *[minecraft:max_damage] run return fail",
      "execute if items entity @s weapon.mainhand *[minecraft:unbreakable] run return fail",
      "execute if predicate dps:holding_unbreakable run return fail",
      "# Cost: 3 xp levels.",
      "execute store result score __repair_xp__ dps_tmp run data get entity @s XpLevel",
      "execute if score __repair_xp__ dps_tmp matches ..2 run return fail",
      "",
      "# Read the item on a throwaway armor stand.",
      "summon minecraft:armor_stand ~ ~ ~ {Tags:[dps_repair]}",
      "item replace entity @e[tag=dps_repair,limit=1] weapon.mainhand from entity @s weapon.mainhand",
      'execute store result score __repair_damage__ dps_tmp run data get entity @e[tag=dps_repair,limit=1] equipment.mainhand.components."minecraft:damage"',
      'execute store result score __repair_max__ dps_tmp run data get entity @e[tag=dps_repair,limit=1] equipment.mainhand.components."minecraft:max_damage"',
      "",
      "# pct = min(25, 5 + level / 50)",
      "scoreboard players operation __repair_pct__ dps_tmp = @s dps_enchanting_level",
      "scoreboard players operation __repair_pct__ dps_tmp /= 50 dps_globals",
      "scoreboard players add __repair_pct__ dps_tmp 5",
      "execute if score __repair_pct__ dps_tmp matches 25.. run scoreboard players set __repair_pct__ dps_tmp 25",
      "# repair = max_damage * pct / 100",
      "scoreboard players operation __repair_pct__ dps_tmp *= __repair_max__ dps_tmp",
      "scoreboard players operation __repair_pct__ dps_tmp /= 100 dps_globals",
      "# new = max(0, damage - repair)",
      "scoreboard players operation __repair_new__ dps_tmp = __repair_damage__ dps_tmp",
      "scoreboard players operation __repair_new__ dps_tmp -= __repair_pct__ dps_tmp",
      "execute if score __repair_new__ dps_tmp matches ..0 run scoreboard players set __repair_new__ dps_tmp 0",
      'execute store result entity @e[tag=dps_repair,limit=1] equipment.mainhand.components."minecraft:damage" int 1 run scoreboard players get __repair_new__ dps_tmp',
      "item replace entity @s weapon.mainhand from entity @e[tag=dps_repair,limit=1] weapon.mainhand",
      "kill @e[tag=dps_repair,limit=1]",
      "",
      "xp add @s -3 levels",
      "scoreboard players set @s dps_enchanting_cooldown 10",
      "execute at @s run playsound minecraft:block.note_block.pling player @s ~ ~ ~ 0.5 1.4",
      `tellraw @s ${snbt([
        text("✨ Arcane Repair", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Repaired ", { color: "green" }),
        score("__repair_pct__", "dps_tmp", { color: "aqua" }),
        text(" durability", { color: "aqua" }),
      ])}`,
    ]),
    second: d.defineFunction("powerup/repair/second", [
      "$execute as @a[scores={$(skill)_cooldown=1..}] run scoreboard players remove @s $(skill)_cooldown 1",
    ]),
    levelup: d.defineFunction("powerup/repair/levelup", [
      "# pct = min(25, 5 + level / 50)",
      "scoreboard players operation __power__ dps_tmp = @s dps_enchanting_level",
      "scoreboard players operation __power__ dps_tmp /= 50 dps_globals",
      "scoreboard players add __power__ dps_tmp 5",
      "execute if score __power__ dps_tmp matches 25.. run scoreboard players set __power__ dps_tmp 25",
      `tellraw @s ${snbt([
        "    ",
        text("✨ Arcane Repair", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Restores ", { color: "gold" }),
        score("__power__", "dps_tmp", { color: "aqua" }),
        text("%", { color: "aqua" }),
        text(" of max durability", { color: "gold" }),
      ])}`,
    ]),
  };

  // --- Angler's Luck (fishing) --------------------------------------------
  const angler = {
    init: d.defineFunction("powerup/angler/init", [
      '$function dps:utility/skill_init {skill: "$(skill)", display: "$(display)"}',
      "$scoreboard objectives add dps_fishing_charges dummy",
    ]),
    catch: d.defineFunction("powerup/angler/catch", [
      "scoreboard players operation @s dps_fishing_charges += @s dps_fish_caught",
      "# threshold = max(1, 10 - level / 50)",
      "scoreboard players operation __angler_lvl__ dps_tmp = @s dps_fishing_level",
      "scoreboard players operation __angler_lvl__ dps_tmp /= 50 dps_globals",
      "scoreboard players set __angler_threshold__ dps_tmp 10",
      "scoreboard players operation __angler_threshold__ dps_tmp -= __angler_lvl__ dps_tmp",
      "execute if score __angler_threshold__ dps_tmp matches ..0 run scoreboard players set __angler_threshold__ dps_tmp 1",
      "execute if score @s dps_fishing_charges >= __angler_threshold__ dps_tmp run loot give @s loot minecraft:gameplay/fishing/treasure",
      `execute if score @s dps_fishing_charges >= __angler_threshold__ dps_tmp run tellraw @s ${snbt([
        text("🐟 Angler's Luck", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Treasure!", { color: "green" }),
      ])}`,
      "execute if score @s dps_fishing_charges >= __angler_threshold__ dps_tmp run scoreboard players set @s dps_fishing_charges 0",
    ]),
    trigger: d.defineFunction("powerup/angler/trigger", [
      `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
      `tellraw @s ${snbt([text("Angler's Luck", { color: "gold" })])}`,
      "scoreboard players operation __angler_lvl__ dps_tmp = @s dps_fishing_level",
      "scoreboard players operation __angler_lvl__ dps_tmp /= 50 dps_globals",
      "scoreboard players set __angler_threshold__ dps_tmp 10",
      "scoreboard players operation __angler_threshold__ dps_tmp -= __angler_lvl__ dps_tmp",
      "execute if score __angler_threshold__ dps_tmp matches ..0 run scoreboard players set __angler_threshold__ dps_tmp 1",
      `tellraw @s ${snbt([
        text("Charges: ", { color: "gold" }),
        score("@s", "dps_fishing_charges", { color: "aqua" }),
        text("/", { color: "aqua" }),
        score("__angler_threshold__", "dps_tmp", { color: "aqua" }),
      ])}`,
    ]),
    levelup: d.defineFunction("powerup/angler/levelup", [
      "# threshold = max(1, 10 - level / 50)",
      "scoreboard players operation __angler_lvl__ dps_tmp = @s dps_fishing_level",
      "scoreboard players operation __angler_lvl__ dps_tmp /= 50 dps_globals",
      "scoreboard players set __power__ dps_tmp 10",
      "scoreboard players operation __power__ dps_tmp -= __angler_lvl__ dps_tmp",
      "execute if score __power__ dps_tmp matches ..0 run scoreboard players set __power__ dps_tmp 1",
      `tellraw @s ${snbt([
        "    ",
        text("🐟 Angler's Luck", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Treasure every ", { color: "gold" }),
        score("__power__", "dps_tmp", { color: "aqua" }),
        text(" catches", { color: "gold" }),
      ])}`,
    ]),
  };

  // --- Extended Potions (alchemy) -----------------------------------------
  const alchemyApply = d.defineFunction("powerup/alchemy/apply", [
    "$effect give @s $(effect) $(duration) $(amplifier)",
  ]);
  const alchemyPotions = POSITIVE_POTIONS.map((potion) => {
    const slug = potion.potion.replace("minecraft:", "");
    return {
      slug,
      potion: potion.potion,
      ref: d.defineFunction(`skill/alchemy/potion/${slug}`, [
        `advancement revoke @s only dps:alchemy_${slug}`,
        `scoreboard players set __alchemy__ dps_tmp ${potion.duration}`,
        "scoreboard players operation __alchemy__ dps_tmp *= @s dps_alchemy_level",
        "scoreboard players operation __alchemy__ dps_tmp /= 400 dps_globals",
        `scoreboard players add __alchemy__ dps_tmp ${potion.duration}`,
        "# `/effect give` wants seconds; the table above is in ticks.",
        "scoreboard players operation __alchemy__ dps_tmp /= 20 dps_globals",
        "execute store result storage dps:powerup alchemy.duration int 1 run scoreboard players get __alchemy__ dps_tmp",
        `data modify storage dps:powerup alchemy.effect set value "${potion.effect}"`,
        `data modify storage dps:powerup alchemy.amplifier set value ${potion.amplifier}`,
        `function ${alchemyApply.name} with storage dps:powerup alchemy`,
      ]),
    };
  });
  const alchemyLevelup = d.defineFunction("powerup/effect_extend/levelup", [
    "# bonus% = level / 4 (level / 400 of the base duration)",
    "scoreboard players operation __power__ dps_tmp = @s dps_alchemy_level",
    "scoreboard players operation __power__ dps_tmp /= 4 dps_globals",
    `tellraw @s ${snbt([
      "    ",
      text("⚗ Extended Potions", { color: "gold" }),
      text(" • ", { color: "dark_gray" }),
      text("+", { color: "gold" }),
      score("__power__", "dps_tmp", { color: "aqua" }),
      text("%", { color: "aqua" }),
      text(" potion duration", { color: "gold" }),
    ])}`,
  ]);

  // --- Arrow Recovery (archery) -------------------------------------------
  const arrowRecovery = {
    recover: d.defineFunction("skill/archery/recover", [
      "advancement revoke @s only dps:archery_recover",
      "# chance = min(75, level / 7)",
      "scoreboard players operation __archery__ dps_tmp = @s dps_archery_level",
      "scoreboard players operation __archery__ dps_tmp /= 7 dps_globals",
      "execute if score __archery__ dps_tmp matches 75.. run scoreboard players set __archery__ dps_tmp 75",
      "execute store result score __archery_roll__ dps_tmp run random value 1..100",
      "execute if score __archery_roll__ dps_tmp <= __archery__ dps_tmp run give @s minecraft:arrow 1",
      "execute if score __archery_roll__ dps_tmp <= __archery__ dps_tmp run playsound minecraft:entity.item.pickup player @s ~ ~ ~ 0.3 1.6",
    ]),
    levelup: d.defineFunction("powerup/arrow_recovery/levelup", [
      "# chance = min(75, level / 7)",
      "scoreboard players operation __power__ dps_tmp = @s dps_archery_level",
      "scoreboard players operation __power__ dps_tmp /= 7 dps_globals",
      "execute if score __power__ dps_tmp matches 75.. run scoreboard players set __power__ dps_tmp 75",
      `tellraw @s ${snbt([
        "    ",
        text("🏹 Arrow Recovery", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        score("__power__", "dps_tmp", { color: "aqua" }),
        text("%", { color: "aqua" }),
        text(" arrow return chance", { color: "gold" }),
      ])}`,
    ]),
  };

  // --- Twins (taming) ------------------------------------------------------
  const twins = BREEDABLE_ANIMALS.map((animal) => {
    const slug = animal.replace("minecraft:", "");
    return {
      animal,
      slug,
      ref: d.defineFunction(`skill/taming/twin/${slug}`, [
        `advancement revoke @s only dps:taming_twin_${slug}`,
        "# chance = min(50, level / 10)",
        "scoreboard players operation __taming__ dps_tmp = @s dps_taming_level",
        "scoreboard players operation __taming__ dps_tmp /= 10 dps_globals",
        "execute if score __taming__ dps_tmp matches 50.. run scoreboard players set __taming__ dps_tmp 50",
        "execute store result score __taming_roll__ dps_tmp run random value 1..100",
        "execute if score __taming_roll__ dps_tmp > __taming__ dps_tmp run return fail",
        `execute at @e[type=${animal},distance=..8,tag=!dps_twin,predicate=dps:baby,sort=nearest,limit=1] run summon ${animal} ~ ~ ~ {Age:-24000,Tags:[dps_twin]}`,
      ]),
    };
  });
  const twinsLevelup = d.defineFunction("powerup/twins/levelup", [
    "# chance = min(50, level / 10)",
    "scoreboard players operation __power__ dps_tmp = @s dps_taming_level",
    "scoreboard players operation __power__ dps_tmp /= 10 dps_globals",
    "execute if score __power__ dps_tmp matches 50.. run scoreboard players set __power__ dps_tmp 50",
    `tellraw @s ${snbt([
      "    ",
      text("🐾 Twins", { color: "gold" }),
      text(" • ", { color: "dark_gray" }),
      score("__power__", "dps_tmp", { color: "aqua" }),
      text("%", { color: "aqua" }),
      text(" twin chance", { color: "gold" }),
    ])}`,
  ]);

  // --- Charged Fall Guard (acrobatics) ------------------------------------
  const fallGuardSet = d.defineFunction("powerup/fall_guard/set", [
    "$attribute @s minecraft:fall_damage_multiplier base set $(multiplier)",
  ]);
  const fallGuard = {
    init: d.defineFunction("powerup/fall_guard/init", [
      '$function dps:utility/skill_init {skill: "$(skill)", display: "$(display)"}',
      "$scoreboard objectives add dps_acrobatics_charges dummy",
      "$scoreboard objectives add dps_acrobatics_charges_max dummy",
      "$scoreboard objectives add dps_acrobatics_cooldown dummy",
      "$scoreboard objectives add dps_acrobatics_cooldown_max dummy",
      "$scoreboard objectives add dps_acrobatics_guard dummy",
    ]),
    levelup: d.defineFunction("powerup/fall_guard/levelup", [
      "# Seed the scores so later selectors match from the first level up.",
      "$scoreboard players operation @s dps_acrobatics_charges = @s dps_acrobatics_charges",
      "$scoreboard players operation @s dps_acrobatics_cooldown = @s dps_acrobatics_cooldown",
      "",
      "$scoreboard players operation @s dps_tmp = @s dps_acrobatics_charges_max",
      "$scoreboard players operation @s dps_acrobatics_charges_max = @s dps_acrobatics_level",
      "$scoreboard players operation @s dps_acrobatics_charges_max /= 100 dps_globals",
      "$scoreboard players add @s dps_acrobatics_charges_max 1",
      `$execute unless score @s dps_tmp = @s dps_acrobatics_charges_max run tellraw @s ${snbt([
        "    ",
        text("Charged Fall Guard", { color: "gold" }),
        " ",
        score("@s", "dps_tmp", { color: "aqua" }),
        text("⚡", { color: "yellow" }),
        text(" → ", { color: "white" }),
        score("@s", "dps_acrobatics_charges_max", { color: "aqua" }),
        text("⚡", { color: "yellow" }),
      ])}`,
      "",
      "$scoreboard players operation @s dps_tmp = @s dps_acrobatics_cooldown_max",
      "$scoreboard players operation @s dps_acrobatics_cooldown_max = @s dps_acrobatics_level",
      "$scoreboard players operation @s dps_acrobatics_cooldown_max /= 2 dps_globals",
      "$scoreboard players remove @s dps_acrobatics_cooldown_max 300",
      "$scoreboard players operation @s dps_acrobatics_cooldown_max *= -1 dps_globals",
      `$execute unless score @s dps_tmp = @s dps_acrobatics_cooldown_max run tellraw @s ${snbt([
        "    ",
        text("Charged Fall Guard", { color: "gold" }),
        text(" ⏳", { color: "red" }),
        score("@s", "dps_tmp", { color: "aqua" }),
        text("s", { color: "aqua" }),
        text(" → ", { color: "white" }),
        text(" ⏳", { color: "red" }),
        score("@s", "dps_acrobatics_cooldown_max", { color: "aqua" }),
      ])}`,
      "",
      "# reduction hearts = 2 + level / 100",
      "scoreboard players operation __power__ dps_tmp = @s dps_acrobatics_level",
      "scoreboard players operation __power__ dps_tmp /= 100 dps_globals",
      "scoreboard players add __power__ dps_tmp 2",
      `$tellraw @s ${snbt([
        "    ",
        text("Charged Fall Guard", { color: "gold" }),
        text(" • ", { color: "dark_gray" }),
        text("Absorbs ", { color: "gold" }),
        score("__power__", "dps_tmp", { color: "aqua" }),
        text(" hearts per fall", { color: "gold" }),
      ])}`,
    ]),
    apply: d.defineFunction("powerup/fall_guard/apply", [
      "# Not leveled yet: nothing to guard with.",
      "execute unless score @s dps_acrobatics_charges_max matches 1.. run return fail",
      "# Estimated fall damage in tenths: FallDistance * 10 - 30.",
      "execute store result score __fall__ dps_tmp run data get entity @s FallDistance 10",
      "scoreboard players remove __fall__ dps_tmp 30",
      "# Not falling: restore normal fall damage.",
      "execute if score __fall__ dps_tmp matches ..0 if score @s dps_acrobatics_guard matches 1.. run attribute @s minecraft:fall_damage_multiplier base set 1",
      "execute if score __fall__ dps_tmp matches ..0 run scoreboard players set @s dps_acrobatics_guard 0",
      "execute if score __fall__ dps_tmp matches ..0 run return fail",
      "# Already guarding this fall.",
      "execute if score @s dps_acrobatics_guard matches 1.. run return fail",
      "# Needs a charge.",
      "execute if score @s dps_acrobatics_charges matches ..0 run return fail",
      "scoreboard players remove @s dps_acrobatics_charges 1",
      "scoreboard players set @s dps_acrobatics_guard 1",
      "",
      "# Reduction in tenths: 40 + level / 5 (2 hearts + 1 heart per 50 levels).",
      "scoreboard players operation __fall_reduce__ dps_tmp = @s dps_acrobatics_level",
      "scoreboard players operation __fall_reduce__ dps_tmp /= 5 dps_globals",
      "scoreboard players add __fall_reduce__ dps_tmp 40",
      "",
      "# multiplier = max(0, (damage - reduction) / damage)",
      "scoreboard players operation __fall_ratio__ dps_tmp = __fall__ dps_tmp",
      "scoreboard players operation __fall_ratio__ dps_tmp -= __fall_reduce__ dps_tmp",
      "execute if score __fall_ratio__ dps_tmp matches ..0 run scoreboard players set __fall_ratio__ dps_tmp 0",
      "scoreboard players operation __fall_ratio__ dps_tmp *= 1000 dps_globals",
      "scoreboard players operation __fall_ratio__ dps_tmp /= __fall__ dps_tmp",
      "execute store result storage dps:powerup fall.multiplier double 0.001 run scoreboard players get __fall_ratio__ dps_tmp",
      `function ${fallGuardSet.name} with storage dps:powerup fall`,
    ]),
    second: d.defineFunction("powerup/fall_guard/second", [
      "$execute as @a[scores={$(skill)_cooldown=1..}] if score @s $(skill)_charges < @s $(skill)_charges_max run scoreboard players remove @s $(skill)_cooldown 1",
      "$execute as @a if score @s $(skill)_cooldown > @s $(skill)_cooldown_max run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max",
      "$execute as @a[scores={$(skill)_cooldown=0..0}] if score @s $(skill)_charges < @s $(skill)_charges_max run scoreboard players add @s $(skill)_charges 1",
      "$execute as @a[scores={$(skill)_cooldown=0..0}] if score @s $(skill)_charges < @s $(skill)_charges_max run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max",
    ]),
    trigger: d.defineFunction("powerup/fall_guard/trigger", [
      `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
      `tellraw @s ${snbt([text("Charged Fall Guard", { color: "gold" })])}`,
      `tellraw @s ${snbt([
        text("Charges: ", { color: "gold" }),
        score("@s", "dps_acrobatics_charges", { color: "aqua" }),
        text("/", { color: "aqua" }),
        score("@s", "dps_acrobatics_charges_max", { color: "aqua" }),
      ])}`,
      `tellraw @s ${snbt([
        text("Recharge: ", { color: "gold" }),
        score("@s", "dps_acrobatics_cooldown", { color: "aqua" }),
        text("s", { color: "aqua" }),
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

  // Shared "all skills" readout used by both /trigger dps and /trigger dps.info.
  const showAllSkills = d.defineFunction("triggers/dps/all", [
    `tellraw @s ${snbt([text("=== [Data Pack Skills] ===", { color: "yellow" })])}`,
    ...SKILLS.map(
      (skill) =>
        `$function ${triggerDpsSkill.name} {skill: "${sb(skill.name)}", name:"$(name)"}`,
    ),
    `tellraw @s ${snbt([text("--------------", { color: "yellow" })])}`,
    `$tellraw @s ${snbt([
      text("📊 Total", { color: "gold" }),
      text(" Lv", { color: "aqua" }),
      score("$(name)", "dps_total_level", { color: "aqua" }),
    ])}`,
    `tellraw @s ${snbt([text("=== [Data Pack Skills] ===", { color: "yellow" })])}`,
  ]);

  const triggerDps = d.defineFunction("triggers/dps/", [
    `$function ${showAllSkills.name} {"name": "$(name)"}`,
    "scoreboard players set @s dps 0",
  ]);

  const triggerDpsInfo = d.defineFunction("triggers/dps/info", [
    `$function ${showAllSkills.name} {"name": "$(name)"}`,
    "scoreboard players set @s dps.info 0",
  ]);

  const triggerFor = (skill: SkillConfig): FunctionRef => {
    if (skill.powerup === "effect") return effect.trigger;
    if (skill.powerup === "tree_cutter") return tree.trigger;
    if (skill.powerup === "fall_guard") return fallGuard.trigger;
    if (skill.powerup === "angler") return angler.trigger;
    return utility.nop;
  };

  // Function run on level up to announce what the skill's powerup now does.
  const levelupSuccess: Record<Powerup, string> = {
    effect: "dps:powerup/effect/levelup",
    tree_cutter: "dps:powerup/tree_cutter/levelup",
    fall_guard: fallGuard.levelup.name,
    harvest: harvest.levelup.name,
    repair: repair.levelup.name,
    effect_extend: alchemyLevelup.name,
    arrow_recovery: arrowRecovery.levelup.name,
    twins: twinsLevelup.name,
    angler: angler.levelup.name,
    none: "dps:utility/nop",
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
    } else if (skill.powerup === "fall_guard") {
      loadLines.push(
        `function dps:powerup/fall_guard/init {skill: "${scoreboard}", display: "${skill.display}"}`,
      );
    } else if (skill.powerup === "repair") {
      loadLines.push(
        `function dps:powerup/repair/init {skill: "${scoreboard}", display: "${skill.display}"}`,
      );
    } else if (skill.powerup === "angler") {
      loadLines.push(
        `function dps:powerup/angler/init {skill: "${scoreboard}", display: "${skill.display}"}`,
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

    const tickLines: Lines = [];
    if (skill.powerup === "angler") {
      tickLines.push(
        `execute as @a[scores={dps_fish_caught=1..}] run function ${angler.catch.name}`,
        "",
      );
    }
    tickLines.push(
      `function dps:skill/${skill.name}/actions {function: "dps:utility/give_xp/"}`,
      "",
    );
    const success = levelupSuccess[skill.powerup];
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
    } else if (skill.powerup === "fall_guard") {
      tickLines.push(
        `execute as @a run function ${fallGuard.apply.name}`,
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
    } else if (skill.powerup === "repair") {
      d.defineFunction(`skill/${skill.name}/second`, [
        `function ${repair.second.name} {skill: "${scoreboard}"}`,
      ]);
    } else if (skill.powerup === "fall_guard") {
      d.defineFunction(`skill/${skill.name}/second`, [
        `function ${fallGuard.second.name} {skill: "${scoreboard}"}`,
      ]);
    }
  }

  const load = d.defineFunction("load", [
    "scoreboard objectives add dps trigger",
    "scoreboard objectives add dps.info trigger",
    "scoreboard objectives add dps_tmp dummy",
    "scoreboard objectives add dps_globals dummy",
    "scoreboard objectives add dps_xp_config dummy",
    "# 0 = normal, 1 = minor, 2 = mayor",
    "scoreboard objectives add dps_lvl_up_type dummy",
    "",
    "scoreboard players set -1 dps_globals -1",
    "scoreboard players set 1 dps_globals 1",
    "scoreboard players set 2 dps_globals 2",
    "scoreboard players set 4 dps_globals 4",
    "scoreboard players set 5 dps_globals 5",
    "scoreboard players set 7 dps_globals 7",
    "scoreboard players set 9 dps_globals 9",
    "scoreboard players set 10 dps_globals 10",
    "scoreboard players set 20 dps_globals 20",
    "scoreboard players set 38 dps_globals 38",
    "scoreboard players set 50 dps_globals 50",
    "scoreboard players set 100 dps_globals 100",
    "scoreboard players set 158 dps_globals 158",
    "scoreboard players set 300 dps_globals 300",
    "scoreboard players set 400 dps_globals 400",
    "scoreboard players set 1000 dps_globals 1000",
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
        skill.powerup === "effect" ||
        skill.powerup === "tree_cutter" ||
        skill.powerup === "repair" ||
        skill.powerup === "fall_guard",
    ).map((skill) => `function dps:skill/${skill.name}/second`),
  ]);

  const tick = d.defineFunction("tick", [
    ...SKILLS.map((skill) => `function dps:skill/${skill.name}/tick`),
    "",
    `execute as @a[scores={dps=1..}] run function ${triggerDps.name} {"name":"@s"}`,
    "scoreboard players enable @a dps",
    "",
    `execute as @a[scores={dps.info=1..}] run function ${triggerDpsInfo.name} {"name":"@s"}`,
    "scoreboard players enable @a dps.info",
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

  defineInstall(d);

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
    "#minecraft:pale_oak_logs",
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

  // Tree cutter must not wear down tools made unbreakable by the unbreakable
  // datapack's enchantment. The enchantment is referenced through a tag in
  // this pack so the predicate still parses when the enchantment is not in the
  // registry yet (custom enchantments only load at world start, so a /reload
  // before the first restart must not fail).
  d.tag("enchantment", "unbreakable", [
    { id: "unbreakable:unbreakable", required: false },
  ]);
  d.predicate("holding_unbreakable", {
    type: "minecraft:entity_properties",
    entity: "this",
    predicate: {
      "minecraft:equipment": {
        mainhand: {
          predicates: {
            "minecraft:enchantments": [{ enchantments: "#dps:unbreakable" }],
          },
        },
      },
    },
  });

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

  d.itemTag("farming_tool", ["#minecraft:hoes"]);
  d.blockTag("anvils", [...ANVIL_BLOCKS]);

  d.predicate("baby", {
    type: "minecraft:entity_properties",
    entity: "this",
    predicate: { "minecraft:flags": { is_baby: true } },
  });

  // Harvest Moon: use a hoe on a block (i.e. till the ground) to harvest the
  // mature crops around you. `item_used_on_block` only fires when the use
  // actually does something, and a hoe on a crop does nothing, so tilling is
  // the reliable trigger.
  d.advancement("farming_harvest", {
    criteria: {
      harvest: {
        trigger: "minecraft:item_used_on_block",
        conditions: {
          location: {
            type: "minecraft:match_tool",
            predicate: { items: "#dps:farming_tool" },
          },
        },
      },
    },
    rewards: { function: harvest.use.name },
  });

  // Arcane Repair: sneak + right-click an anvil.
  d.advancement("enchanting_repair", {
    criteria: {
      repair: {
        trigger: "minecraft:default_block_use",
        conditions: {
          player: {
            type: "minecraft:entity_properties",
            entity: "this",
            predicate: { "minecraft:flags": { is_sneaking: true } },
          },
          location: {
            type: "minecraft:location_check",
            predicate: { block: { blocks: "#dps:anvils" } },
          },
        },
      },
    },
    rewards: { function: repair.use.name },
  });

  // Arrow Recovery: one of your arrows hit an entity.
  d.advancement("archery_recover", {
    criteria: {
      recover: {
        trigger: "minecraft:player_hurt_entity",
        conditions: {
          damage: {
            type: {
              direct_entity: { "minecraft:entity_type": "minecraft:arrow" },
            },
          },
        },
      },
    },
    rewards: { function: arrowRecovery.recover.name },
  });

  for (const twin of twins) {
    d.advancement(`taming_twin_${twin.slug}`, {
      criteria: {
        breed: {
          trigger: "minecraft:bred_animals",
          conditions: {
            child: {
              type: "minecraft:entity_properties",
              entity: "this",
              predicate: { "minecraft:entity_type": twin.animal },
            },
          },
        },
      },
      rewards: { function: twin.ref.name },
    });
  }

  for (const potion of alchemyPotions) {
    d.advancement(`alchemy_${potion.slug}`, {
      criteria: {
        drink: {
          trigger: "minecraft:consume_item",
          conditions: {
            item: {
              items: "minecraft:potion",
              predicates: {
                "minecraft:potion_contents": { potions: potion.potion },
              },
            },
          },
        },
      },
      rewards: { function: potion.ref.name },
    });
  }

  const uninstallObjectives = [
    "dps",
    "dps.info",
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
      if (skill.powerup === "repair") {
        suffixes.push("_cooldown");
      }
      if (skill.powerup === "angler") {
        suffixes.push("_charges");
      }
      if (skill.powerup === "fall_guard") {
        suffixes.push(
          "_charges",
          "_charges_max",
          "_cooldown",
          "_cooldown_max",
          "_guard",
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
      "dps:powerup alchemy",
      "dps:powerup fall",
      ...SKILLS.map((skill) => `dps:skill ${skill.name}`),
    ],
    kill: ["@e[tag=dps_durability]", "@e[tag=dps_repair]", "@e[tag=dps_twin]"],
    schedules: ["dps:second"],
  });

  return d;
}
