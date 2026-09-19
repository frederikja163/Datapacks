import type { ItemId } from "../../../mcgen/src/index.ts";

// ---------------------------------------------------------------------------
// AOM registry
//
// Buildings, jobs and resources are declared once here. The build emits
// specialized functions per building type (hire/fire/generation/render, sign
// text); nothing interprets jobs at runtime.
// ---------------------------------------------------------------------------

export interface Resource {
  readonly id: string;
  readonly label: string;
  readonly item: ItemId;
}

export interface Job {
  readonly id: string;
  readonly label: string;
  readonly kind: "unlock" | "generation" | "storage";
  readonly resource?: string;
  readonly capacity?: number;
  readonly unlock?: string;
}

export interface BuildingType {
  readonly id: string;
  readonly label: string;
  readonly category: "townhall" | "townhouse" | "industrial";
  readonly description: string;
  readonly jobs: readonly Job[];
}

export interface Unlock {
  readonly id: string;
  readonly label: string;
  readonly recipes: readonly string[];
}

export const RESOURCES: readonly Resource[] = [
  { id: "oak_logs", label: "Oak", item: "minecraft:oak_log" },
];

export function resource(id: string): Resource {
  const found = RESOURCES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown resource: ${id}`);
  return found;
}

export const UNLOCKS: readonly Unlock[] = [
  {
    id: "wooden_tools",
    label: "Wooden tool crafting",
    recipes: [
      "minecraft:wooden_axe",
      "minecraft:wooden_hoe",
      "minecraft:wooden_pickaxe",
      "minecraft:wooden_shovel",
      "minecraft:wooden_sword",
    ],
  },
];

export const BUILDINGS: readonly BuildingType[] = [
  {
    id: "townhall",
    label: "Townhall",
    category: "townhall",
    description: "Anchors the town and manages its membership.",
    jobs: [],
  },
  {
    id: "townhouse",
    label: "Townhouse",
    category: "townhouse",
    description: "Houses villagers for the town.",
    jobs: [],
  },
  {
    id: "lumbermill",
    label: "Lumbermill",
    category: "industrial",
    description: "Generates and stores oak logs; unlocks wooden tool recipes.",
    jobs: [
      {
        id: "tool_crafter",
        label: "Tool crafter",
        kind: "unlock",
        unlock: "wooden_tools",
      },
      {
        id: "oak_cutter",
        label: "Oak cutters",
        kind: "generation",
        resource: "oak_logs",
      },
      {
        id: "oak_banker",
        label: "Oak bankers",
        kind: "storage",
        resource: "oak_logs",
        capacity: 576,
      },
    ],
  },
];

export const INDUSTRIAL_BUILDINGS: readonly BuildingType[] = BUILDINGS.filter(
  (building) => building.category === "industrial",
);

/**
 * Buildings offered in the build menu: every building, including the townhall
 * so it can be rebuilt if its sign or block was destroyed.
 */
export const BUILD_MENU_BUILDINGS: readonly BuildingType[] = BUILDINGS;

/** The storage resources a building uses, in registry order. */
export function buildingResources(type: BuildingType): Resource[] {
  const ids: string[] = [];
  for (const job of type.jobs) {
    if (job.resource && !ids.includes(job.resource)) ids.push(job.resource);
  }
  return ids.map(resource);
}

/** The generation jobs producing a resource. */
export function generationJobs(
  type: BuildingType,
  resourceId: string,
): Job[] {
  return type.jobs.filter(
    (job) => job.kind === "generation" && job.resource === resourceId,
  );
}

/** The storage jobs expanding a resource's capacity. */
export function storageJobs(type: BuildingType, resourceId: string): Job[] {
  return type.jobs.filter(
    (job) => job.kind === "storage" && job.resource === resourceId,
  );
}

// ---------------------------------------------------------------------------
// Action indices
//
// Menu buttons only set the `aom.action` trigger. The numeric values must be
// identical in the menus and in the per-type action handlers.
// ---------------------------------------------------------------------------

/** Actions of the townhall menu (the town's own management). */
export const TOWNHALL_ACTIONS = {
  join: 1,
  leave: 2,
  deleteTown: 3,
  /** Chat-page navigation, kept clear of the action indices above. */
  pagePrev: 10,
  pageNext: 11,
} as const;

/** Actions of a townhouse (villager housing) menu. */
export const TOWNHOUSE_ACTIONS = {
  addVillager: 1,
  removeVillager: 2,
  delete: 3,
} as const;

/** The `aom.action` value the generic confirm prompt's "yes" button uses. */
export const CONFIRM_ACTION = -1;

export const STORAGE_AMOUNTS = [
  { value: 1, label: "1" },
  { value: 16, label: "16" },
  { value: 64, label: "64" },
  { value: 2147483647, label: "all" },
] as const;

/** First `aom.action` index used by storage actions of an industrial type.
 *  Jobs are permanent, so each job takes a single (hire) action index. */
function storageActionBase(type: BuildingType): number {
  return type.jobs.length + 1;
}

/** `aom.action` index for a deposit/withdraw button. */
export function storageAction(
  type: BuildingType,
  resourceIndex: number,
  kind: "deposit" | "withdraw",
  amountIndex: number,
): number {
  const base = storageActionBase(type);
  return base + resourceIndex * (STORAGE_AMOUNTS.length * 2) +
    (kind === "deposit" ? 0 : STORAGE_AMOUNTS.length) + amountIndex;
}

/** `aom.action` index of the delete-building button. */
export function deleteAction(type: BuildingType): number {
  return storageActionBase(type) +
    buildingResources(type).length * STORAGE_AMOUNTS.length * 2;
}
