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
  "minecraft:armor_stand",
  "minecraft:written_book",
  "minecraft:stripped_acacia_log",
  "minecraft:stripped_birch_log",
  "minecraft:stripped_cherry_log",
  "minecraft:stripped_dark_oak_log",
  "minecraft:stripped_jungle_log",
  "minecraft:stripped_mangrove_log",
  "minecraft:stripped_oak_log",
  "minecraft:stripped_pale_oak_log",
  "minecraft:stripped_spruce_log",
] as const;
export type ItemId = (typeof ITEMS)[number];

export const BLOCKS = ["minecraft:air", "minecraft:lectern"] as const;
export type BlockId = (typeof BLOCKS)[number];

export const EFFECTS = ["minecraft:strength", "minecraft:haste"] as const;
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
