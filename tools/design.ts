import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Shared parser for packs/aom/DESIGN.md plus the building metadata (icons,
// categories) and the tech-tree shape used by the review page and the
// auto-generated techdemo datapack.

export interface Recipe {
  name: string;
  also: string[];
  wildcard: boolean;
}

export interface Job {
  kind: "unlock" | "storage" | "mechanic";
  label: string;
  villagers: number;
  recipes: Recipe[];
  notes: string[];
  resources: { name: string; rate: string }[];
}

export interface Table {
  headers: string[];
  rows: string[][];
}

export interface Building {
  name: string;
  category: string;
  description: string;
  craft: string;
  requires: string[];
  flags: string[];
  notes: string[];
  quotes: string[];
  tables: Table[];
  jobs: Job[];
}

export interface SharedRow {
  recipe: string;
  buildings: string[];
}

export interface StorageRow {
  building: string;
  resource: string;
  collector: string;
  rate: string;
}

export interface Design {
  buildings: Building[];
  shared: SharedRow[];
  storage: StorageRow[];
  categories: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "..", "packs/aom/DESIGN.md");

const NON_CATEGORIES = new Set([
  "House types",
  "Building categories",
  "Future features",
]);

function splitCells(line: string): string[] {
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

function cleanRecipe(text: string): string {
  return text.replace(/`/g, "").trim();
}

function parseRecipeEntry(text: string): Recipe[] {
  const recipes: Recipe[] = [];
  const re = /`([^`]+)`(?:\s*\(also ([^)]+)\))?/g;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = re.exec(text)) !== null) {
    found = true;
    const name = match[1]!.trim();
    const also = (match[2] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
    recipes.push({ name, also, wildcard: name.includes("*") || name.includes("…") });
  }
  if (found) return recipes;

  const alsoMatch = /\(also ([^)]+)\)/.exec(text);
  const also = (alsoMatch?.[1] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const name = text.replace(/\(also [^)]+\)/, "").replace(/[.:]+$/, "").trim();
  if (name) recipes.push({ name, also, wildcard: /all |recipes/i.test(name) });
  return recipes;
}

function parseStorageResources(rest: string): { name: string; rate: string }[] {
  return rest
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const rateMatch = /(\d+\s*\/\s*[a-z]+)/.exec(segment);
      const rate = rateMatch ? rateMatch[1]!.replace(/\s+/g, " ") : "";
      let name = rate ? segment.slice(0, rateMatch!.index) : segment;
      name = name.replace(/[—,]\s*$/, "").trim();
      if (!name) name = segment;
      return { name, rate };
    });
}

