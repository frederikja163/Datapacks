import type { ItemId } from "../../../mcgen/src/index.ts";

// ---------------------------------------------------------------------------
// AOM registry
//
// Buildings, jobs and resources are declared once here. The build emits
// specialized functions per building type (hire/fire/generation/render,
// dialogs, sign text); nothing interprets jobs at runtime.
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
  readonly rate?: number;
  readonly capacity?: number;
  readonly unlock?: string;
}

export interface BuildingType {
  readonly id: string;
  readonly label: string;
  readonly category: "townhouse" | "industrial";
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

export function unlock(id: string): Unlock {
  const found = UNLOCKS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown unlock: ${id}`);
  return found;
}

export const BUILDINGS: readonly BuildingType[] = [
  {
    id: "townhouse",
    label: "Townhouse",
    category: "townhouse",
    jobs: [],
  },
  {
    id: "lumbermill",
    label: "Lumbermill",
    category: "industrial",
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
        rate: 1,
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

export function building(id: string): BuildingType {
  const found = BUILDINGS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown building: ${id}`);
  return found;
}

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

/** The unlock job granting an unlock, if the building has one. */
export function unlockJob(type: BuildingType, unlockId: string): Job | undefined {
  return type.jobs.find(
    (job) => job.kind === "unlock" && job.unlock === unlockId,
  );
}

// ---------------------------------------------------------------------------
// Action indices
//
// Dialog buttons only set the `aom.action` trigger. The numeric values must be
// identical in the dialogs and in the per-type action handlers.
// ---------------------------------------------------------------------------

export const TOWNHOUSE_ACTIONS = {
  join: 1,
  leave: 2,
  addVillager: 3,
  removeVillager: 4,
  deleteTown: 5,
  townInfo: 6,
} as const;

/** The `aom.action` value the generic confirm dialog's "yes" button uses. */
export const CONFIRM_ACTION = -1;

export const STORAGE_AMOUNTS = [
  { value: 1, label: "1" },
  { value: 16, label: "16" },
  { value: 64, label: "64" },
  { value: 2147483647, label: "all" },
] as const;

export interface JobActionIndices {
  readonly hire: number;
  readonly fire: number;
}

export function jobActions(index: number): JobActionIndices {
  return { hire: index * 2 + 1, fire: index * 2 + 2 };
}

/** First `aom.action` index used by storage actions of an industrial type. */
export function storageActionBase(type: BuildingType): number {
  return type.jobs.length * 2 + 1;
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
