import { VERSIONS, LATEST } from "./versions.generated.ts";

export type VersionId = keyof typeof VERSIONS;
export type PackFormat = readonly [major: number, minor: number];

export interface Version {
  readonly id: VersionId;
  readonly packFormat: PackFormat;
}

export const VERSION_IDS = Object.keys(VERSIONS) as VersionId[];

export function version(id: VersionId): Version {
  return { id, packFormat: VERSIONS[id] };
}

export function latestVersion(): Version {
  return version(LATEST);
}

export { LATEST };

// ---------------------------------------------------------------------------
// Registry models
//
// These are the "internal models" that need updating for a new Minecraft
// version. Keep them in sync with the game's registries (ideally regenerated
// from misode/mcmeta or PrismarineJS/minecraft-data). Anything that emits a
// registry id should reference one of these unions so invalid ids fail at
// compile time.
// ---------------------------------------------------------------------------

export const ITEMS = [
  "minecraft:air",
  "minecraft:andesite",
  "minecraft:acacia_log",
  "minecraft:acacia_planks",
  "minecraft:acacia_sign",
  "minecraft:armor_stand",
  "minecraft:bamboo_planks",
  "minecraft:bamboo_sign",
  "minecraft:beetroot",
  "minecraft:beetroot_seeds",
  "minecraft:birch_log",
  "minecraft:birch_planks",
  "minecraft:birch_sign",
  "minecraft:bookshelf",
  "minecraft:carrot",
  "minecraft:cherry_log",
  "minecraft:cherry_planks",
  "minecraft:cherry_sign",
  "minecraft:chicken",
  "minecraft:clay_ball",
  "minecraft:coal",
  "minecraft:cobblestone",
  "minecraft:cod",
  "minecraft:compass",
  "minecraft:crimson_planks",
  "minecraft:crimson_sign",
  "minecraft:dark_oak_log",
  "minecraft:dark_oak_planks",
  "minecraft:dark_oak_sign",
  "minecraft:deepslate",
  "minecraft:diamond",
  "minecraft:diorite",
  "minecraft:dirt",
  "minecraft:emerald",
  "minecraft:end_stone",
  "minecraft:feather",
  "minecraft:furnace",
  "minecraft:goat_horn",
  "minecraft:granite",
  "minecraft:gravel",
  "minecraft:hay_block",
  "minecraft:honeycomb",
  "minecraft:ice",
  "minecraft:ink_sac",
  "minecraft:iron_ingot",
  "minecraft:jungle_log",
  "minecraft:jungle_planks",
  "minecraft:jungle_sign",
  "minecraft:lapis_lazuli",
  "minecraft:leather",
  "minecraft:mangrove_log",
  "minecraft:mangrove_planks",
  "minecraft:mangrove_sign",
  "minecraft:melon_seeds",
  "minecraft:melon_slice",
  "minecraft:mutton",
  "minecraft:nether_wart",
  "minecraft:oak_log",
  "minecraft:oak_planks",
  "minecraft:oak_sapling",
  "minecraft:oak_sign",
  "minecraft:obsidian",
  "minecraft:pale_oak_log",
  "minecraft:pale_oak_planks",
  "minecraft:pale_oak_sign",
  "minecraft:paper",
  "minecraft:porkchop",
  "minecraft:potato",
  "minecraft:pufferfish",
  "minecraft:pumpkin",
  "minecraft:rabbit",
  "minecraft:raw_beef",
  "minecraft:raw_copper",
  "minecraft:raw_gold",
  "minecraft:raw_iron",
  "minecraft:redstone",
  "minecraft:salmon",
  "minecraft:sand",
  "minecraft:snow",
  "minecraft:snowball",
  "minecraft:spruce_log",
  "minecraft:spruce_planks",
  "minecraft:spruce_sign",
  "minecraft:stick",
  "minecraft:string",
  "minecraft:stripped_acacia_log",
  "minecraft:stripped_birch_log",
  "minecraft:stripped_cherry_log",
  "minecraft:stripped_dark_oak_log",
  "minecraft:stripped_jungle_log",
  "minecraft:stripped_mangrove_log",
  "minecraft:stripped_oak_log",
  "minecraft:stripped_pale_oak_log",
  "minecraft:stripped_spruce_log",
  "minecraft:sugar_cane",
  "minecraft:tropical_fish",
  "minecraft:warped_planks",
  "minecraft:warped_sign",
  "minecraft:wheat",
  "minecraft:white_wool",
  "minecraft:wooden_axe",
  "minecraft:wooden_pickaxe",
  "minecraft:wooden_shovel",
  "minecraft:wooden_sword",
  "minecraft:written_book",
] as const;
export type ItemId = (typeof ITEMS)[number];

export const BLOCKS = ["minecraft:air", "minecraft:lectern"] as const;
export type BlockId = (typeof BLOCKS)[number];

export const EFFECTS = [
  "minecraft:strength",
  "minecraft:haste",
  "minecraft:mining_fatigue",
] as const;
export type EffectId = (typeof EFFECTS)[number];

export const SOUNDS = [
  "minecraft:block.note_block.bell",
  "minecraft:block.note_block.pling",
  "minecraft:entity.experience_orb.pickup",
  "minecraft:entity.firework_rocket.twinkle_far",
  "minecraft:entity.player.levelup",
] as const;
export type SoundId = (typeof SOUNDS)[number];

export const GAMEMODES = [
  "survival",
  "creative",
  "adventure",
  "spectator",
] as const;
export type Gamemode = (typeof GAMEMODES)[number];

export const EQUIPMENT_SLOTS = [
  "head",
  "chest",
  "legs",
  "feet",
  "body",
  "mainhand",
  "offhand",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const ENTITY_TYPES = [
  "minecraft:blaze",
  "minecraft:cat",
  "minecraft:cave_spider",
  "minecraft:chicken",
  "minecraft:cod",
  "minecraft:cow",
  "minecraft:creeper",
  "minecraft:drowned",
  "minecraft:elder_guardian",
  "minecraft:ender_dragon",
  "minecraft:enderman",
  "minecraft:endermite",
  "minecraft:evoker",
  "minecraft:fox",
  "minecraft:ghast",
  "minecraft:guardian",
  "minecraft:husk",
  "minecraft:llama",
  "minecraft:magma_cube",
  "minecraft:mannequin",
  "minecraft:marker",
  "minecraft:pig",
  "minecraft:piglin",
  "minecraft:piglin_brute",
  "minecraft:pillager",
  "minecraft:polar_bear",
  "minecraft:pufferfish",
  "minecraft:rabbit",
  "minecraft:salmon",
  "minecraft:sheep",
  "minecraft:shulker",
  "minecraft:silverfish",
  "minecraft:skeleton",
  "minecraft:slime",
  "minecraft:spider",
  "minecraft:squid",
  "minecraft:stray",
  "minecraft:strider",
  "minecraft:turtle",
  "minecraft:trader_llama",
  "minecraft:tropical_fish",
  "minecraft:vex",
  "minecraft:villager",
  "minecraft:vindicator",
  "minecraft:wandering_trader",
  "minecraft:witch",
  "minecraft:wither",
  "minecraft:wither_skeleton",
  "minecraft:wolf",
  "minecraft:zombie",
] as const;
export type EntityId = (typeof ENTITY_TYPES)[number];