function parseBuilding(name: string, category: string, block: string[]): Building {
  const building: Building = {
    name,
    category,
    description: "",
    craft: "",
    requires: [],
    flags: [],
    notes: [],
    quotes: [],
    tables: [],
    jobs: [],
  };

  const logical: string[] = [];
  let current: string | null = null;
  for (const line of block) {
    if (/^\s*- /.test(line)) {
      if (current !== null) logical.push(current);
      current = line.replace(/^\s*- /, "");
    } else if (line.trim() === "" || /^-{3,}$/.test(line.trim()) || /^#{2,}/.test(line.trim())) {
      if (current !== null) {
        logical.push(current);
        current = null;
      }
    } else if (current !== null && /^\s+\S/.test(line)) {
      current += " " + line.trim();
    } else {
      if (current !== null) {
        logical.push(current);
        current = null;
      }
      logical.push(line);
    }
  }
  if (current !== null) logical.push(current);

  let activeJob: Job | null = null;
  let table: Table | null = null;
  const flushTable = () => {
    if (table) building.tables.push(table);
    table = null;
  };
  for (const raw of logical) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("|")) {
      const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^-{2,}$/.test(cell) || cell === "")) continue;
      if (!table) table = { headers: cells, rows: [] };
      else table.rows.push(cells);
      continue;
    }
    flushTable();

    if (line.startsWith(">")) {
      building.quotes.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const unlockHeader = /^Unlocks \((.+)\):$/.exec(line);
    if (unlockHeader) {
      const inner = unlockHeader[1]!;
      const villagers = Number(/(\d+)/.exec(inner)?.[1] ?? 1);
      const label = inner
        .replace(/,\s*\d+\s*villagers?/i, "")
        .replace(/\d+\s*jewellers?/i, "Jeweller")
        .trim();
      activeJob = {
        kind: "unlock",
        label: label || "Unlocks",
        villagers: Number.isFinite(villagers) && villagers > 0 ? villagers : 1,
        recipes: [],
        notes: [],
        resources: [],
      };
      building.jobs.push(activeJob);
      continue;
    }

    const jobHeader = /^([A-Za-z][A-Za-z' ]*) \((.+)\):$/.exec(line);
    if (jobHeader && /villager|mechanic/i.test(jobHeader[2]!)) {
      const inner = jobHeader[2]!;
      const villagers = Number(/(\d+)/.exec(inner)?.[1] ?? 1);
      activeJob = {
        kind: "mechanic",
        label: jobHeader[1]!.trim(),
        villagers: Number.isFinite(villagers) && villagers > 0 ? villagers : 1,
        recipes: [],
        notes: [],
        resources: [],
      };
      building.jobs.push(activeJob);
      continue;
    }

    const storage = /^Storage\*{0,2} \((.+?)\):\s*(.*)$/.exec(line);
    if (storage) {
      activeJob = {
        kind: "storage",
        label: storage[1]!.trim(),
        villagers: 1,
        recipes: [],
        notes: [],
        resources: parseStorageResources(storage[2]!),
      };
      building.jobs.push(activeJob);
      continue;
    }

    const craft = /^Craft:\s*(.+)$/.exec(line);
    if (craft) {
      building.craft = craft[1]!.trim();
      activeJob = null;
      continue;
    }

    const requires = /^Requires:\s*(.+)$/.exec(line);
    if (requires) {
      building.requires = requires[1]!.split(",").map((entry) => entry.trim()).filter(Boolean);
      activeJob = null;
      continue;
    }

    if (/^Unlock\*? \(/.test(line) || /^Mechanic \(/.test(line)) {
      building.notes.push(line);
      activeJob = null;
      continue;
    }
    if (/^Add villagers/.test(line)) {
      building.flags.push("Adds villagers");
      activeJob = null;
      continue;
    }
    if (/^Unlocks: none/.test(line)) {
      activeJob = null;
      continue;
    }
    if (/^All quarry|^Only these|^Rancher is a mechanic/.test(line)) {
      building.notes.push(line);
      activeJob = null;
      continue;
    }
    if (/^For each /.test(line)) {
      building.notes.push(line);
      activeJob = null;
      continue;
    }

    if (activeJob) {
      if (activeJob.kind === "unlock") {
        const recipes = parseRecipeEntry(line);
        if (recipes.length) activeJob.recipes.push(...recipes);
        else activeJob.notes.push(line);
      } else {
        activeJob.notes.push(line);
      }
    } else if (!building.description) {
      building.description = line;
    } else {
      building.flags.push(line);
    }
  }
  flushTable();

  return building;
}

export function loadDesign(): Design {
  const lines = readFileSync(SOURCE, "utf8").split("\n");
  const buildings: Building[] = [];
  let category = "";
  let name = "";
  let block: string[] = [];

  const isBuildingCategory = () =>
    !NON_CATEGORIES.has(category) && !category.startsWith("Appendix");

  const flush = () => {
    if (name) buildings.push(parseBuilding(name, category, block));
    name = "";
    block = [];
  };

  for (const line of lines) {
    const h2 = /^## (.+)$/.exec(line);
    const h3 = /^### (.+)$/.exec(line);
    if (h2) {
      flush();
      category = h2[1]!.trim();
      continue;
    }
    if (h3) {
      flush();
      if (isBuildingCategory()) name = h3[1]!.trim();
      continue;
    }
    if (name && isBuildingCategory()) block.push(line);
  }
  flush();

  const shared: SharedRow[] = [];
  const storage: StorageRow[] = [];
  let section = "";
  for (const line of lines) {
    const h2 = /^## (.+)$/.exec(line);
    if (h2) section = h2[1]!.trim();
    if (!line.trim().startsWith("|")) continue;
    const cells = splitCells(line);
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0]!.replace(/ /g, ""))) continue;
    if (section.startsWith("Appendix — recipes")) {
      if (cells[0] === "Recipe") continue;
      const recipe = cleanRecipe(cells[0]!);
      const list = cells[1]!.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (recipe) shared.push({ recipe, buildings: list });
    } else if (section.startsWith("Appendix — storage")) {
      if (cells[0] === "Building") continue;
      storage.push({
        building: cells[0]!,
        resource: cells[1]!,
        collector: cells[2]!,
        rate: cells[3]!,
      });
    }
  }

  return { buildings, shared, storage, categories: [...new Set(buildings.map((b) => b.category))] };
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeCraft(craft: string): string {
  return craft
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function recipeProviders(buildings: Building[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const building of buildings) {
    for (const job of building.jobs) {
      if (job.kind !== "unlock") continue;
      for (const recipe of job.recipes) {
        const owners = map.get(recipe.name) ?? new Set<string>();
        owners.add(building.name);
        map.set(recipe.name, owners);
      }
    }
  }
  return map;
}

export function craftDependencies(
  building: Building,
  providers: Map<string, Set<string>>,
): Set<string> {
  const token = normalizeCraft(building.craft);
  const deps = new Set<string>();
  if (!token) return deps;
  const aliases: Record<string, string> = { shovel: "wooden_shovel", wool: "white_wool" };
  const owners = providers.get(token) ?? providers.get(aliases[token] ?? "");
  owners?.forEach((owner) => owner !== building.name && deps.add(owner));
  return deps;
}

export function levels(
  buildings: Building[],
  providers: Map<string, Set<string>>,
): Map<string, number> {
  const edges = new Map<string, Set<string>>();
  for (const building of buildings) {
    edges.set(building.name, craftDependencies(building, providers));
  }
  const result = new Map<string, number>();
  const visiting = new Set<string>();
  const level = (name: string): number => {
    if (result.has(name)) return result.get(name)!;
    if (visiting.has(name)) return 0;
    visiting.add(name);
    let value = 0;
    for (const dep of edges.get(name) ?? []) value = Math.max(value, level(dep) + 1);
    visiting.delete(name);
    result.set(name, value);
    return value;
  };
  for (const building of buildings) level(building.name);
  return result;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export const ICON_ITEM: Record<string, string> = {
  Townhall: "minecraft:bell",
  Townhouse: "minecraft:oak_door",
  Lumbermill: "minecraft:oak_log",
  Mine: "minecraft:wooden_pickaxe",
  Quarry: "minecraft:gravel",
  Docks: "minecraft:oak_boat",
  "Ice House": "minecraft:ice",
  "Nether Outpost": "minecraft:netherrack",
  "Stone cutter": "minecraft:stonecutter",
  Blacksmith: "minecraft:anvil",
  "Gold smith": "minecraft:gold_ingot",
  Jeweller: "minecraft:diamond",
  Coppersmith: "minecraft:copper_ingot",
  Kiln: "minecraft:brick",
  "Mason's Yard": "minecraft:deepslate",
  Farm: "minecraft:wheat",
  Windmill: "minecraft:hay_block",
  Barn: "minecraft:hay_block",
  "Leather tanner": "minecraft:leather",
  Shepherd: "minecraft:white_wool",
  Spinnery: "minecraft:string",
  Weaver: "minecraft:white_banner",
  Apiary: "minecraft:honeycomb",
  Baker: "minecraft:bread",
  Butcher: "minecraft:cooked_beef",
  Brewery: "minecraft:brewing_stand",
  Fisher: "minecraft:fishing_rod",
  "Weapon smith": "minecraft:iron_sword",
  Fletcher: "minecraft:bow",
  "Glass blower": "minecraft:glass",
  Painter: "minecraft:painting",
  "Redstone Workshop": "minecraft:redstone",
  Bard: "minecraft:jukebox",
  Armory: "minecraft:iron_chestplate",
  Library: "minecraft:book",
  School: "minecraft:bookshelf",
  University: "minecraft:obsidian",
  "Cartographer's Guild": "minecraft:map",
  "End Observatory": "minecraft:end_stone",
  Custom: "minecraft:stick",
};

export const ICON_EMOJI: Record<string, string> = {
  Townhall: "🏛️",
  Townhouse: "🏠",
  Lumbermill: "🪵",
  Mine: "⛏️",
  Quarry: "🪨",
  Docks: "⛵",
  "Ice House": "🧊",
  "Nether Outpost": "🔥",
  "Stone cutter": "🧱",
  Blacksmith: "⚒️",
  "Gold smith": "🥇",
  Jeweller: "💎",
  Coppersmith: "🟠",
  Kiln: "🏺",
  "Mason's Yard": "⛰️",
  Farm: "🌾",
  Windmill: "🌬️",
  Barn: "🐄",
  "Leather tanner": "🟫",
  Shepherd: "🐑",
  Spinnery: "🧶",
  Weaver: "🎏",
  Apiary: "🐝",
  Baker: "🍞",
  Butcher: "🥩",
  Brewery: "🧪",
  Fisher: "🎣",
  "Weapon smith": "⚔️",
  Fletcher: "🏹",
  "Glass blower": "🪟",
  Painter: "🎨",
  "Redstone Workshop": "🔴",
  Bard: "🎵",
  Armory: "🛡️",
  Library: "📚",
  School: "🏫",
  University: "🎓",
  "Cartographer's Guild": "🗺️",
  "End Observatory": "🔭",
  Custom: "🧩",
};

export const CATEGORY_ICON_ITEM: Record<string, string> = {
  Civic: "minecraft:bell",
  Extraction: "minecraft:iron_pickaxe",
  Industry: "minecraft:anvil",
  Agriculture: "minecraft:wheat",
  Husbandry: "minecraft:white_wool",
  Food: "minecraft:cooked_beef",
  Crafting: "minecraft:crafting_table",
  Knowledge: "minecraft:enchanting_table",
  Special: "minecraft:stick",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  Civic: "🏛️",
  Extraction: "⛏️",
  Industry: "⚙️",
  Agriculture: "🌾",
  Husbandry: "🐑",
  Food: "🍞",
  Crafting: "🛠️",
  Knowledge: "📚",
  Special: "🧩",
};

export const BACKGROUND = "minecraft:block/deepslate_tiles";

// ---------------------------------------------------------------------------
// Tech tree
// ---------------------------------------------------------------------------

export type Frame = "task" | "goal" | "challenge";

export interface TreeNode {
  id: string;
  title: string;
  category: string | null;
  craft: string;
  icon: string;
  emoji: string;
  frame: Frame;
  parent: string | null;
  depth: number;
  children: TreeNode[];
}

const GOAL = new Set(["Jeweller", "University", "Library"]);
const CHALLENGE = new Set(["Nether Outpost", "End Observatory"]);

export function buildTree(design: Design): { root: TreeNode; nodes: TreeNode[] } {
  const providers = recipeProviders(design.buildings);
  const craftDeps = new Map<string, Set<string>>();
  for (const building of design.buildings) {
    craftDeps.set(building.name, craftDependencies(building, providers));
  }
  const depCount = (name: string) => craftDeps.get(name)?.size ?? 0;
  const pickParent = (building: Building): string | null => {
    const deps = [...(craftDeps.get(building.name) ?? [])];
    if (!deps.length) return null;
    deps.sort((a, b) => depCount(a) - depCount(b) || a.localeCompare(b));
    return deps[0]!;
  };

  const byName = new Map<string, TreeNode>();
  const root: TreeNode = {
    id: "root",
    title: "Age of Minecraft",
    category: null,
    craft: "—",
    icon: "minecraft:grass_block",
    emoji: "🌍",
    frame: "goal",
    parent: null,
    depth: 0,
    children: [],
  };
  const nodes: TreeNode[] = [root];

  const categoryNodes = new Map<string, TreeNode>();
  for (const category of design.categories) {
    const node: TreeNode = {
      id: `cat_${slug(category)}`,
      title: category,
      category,
      craft: "—",
      icon: CATEGORY_ICON_ITEM[category] ?? "minecraft:stick",
      emoji: CATEGORY_EMOJI[category] ?? "📦",
      frame: "goal",
      parent: root.id,
      depth: 1,
      children: [],
    };
    categoryNodes.set(category, node);
    nodes.push(node);
  }

  for (const building of design.buildings) {
    const node: TreeNode = {
      id: slug(building.name),
      title: building.name,
      category: building.category,
      craft: building.craft,
      icon: ICON_ITEM[building.name] ?? "minecraft:stick",
      emoji: ICON_EMOJI[building.name] ?? "📦",
      frame: CHALLENGE.has(building.name) ? "challenge" : GOAL.has(building.name) ? "goal" : "task",
      parent: null,
      depth: 0,
      children: [],
    };
    byName.set(building.name, node);
    nodes.push(node);
  }

  for (const building of design.buildings) {
    const node = byName.get(building.name)!;
    const required = building.requires.find((name) => byName.has(name));
    const dep = required ?? pickParent(building);
    const depNode = dep ? byName.get(dep) : undefined;
    const categoryNode = categoryNodes.get(building.category)!;
    node.parent = depNode ? depNode.id : categoryNode.id;
  }

  for (const category of design.categories) {
    const node = categoryNodes.get(category)!;
    root.children.push(node);
  }
  for (const building of design.buildings) {
    const node = byName.get(building.name)!;
    const parent = nodes.find((candidate) => candidate.id === node.parent);
    parent?.children.push(node);
  }

  // Depth + cycle guard: any node whose parent chain loops is re-homed to its category.
  const seen = new Set<string>();
  const visit = (node: TreeNode, depth: number, trail: Set<string>): void => {
    node.depth = depth;
    node.children.forEach((child) => {
      if (trail.has(child.id) || seen.has(child.id)) {
        const categoryNode = categoryNodes.get(child.category ?? "");
        if (categoryNode && child.parent !== categoryNode.id) {
          child.parent = categoryNode.id;
          categoryNode.children.push(child);
          return;
        }
      }
      seen.add(child.id);
      visit(child, depth + 1, new Set(trail).add(child.id));
    });
  };
  visit(root, 0, new Set([root.id]));

  return { root, nodes };
}

export function childrenOf(node: TreeNode): TreeNode[] {
  return node.children;
}
