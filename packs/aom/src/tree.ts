import { ITEM_IDS } from "../../../mcgen/src/models/items.generated.ts";

// The AOM advancement page: one node per building (plus a root and one node
// per category). The shape mirrors the tech-tree preview in packs/techdemo,
// with the buildings AOM does not implement (the Nether Outpost) removed.

export type TreeNodeKind = "root" | "category" | "building";

export interface TreeNode {
  readonly id: string;
  readonly parent: string | null;
  readonly kind: TreeNodeKind;
  readonly icon: string;
  readonly frame: "task" | "goal" | "challenge";
}

export const TREE_BACKGROUND = "minecraft:block/deepslate_tiles";

export const TREE: readonly TreeNode[] = [
  { id: "root", parent: null, kind: "root", icon: "minecraft:grass_block", frame: "goal" },

  { id: "cat_civic", parent: "root", kind: "category", icon: "minecraft:bell", frame: "goal" },
  { id: "cat_extraction", parent: "root", kind: "category", icon: "minecraft:iron_pickaxe", frame: "goal" },
  { id: "cat_industry", parent: "root", kind: "category", icon: "minecraft:anvil", frame: "goal" },
  { id: "cat_agriculture", parent: "root", kind: "category", icon: "minecraft:wheat", frame: "goal" },
  { id: "cat_husbandry", parent: "root", kind: "category", icon: "minecraft:white_wool", frame: "goal" },
  { id: "cat_food", parent: "root", kind: "category", icon: "minecraft:cooked_beef", frame: "goal" },
  { id: "cat_crafting", parent: "root", kind: "category", icon: "minecraft:crafting_table", frame: "goal" },
  { id: "cat_knowledge", parent: "root", kind: "category", icon: "minecraft:enchanting_table", frame: "goal" },
  { id: "cat_special", parent: "root", kind: "category", icon: "minecraft:stick", frame: "goal" },

  { id: "townhall", parent: "cat_civic", kind: "building", icon: "minecraft:bell", frame: "task" },
  { id: "townhouse", parent: "cat_civic", kind: "building", icon: "minecraft:oak_door", frame: "task" },
  { id: "lumbermill", parent: "cat_extraction", kind: "building", icon: "minecraft:oak_log", frame: "task" },
  { id: "mine", parent: "lumbermill", kind: "building", icon: "minecraft:wooden_pickaxe", frame: "task" },
  { id: "quarry", parent: "cat_extraction", kind: "building", icon: "minecraft:gravel", frame: "task" },
  { id: "docks", parent: "lumbermill", kind: "building", icon: "minecraft:oak_boat", frame: "task" },
  { id: "ice_house", parent: "cat_extraction", kind: "building", icon: "minecraft:ice", frame: "task" },
  { id: "stone_cutter", parent: "cat_industry", kind: "building", icon: "minecraft:stonecutter", frame: "task" },
  { id: "blacksmith", parent: "cat_industry", kind: "building", icon: "minecraft:anvil", frame: "task" },
  { id: "gold_smith", parent: "coppersmith", kind: "building", icon: "minecraft:gold_ingot", frame: "task" },
  { id: "jeweller", parent: "gold_smith", kind: "building", icon: "minecraft:diamond", frame: "goal" },
  { id: "coppersmith", parent: "blacksmith", kind: "building", icon: "minecraft:copper_ingot", frame: "task" },
  { id: "kiln", parent: "cat_industry", kind: "building", icon: "minecraft:brick", frame: "task" },
  { id: "masons_yard", parent: "cat_industry", kind: "building", icon: "minecraft:deepslate", frame: "task" },
  { id: "farm", parent: "cat_agriculture", kind: "building", icon: "minecraft:wheat", frame: "task" },
  { id: "windmill", parent: "farm", kind: "building", icon: "minecraft:hay_block", frame: "task" },
  { id: "barn", parent: "cat_husbandry", kind: "building", icon: "minecraft:hay_block", frame: "task" },
  { id: "leather_tanner", parent: "cat_husbandry", kind: "building", icon: "minecraft:leather", frame: "task" },
  { id: "shepherd", parent: "cat_husbandry", kind: "building", icon: "minecraft:white_wool", frame: "task" },
  { id: "spinnery", parent: "cat_husbandry", kind: "building", icon: "minecraft:string", frame: "task" },
  { id: "weaver", parent: "spinnery", kind: "building", icon: "minecraft:white_banner", frame: "task" },
  { id: "apiary", parent: "cat_husbandry", kind: "building", icon: "minecraft:honeycomb", frame: "task" },
  { id: "baker", parent: "blacksmith", kind: "building", icon: "minecraft:bread", frame: "task" },
  { id: "butcher", parent: "lumbermill", kind: "building", icon: "minecraft:cooked_beef", frame: "task" },
  { id: "brewery", parent: "cat_food", kind: "building", icon: "minecraft:brewing_stand", frame: "task" },
  { id: "fisher", parent: "cat_food", kind: "building", icon: "minecraft:fishing_rod", frame: "task" },
  { id: "weapon_smith", parent: "lumbermill", kind: "building", icon: "minecraft:iron_sword", frame: "task" },
  { id: "fletcher", parent: "cat_crafting", kind: "building", icon: "minecraft:bow", frame: "task" },
  { id: "glass_blower", parent: "cat_crafting", kind: "building", icon: "minecraft:glass", frame: "task" },
  { id: "painter", parent: "cat_crafting", kind: "building", icon: "minecraft:painting", frame: "task" },
  { id: "redstone_workshop", parent: "cat_crafting", kind: "building", icon: "minecraft:redstone", frame: "task" },
  { id: "bard", parent: "cat_crafting", kind: "building", icon: "minecraft:jukebox", frame: "task" },
  { id: "armory", parent: "blacksmith", kind: "building", icon: "minecraft:iron_chestplate", frame: "task" },
  { id: "library", parent: "cat_knowledge", kind: "building", icon: "minecraft:book", frame: "goal" },
  { id: "school", parent: "library", kind: "building", icon: "minecraft:bookshelf", frame: "task" },
  { id: "university", parent: "school", kind: "building", icon: "minecraft:obsidian", frame: "goal" },
  { id: "cartographers_guild", parent: "blacksmith", kind: "building", icon: "minecraft:map", frame: "task" },
  { id: "end_observatory", parent: "cat_knowledge", kind: "building", icon: "minecraft:end_stone", frame: "challenge" },
  { id: "custom", parent: "cat_special", kind: "building", icon: "minecraft:stick", frame: "task" },
];

export const TREE_BUILDINGS = TREE.filter((node) => node.kind === "building");
export const TREE_STATIC = TREE.filter((node) => node.kind !== "building");

export const CATEGORY_TITLES: Record<string, string> = {
  cat_civic: "Civic",
  cat_extraction: "Extraction",
  cat_industry: "Industry",
  cat_agriculture: "Agriculture",
  cat_husbandry: "Husbandry",
  cat_food: "Food",
  cat_crafting: "Crafting",
  cat_knowledge: "Knowledge",
  cat_special: "Special",
};

const ITEM_SET = new Set<string>(ITEM_IDS);
const unknownIcons = TREE.map((node) => node.icon).filter(
  (icon) => !ITEM_SET.has(icon),
);
if (unknownIcons.length) {
  throw new Error(`Unknown advancement icons:\n${unknownIcons.join("\n")}`);
}
