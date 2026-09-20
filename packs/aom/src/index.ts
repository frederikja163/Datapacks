import {
  Datapack,
  anchors,
  anchorOf,
  defineUninstall,
  findAnchorAt,
  gamerule,
  latestVersion,
  nbt,
  objectiveAdd,
  randomValue,
  scheduleFunction,
  score,
  snbt,
  summonAnchor,
  text,
  tellraw,
  triggerDispatch,
  waxSign,
  type Color,
  type FunctionRef,
  type Lines,
  type TextComponent,
} from "../../../mcgen/src/index.ts";
import { GUIDE } from "./guide.ts";
import {
  CATEGORY_TITLES,
  TREE,
  TREE_BACKGROUND,
  TREE_BUILDINGS,
  TREE_STATIC,
} from "./tree.ts";
import {
  BUILDINGS,
  BUILD_MENU_BUILDINGS,
  CONFIRM_ACTION,
  RESOURCES,
  STORAGE_AMOUNTS,
  TOWNHALL_ACTIONS,
  WOODS,
  buildingResources,
  deleteAction,
  fireAction,
  gatedRecipes,
  generationJobs,
  hireAction,
  planExtras,
  planRecipe,
  populationAction,
  recipeRequirements,
  storageAction,
  storageJobs,
  unlockRecipes,
  unlocks,
  type BuildingType,
  type Resource,
} from "./registry.ts";

const MARKER_ANCHOR = anchors();
const SIGN_BLOCK = "#minecraft:signs";
const READY_TAG = "aom_ready";
const RAY_OBJECTIVE = "aom.players.ray";

// One colour per concept, used by every sign, menu and chat page.
const WORKER_COLOR: Color = "aqua";
const VILLAGER_COLOR: Color = "light_purple";

const ACTION_CODE = 1000;
const DEBUG_CODE = 3000;
const STORAGE_PER_PAGE = 3;
const STORAGE_PAGE_PREV = 800;
const STORAGE_PAGE_NEXT = 801;
const BUILD_PAGE_PREV = 900;
const BUILD_PAGE_NEXT = 901;
const BUILD_PAGE_SIZE = 8;

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

interface Plan {
  readonly id: string;
  readonly label: string;
  readonly lore: string;
  readonly extras: readonly string[];
}

const PLANS: readonly Plan[] = BUILDINGS.map((type) => ({
  id: type.id,
  label: `${type.label} Plan`,
  lore: `Craft, then place a sign to build a ${type.label.toLowerCase()}`,
  extras: [...planExtras(type)],
}));

const planById = (id: string): Plan => {
  const plan = PLANS.find((entry) => entry.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
};

const planComponents = (plan: Plan): Record<string, unknown> => ({
  "minecraft:custom_data": { aom: { plan: plan.id } },
  "minecraft:custom_name": { text: plan.label, color: "gold", italic: false },
  "minecraft:lore": [{ text: plan.lore, color: "gray", italic: false }],
});

const planItem = (plan: Plan): string =>
  JSON.stringify({
    id: "minecraft:oak_sign",
    count: 1,
    components: planComponents(plan),
  });

/** The same plan as a `/give` item argument (`oak_sign[component=...]`). */
const planItemArgument = (plan: Plan): string => {
  const parts = Object.entries(planComponents(plan)).map(
    ([key, value]) => `${key}=${JSON.stringify(value)}`,
  );
  return `minecraft:oak_sign[${parts.join(",")}]`;
};

const townhallPlanItem = planItem(planById("townhall"));
const SIGN_ITEMS = WOODS.map((wood) => wood.sign);

// ---------------------------------------------------------------------------
// Recipe gating model
// ---------------------------------------------------------------------------

const UNLOCK_INFO = unlocks();
const RECIPE_REQ = recipeRequirements();
const ALL_GATED = gatedRecipes();

const recipeKey = (id: string): string => id.replace(/[^a-zA-Z0-9]+/g, "_");

interface RecipeGroup {
  readonly key: string;
  readonly requires: readonly string[];
  readonly recipes: readonly string[];
}

const groupMap = new Map<string, RecipeGroup>();
for (const recipe of ALL_GATED) {
  const requires = [...(RECIPE_REQ.get(recipe) ?? [])].sort();
  const key = requires.length ? requires.map(recipeKey).join("_") : "always";
  const group = groupMap.get(key) ?? { key, requires, recipes: [] };
  (group.recipes as string[]).push(recipe);
  groupMap.set(key, group);
}
const GROUPS = [...groupMap.values()];
const TOWN_RECIPES = GROUPS.filter((group) => group.requires.length > 0);
const STARTER_RECIPES = GROUPS.filter((group) => group.requires.length === 0);

const JOB_IDS = [
  ...new Set(BUILDINGS.flatMap((type) => type.jobs.map((job) => job.id))),
];
const MECHANIC_IDS = [
  ...new Set(
    BUILDINGS.flatMap((type) =>
      type.jobs
        .filter((job) => job.kind === "mechanic" && job.mechanic !== "leveller")
        .map((job) => job.id),
    ),
  ),
];
const POPULATIONS = BUILDINGS.filter((type) => type.population);

const err = (target: string, message: string): string =>
  tellraw(target, [text(message, { color: "red" })]);

const menuButton = (
  label: string,
  command: string,
  hover?: string,
  color: Color = "green",
) =>
  text(`[${label}]`, {
    color,
    click_event: {
      action: "run_command",
      command: command.startsWith("/") ? command : `/${command}`,
    },
    hover_event: { action: "show_text", value: hover ?? label },
  });

export function build(): Datapack {
  const d = new Datapack(
    "aom",
    latestVersion(),
    "Age of Minecraft — found and grow a town.",
  );

  // -------------------------------------------------------------------------
  // Internal: player identity, clearing, giving
  // -------------------------------------------------------------------------

  const playerKeyFormat = d.defineFunction("internal/player_key/format", [
    `$data modify storage aom:tmp player_key set value "$(0)_$(1)_$(2)_$(3)"`,
  ]);

  const playerKey = d.defineFunction("internal/player_key", [
    "data modify storage aom:tmp key.0 set from entity @s UUID[0]",
    "data modify storage aom:tmp key.1 set from entity @s UUID[1]",
    "data modify storage aom:tmp key.2 set from entity @s UUID[2]",
    "data modify storage aom:tmp key.3 set from entity @s UUID[3]",
    `function ${playerKeyFormat.name} with storage aom:tmp key`,
    "data remove storage aom:tmp key",
  ]);

  const internalClear = d.defineFunction("internal/clear", [
    `$execute store result score #cleared aom.tmp run clear @s $(item) $(count)`,
  ]);

  const giveLoop = d.ref("internal/give/loop");
  const giveOne = d.defineFunction("internal/give/one", [`$give @s $(item) $(count)`]);
  d.defineFunction(giveLoop.path, [
    "execute if score #give aom.tmp matches ..0 run return 0",
    "scoreboard players set #chunk aom.tmp 6400",
    "execute if score #give aom.tmp < #chunk aom.tmp run scoreboard players operation #chunk aom.tmp = #give aom.tmp",
    "execute store result storage aom:tmp give.count int 1 run scoreboard players get #chunk aom.tmp",
    `function ${giveOne.name} with storage aom:tmp give`,
    "scoreboard players operation #give aom.tmp -= #chunk aom.tmp",
    `execute if score #give aom.tmp matches 1.. run function ${giveLoop.name}`,
  ]);
  const internalGive = d.defineFunction("internal/give", [
    `$data modify storage aom:tmp give.item set value "$(item)"`,
    `$scoreboard players set #give aom.tmp $(count)`,
    `function ${giveLoop.name}`,
  ]);

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  const refOf = (refs: Map<string, FunctionRef>, id: string): FunctionRef => {
    const ref = refs.get(id);
    if (!ref) throw new Error(`Missing function for ${id}`);
    return ref;
  };

  const typeCommand = (type: BuildingType, command: string): string =>
    `$execute if data storage aom:data towns.$(town).buildings.$(building){type:"${type.id}"} run ${command}`;

  const typeDispatch = (
    types: readonly BuildingType[],
    command: (type: BuildingType) => string,
  ): Lines => types.map((type) => typeCommand(type, command(type)));

  const typeArgs = (extra = ""): string =>
    `{"town":"$(town)","building":$(building)${extra}}`;

  const playerCall = (
    ref: FunctionRef,
    storage = "ctx",
    extra: Lines = [],
  ): Lines => [
    `function ${playerKey.name}`,
    `data remove storage aom:tmp ${storage}`,
    `data modify storage aom:tmp ${storage}.key set from storage aom:tmp player_key`,
    ...extra,
    `function ${ref.name} with storage aom:tmp ${storage}`,
  ];

  const jobScore = (jobId: string): Lines => [
    "scoreboard players set #w aom.tmp 0",
    `$execute store result score #w aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${jobId}`,
  ];

  const capacityFor = (type: BuildingType, res: Resource): Lines => {
    const lines: Lines = ["scoreboard players set #capacity aom.tmp 0"];
    for (const job of storageJobs(type, res.id)) {
      lines.push(
        "scoreboard players set #cap aom.tmp 0",
        `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        `scoreboard players operation #cap aom.tmp *= ${job.capacity ?? 0} aom.tmp`,
        "scoreboard players operation #capacity aom.tmp += #cap aom.tmp",
      );
    }
    return lines;
  };

  const showBuildingMenu = d.ref("ui/menu/show");
  const syncAllRef = d.ref("jobs/unlock/sync_all");
  const discoverScanRef = d.ref("player/discover_scan");

  const syncAllFor = (town: string): string =>
    `$function ${syncAllRef.name} {"town":"${town}"}`;

  const eachAnchor = (command: string): Lines => [
    `execute as ${MARKER_ANCHOR} at @s align xyz run ${command}`,
  ];

  // -------------------------------------------------------------------------
  // Unlocks: town job counts, flags and recipe grants
  // -------------------------------------------------------------------------

  const countRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (!type.jobs.length) continue;
    const lines: Lines = [];
    for (const job of type.jobs) {
      lines.push(
        "scoreboard players set #w aom.tmp 0",
        `$execute store result score #w aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players set #t aom.tmp 0",
        `$execute store result score #t aom.tmp run data get storage aom:data towns.$(town).jobs.${job.id}`,
        "scoreboard players operation #t aom.tmp += #w aom.tmp",
        `$execute store result storage aom:data towns.$(town).jobs.${job.id} int 1 run scoreboard players get #t aom.tmp`,
      );
    }
    countRefs.set(type.id, d.defineFunction(`jobs/count/${type.id}`, lines));
  }

  // Counts are read from the town's stored buildings, not from anchors, so a
  // building in an unloaded chunk still contributes (and still shows up on the
  // advancement page).
  const countBuilding = d.defineFunction(
    "jobs/count/building",
    BUILDINGS.flatMap((type) => {
      const ref = countRefs.get(type.id);
      const mark = typeCommand(
        type,
        `data modify storage aom:data towns.$(town).has.${type.id} set value 1b`,
      );
      if (!ref) return [mark];
      return [
        typeCommand(type, `function ${ref.name} with storage aom:tmp count`),
        mark,
      ];
    }),
  );

  const countLoopRef = d.ref("jobs/count/loop");
  d.defineFunction(countLoopRef.path, [
    "execute if score #i aom.tmp > #max aom.tmp run return 0",
    "execute store result storage aom:tmp count.building int 1 run scoreboard players get #i aom.tmp",
    `function ${countBuilding.name} with storage aom:tmp count`,
    "scoreboard players add #i aom.tmp 1",
    `function ${countLoopRef.name}`,
  ]);

  const count = d.defineFunction("jobs/count", [
    ...JOB_IDS.map(
      (id) => `$data modify storage aom:data towns.$(town).jobs.${id} set value 0`,
    ),
    ...BUILDINGS.map(
      (type) => `$data remove storage aom:data towns.$(town).has.${type.id}`,
    ),
    "scoreboard players set #i aom.tmp 1",
    "scoreboard players set #max aom.tmp 0",
    `$execute store result score #max aom.tmp run scoreboard players get $(town) aom.build_acc`,
    `$data modify storage aom:tmp count.town set value "$(town)"`,
    `function ${countLoopRef.name}`,
  ]);

  const activeLines: Lines = [];
  for (const info of UNLOCK_INFO.values()) {
    activeLines.push(
      "scoreboard players set #c aom.tmp 0",
      `$execute store result score #c aom.tmp run data get storage aom:data towns.$(town).jobs.${info.id}`,
      `$execute if score #c aom.tmp matches ${info.required}.. run data modify storage aom:data towns.$(town).unlocks.${info.id} set value 1b`,
      `$execute unless score #c aom.tmp matches ${info.required}.. run data remove storage aom:data towns.$(town).unlocks.${info.id}`,
    );
  }
  for (const id of MECHANIC_IDS) {
    activeLines.push(
      "scoreboard players set #c aom.tmp 0",
      `$execute store result score #c aom.tmp run data get storage aom:data towns.$(town).jobs.${id}`,
      `$execute if score #c aom.tmp matches 1.. run data modify storage aom:data towns.$(town).mechanics.${id} set value 1b`,
      `$execute unless score #c aom.tmp matches 1.. run data remove storage aom:data towns.$(town).mechanics.${id}`,
    );
  }
  const computeActive = d.defineFunction("jobs/unlock/active", activeLines);

  // The advancement page: one node per building, granted while the town has
  // that building. Root and category nodes are always granted.
  for (const node of TREE) {
    const building = BUILDINGS.find((entry) => entry.id === node.id);
    const title =
      node.kind === "root"
        ? "Age of Minecraft"
        : node.kind === "category"
          ? CATEGORY_TITLES[node.id]!
          : building!.label;
    const description =
      node.kind === "root"
        ? "The buildings your town has made."
        : node.kind === "category"
          ? `The ${CATEGORY_TITLES[node.id]} buildings.`
          : building!.description;
    d.advancement(`tree/${node.id}`, {
      ...(node.parent ? { parent: `aom:tree/${node.parent}` } : {}),
      display: {
        icon: { id: node.icon },
        title,
        description,
        frame: node.frame,
        show_toast: false,
        announce_to_chat: false,
        hidden: false,
        ...(node.kind === "root" ? { background: TREE_BACKGROUND } : {}),
      },
      criteria: { always: { trigger: "minecraft:impossible" } },
    });
  }

  // Grant/revoke the building advancements for the whole town.
  const advSync = d.defineFunction(
    "jobs/adv/sync",
    TREE_BUILDINGS.flatMap((node) => [
      `$execute if data storage aom:data towns.$(town).has.${node.id} unless data storage aom:data towns.$(town).adv.${node.id} as @a[tag=aom_member_$(town)] run advancement grant @s only aom:tree/${node.id}`,
      `$execute if data storage aom:data towns.$(town).has.${node.id} run data modify storage aom:data towns.$(town).adv.${node.id} set value 1b`,
      `$execute unless data storage aom:data towns.$(town).has.${node.id} if data storage aom:data towns.$(town).adv.${node.id} as @a[tag=aom_member_$(town)] run advancement revoke @s only aom:tree/${node.id}`,
      `$execute unless data storage aom:data towns.$(town).has.${node.id} run data remove storage aom:data towns.$(town).adv.${node.id}`,
    ]),
  );

  const grantBuildings = d.defineFunction(
    "jobs/grant/buildings",
    TREE_BUILDINGS.map(
      (node) =>
        `$execute if data storage aom:data towns.$(town).has.${node.id} run advancement grant @s only aom:tree/${node.id}`,
    ),
  );

  // One hidden advancement per recipe group. Granting it hands out the whole
  // group in a single command; the town's buildings decide when it is granted.
  for (const group of GROUPS) {
    d.advancement(`unlock/${group.key}`, {
      criteria: { always: { trigger: "minecraft:impossible" } },
      rewards: { recipes: [...group.recipes] },
    });
  }

  const grantSync = d.defineFunction(
    "jobs/grant/sync",
    GROUPS.flatMap((group) => {
      const lines: Lines = ["scoreboard players set #ok aom.tmp 1"];
      for (const requirement of group.requires) {
        lines.push(
          `$execute unless data storage aom:data towns.$(town).unlocks.${requirement} run scoreboard players set #ok aom.tmp 0`,
        );
      }
      lines.push(
        `$execute if score #ok aom.tmp matches 1 unless data storage aom:data towns.$(town).granted.${group.key} as @a[tag=aom_member_$(town)] run advancement grant @s only aom:unlock/${group.key}`,
        `$execute if score #ok aom.tmp matches 1 run data modify storage aom:data towns.$(town).granted.${group.key} set value 1b`,
        ...group.recipes.map(
          (recipe) =>
            `$execute if score #ok aom.tmp matches 0 if data storage aom:data towns.$(town).granted.${group.key} as @a[tag=aom_member_$(town)] run recipe take @s ${recipe}`,
        ),
        `$execute if score #ok aom.tmp matches 0 if data storage aom:data towns.$(town).granted.${group.key} as @a[tag=aom_member_$(town)] run advancement revoke @s only aom:unlock/${group.key}`,
        `$execute if score #ok aom.tmp matches 0 run data remove storage aom:data towns.$(town).granted.${group.key}`,
      );
      return lines;
    }),
  );

  const grantPlayer = d.defineFunction(
    "jobs/grant/player",
    GROUPS.flatMap((group) => {
      const lines: Lines = ["scoreboard players set #ok aom.tmp 1"];
      for (const requirement of group.requires) {
        lines.push(
          `$execute unless data storage aom:data towns.$(town).unlocks.${requirement} run scoreboard players set #ok aom.tmp 0`,
        );
      }
      lines.push(
        `$execute if score #ok aom.tmp matches 1 run advancement grant @s only aom:unlock/${group.key}`,
      );
      return lines;
    }),
  );

  const clearUnlocks = d.defineFunction("player/clear_unlocks", [
    ...TOWN_RECIPES.flatMap((group) => [
      ...group.recipes.map((recipe) => `recipe take @s ${recipe}`),
      `advancement revoke @s only aom:unlock/${group.key}`,
    ]),
    ...TREE_BUILDINGS.map(
      (node) => `advancement revoke @s only aom:tree/${node.id}`,
    ),
  ]);

  const starter = d.defineFunction("player/starter", [
    `function ${d.ref("player/starter/grant").name}`,
    `tag @s add ${READY_TAG}`,
  ]);
  d.defineFunction("player/starter/grant", [
    ...STARTER_RECIPES.map(
      (group) => `advancement grant @s only aom:unlock/${group.key}`,
    ),
    ...TREE_STATIC.map(
      (node) => `advancement grant @s only aom:tree/${node.id}`,
    ),
  ]);

  const syncAll = d.defineFunction("jobs/unlock/sync_all", [
    `$function ${count.name} {"town":"$(town)"}`,
    `$function ${computeActive.name} {"town":"$(town)"}`,
    `$function ${grantSync.name} {"town":"$(town)"}`,
    `$function ${advSync.name} {"town":"$(town)"}`,
  ]);

  // A complete per-player re-sync: wipe every recipe and advancement this pack
  // can grant, then hand back exactly what the player's town currently has.
  // This keeps old saves working when recipes are added to or removed from a
  // building, and runs on join and on /reload.
  const playerResyncRun = d.defineFunction("player/resync/run", [
    `$execute if data storage aom:data players.$(key).town run data modify storage aom:tmp resync.town set from storage aom:data players.$(key).town`,
    ...ALL_GATED.map((recipe) => `recipe take @s ${recipe}`),
    ...GROUPS.map((group) => `advancement revoke @s only aom:unlock/${group.key}`),
    ...TREE.map((node) => `advancement revoke @s only aom:tree/${node.id}`),
    ...STARTER_RECIPES.map(
      (group) => `advancement grant @s only aom:unlock/${group.key}`,
    ),
    ...TREE_STATIC.map(
      (node) => `advancement grant @s only aom:tree/${node.id}`,
    ),
    `execute if data storage aom:tmp resync.town run function ${grantPlayer.name} with storage aom:tmp resync`,
    `execute if data storage aom:tmp resync.town run function ${grantBuildings.name} with storage aom:tmp resync`,
  ]);
  const playerResync = d.defineFunction("player/resync", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp resync",
    "data modify storage aom:tmp resync.key set from storage aom:tmp player_key",
    `function ${playerResyncRun.name} with storage aom:tmp resync`,
  ]);

  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  const resolveDiscovery = d.defineFunction("jobs/discover/resolve", [
    "data remove storage aom:tmp disc2",
    `$data modify storage aom:tmp disc2.town set from storage aom:data players.$(key).town`,
    `$data modify storage aom:tmp disc2.key set value "$(key)"`,
    `$data modify storage aom:tmp disc2.resource set value "$(resource)"`,
    `execute if data storage aom:tmp disc2.town run function ${d.ref("jobs/discover/apply").name} with storage aom:tmp disc2`,
  ]);

  const applyDiscovery = d.defineFunction("jobs/discover/apply", [
    `$execute if data storage aom:data towns.$(town).discovered.$(resource) run return 0`,
    `$data modify storage aom:data towns.$(town).discovered.$(resource) set value 1b`,
    `$tellraw @a[tag=aom_member_$(town)] ${snbt([
      text("Discovered ", { color: "green" }),
      text("$(resource)", { color: "aqua" }),
      text("; its storage can now be hired.", { color: "green" }),
    ])}`,
  ]);

  for (const res of RESOURCES) {
    d.advancement(`discover/${res.id}`, {
      criteria: {
        has: {
          trigger: "minecraft:inventory_changed",
          conditions: { items: [{ items: [res.item] }] },
        },
      },
      rewards: { function: d.ref(`jobs/discover/${res.id}/run`).name },
    });
    d.defineFunction(`jobs/discover/${res.id}/run`, [
      `function ${playerKey.name}`,
      "data remove storage aom:tmp disc",
      "data modify storage aom:tmp disc.key set from storage aom:tmp player_key",
      `data modify storage aom:tmp disc.resource set value "${res.id}"`,
      `function ${resolveDiscovery.name} with storage aom:tmp disc`,
    ]);
  }

  const discoverScan = d.defineFunction(
    "player/discover_scan",
    RESOURCES.flatMap((res) => [
      "scoreboard players set #held aom.tmp 0",
      `execute store result score #held aom.tmp run clear @s ${res.item} 0`,
      `$execute if score #held aom.tmp matches 1.. run data modify storage aom:data towns.$(town).discovered.${res.id} set value 1b`,
    ]),
  );

  // -------------------------------------------------------------------------
  // Player helpers
  // -------------------------------------------------------------------------

  const playerDetachExec = d.defineFunction("player/detach/exec", [
    `$data remove storage aom:data players.$(key).town`,
    `$tag @s remove aom_member_$(town)`,
    `function ${clearUnlocks.name}`,
  ]);

  const playerDetach = d.defineFunction("player/detach", [
    "data remove storage aom:tmp det",
    `$data modify storage aom:tmp det.town set value "$(town)"`,
    `function ${playerKey.name}`,
    "data modify storage aom:tmp det.key set from storage aom:tmp player_key",
    `function ${playerDetachExec.name} with storage aom:tmp det`,
  ]);

  const playerJoinSync = d.defineFunction("player/join/sync", [
    `$execute unless data storage aom:data towns.$(town) run function ${clearUnlocks.name}`,
    `$execute unless data storage aom:data towns.$(town) run data remove storage aom:data players.$(key).town`,
    `$execute unless data storage aom:data towns.$(town) run return 0`,
    `$tag @s add aom_member_$(town)`,
    `$function ${syncAllRef.name} {"town":"$(town)"}`,
    `function ${playerResync.name}`,
    `function ${discoverScan.name} with storage aom:tmp join`,
  ]);

  const playerJoinDispatch = d.defineFunction("player/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run return 0`,
    `$data modify storage aom:tmp join.town set from storage aom:data players.$(key).town`,
    `data modify storage aom:tmp join.key set from storage aom:tmp player_key`,
    `function ${playerJoinSync.name} with storage aom:tmp join`,
  ]);

  const playerJoin = d.defineFunction("player/join", [
    "scoreboard players set @s aom.left 0",
    ...playerCall(playerJoinDispatch, "join"),
  ]);

  // -------------------------------------------------------------------------
  // Hiring
  // -------------------------------------------------------------------------

  const unemployedGuard: Lines = [
    "$scoreboard players operation #u aom.tmp = $(town) aom.population",
    "$scoreboard players operation #u aom.tmp -= $(town) aom.employed",
    `execute if score #u aom.tmp matches ..0 run ${err("@s", "You have no unemployed villagers.")}`,
    "execute if score #u aom.tmp matches ..0 run return fail",
  ];

  const hireRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    for (const job of type.jobs) {
      const lines: Lines = [...unemployedGuard];

      if (job.kind === "unlock") {
        const required = job.required ?? 1;
        lines.push(
          ...jobScore(job.id),
          `execute if score #w aom.tmp matches ${required}.. run ${err("@s", "This job is already staffed.")}`,
          `execute if score #w aom.tmp matches ${required}.. run return fail`,
          "scoreboard players add #w aom.tmp 1",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
          `$scoreboard players add $(town) aom.employed 1`,
          `$function ${syncAllRef.name} {"town":"$(town)"}`,
        );
      } else if (job.kind === "mechanic") {
        if (job.mechanic === "portal") {
          lines.push(
            ...jobScore(job.id),
            `execute if score #w aom.tmp matches 1.. run ${err("@s", "This job is already staffed.")}`,
            "execute if score #w aom.tmp matches 1.. run return fail",
          );
        }
        lines.push(
          "scoreboard players set #w aom.tmp 0",
          `$execute store result score #w aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          "scoreboard players add #w aom.tmp 1",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
          `$scoreboard players add $(town) aom.employed 1`,
          "scoreboard players set #t aom.tmp 0",
          `$execute store result score #t aom.tmp run data get storage aom:data towns.$(town).jobs.${job.id}`,
          "scoreboard players add #t aom.tmp 1",
          `$execute store result storage aom:data towns.$(town).jobs.${job.id} int 1 run scoreboard players get #t aom.tmp`,
          `$function ${syncAllRef.name} {"town":"$(town)"}`,
        );
      } else {
        if (job.resource) {
          lines.push(
            `$execute unless data storage aom:data towns.$(town).discovered.${job.resource} run ${err("@s", "You have not discovered this resource yet.")}`,
            `$execute unless data storage aom:data towns.$(town).discovered.${job.resource} run return fail`,
          );
        }
        if (job.table) {
          const known = job.table.filter((entry) => entry.resource);
          lines.push("scoreboard players set #disc aom.tmp 0");
          for (const entry of known) {
            lines.push(
              `$execute if data storage aom:data towns.$(town).discovered.${entry.resource} run scoreboard players set #disc aom.tmp 1`,
            );
          }
          lines.push(
            `execute if score #disc aom.tmp matches 0 run ${err("@s", "You have not discovered any of these resources yet.")}`,
            "execute if score #disc aom.tmp matches 0 run return fail",
          );
        }
        lines.push(
          ...jobScore(job.id),
          "scoreboard players add #w aom.tmp 1",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
          `$scoreboard players add $(town) aom.employed 1`,
        );
      }

      hireRefs.set(
        `${type.id}/${job.id}`,
        d.defineFunction(`jobs/hire/${type.id}/${job.id}`, lines),
      );
    }
  }

  // Firing: only buildings with `fire: true` (the Custom building) can dismiss
  // a worker. It undoes one hire, refunding the villager.
  const fireRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (!type.fire) continue;
    for (const job of type.jobs) {
      fireRefs.set(
        `${type.id}/${job.id}`,
        d.defineFunction(`jobs/fire/${type.id}/${job.id}`, [
          "scoreboard players set #w aom.tmp 0",
          `$execute store result score #w aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `execute if score #w aom.tmp matches ..0 run ${err("@s", "There is no one to fire.")}`,
          "execute if score #w aom.tmp matches ..0 run return fail",
          "scoreboard players remove #w aom.tmp 1",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
          `$scoreboard players remove $(town) aom.employed 1`,
          `$function ${syncAllRef.name} {"town":"$(town)"}`,
        ]),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  const intervalMatches = (interval: number): string | null => {
    if (interval <= 1) return null;
    const values: number[] = [];
    for (let value = 0; value < 20; value += interval) values.push(value);
    return values.join(",");
  };

  const generatingRefs = new Map<string, FunctionRef>();
  const generateRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    const resources = buildingResources(type);
    if (!resources.length) continue;

    const main: Lines = [];

    for (const job of type.jobs) {
      if (job.kind !== "generation") continue;

      if (job.table) {
        const giveRefs = new Map<string, FunctionRef>();
        for (const entry of job.table) {
          if (!entry.resource) continue;
          const res = resources.find((candidate) => candidate.id === entry.resource);
          if (!res) continue;
          giveRefs.set(
            res.id,
            d.defineFunction(`jobs/generate/${type.id}/${job.id}/give/${res.id}`, [
              ...capacityFor(type, res),
              `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run data modify storage aom:data towns.$(town).buildings.$(building).storage.${res.id} set value 0`,
              "scoreboard players set #stored aom.tmp 0",
              `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
              "execute if score #stored aom.tmp < #capacity aom.tmp run scoreboard players add #stored aom.tmp 1",
              `$execute if data storage aom:data towns.$(town).discovered.${res.id} store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #stored aom.tmp`,
            ]),
          );
        }

        const total = job.table.reduce((sum, entry) => sum + entry.weight, 0);
        let low = 1;
        const ranges: Lines = [];
        for (const entry of job.table) {
          const high = low + entry.weight - 1;
          if (entry.resource && giveRefs.has(entry.resource)) {
            ranges.push(
              `$execute if score #roll aom.tmp matches ${low}..${high} run function ${refOf(giveRefs, entry.resource).name} ${typeArgs()}`,
            );
          }
          low = high + 1;
        }

        const rollRef = d.defineFunction(`jobs/generate/${type.id}/${job.id}/roll`, [
          "execute if score #left aom.tmp matches ..0 run return 0",
          "scoreboard players remove #left aom.tmp 1",
          `execute store result score #roll aom.tmp run ${randomValue(`1..${total}`)}`,
          ...ranges,
          `$function ${d.ref(`jobs/generate/${type.id}/${job.id}/roll`).name} ${typeArgs()}`,
        ]);

        const startRef = d.defineFunction(`jobs/generate/${type.id}/${job.id}/start`, [
          "scoreboard players set #left aom.tmp 0",
          `$execute store result score #left aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `$function ${rollRef.name} ${typeArgs()}`,
        ]);

        const match = intervalMatches(job.interval ?? 1);
        main.push(
          match
            ? `$execute if score #min aom.tmp matches ${match} run function ${startRef.name} ${typeArgs()}`
            : `$function ${startRef.name} ${typeArgs()}`,
        );
        generatingRefs.set(`${type.id}/${job.id}`, startRef);
        continue;
      }

      if (!job.resource) continue;
      const res = resources.find((candidate) => candidate.id === job.resource);
      if (!res) continue;

      const ref = d.defineFunction(`jobs/generate/${type.id}/${job.id}`, [
        "scoreboard players set #workers aom.tmp 0",
        `$execute store result score #workers aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        ...capacityFor(type, res),
        `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run data modify storage aom:data towns.$(town).buildings.$(building).storage.${res.id} set value 0`,
        "scoreboard players set #stored aom.tmp 0",
        `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        "scoreboard players operation #new aom.tmp = #stored aom.tmp",
        "scoreboard players operation #new aom.tmp += #workers aom.tmp",
        "execute if score #new aom.tmp > #capacity aom.tmp run scoreboard players operation #new aom.tmp = #capacity aom.tmp",
        `$execute if score #workers aom.tmp matches 1.. if data storage aom:data towns.$(town).discovered.${res.id} store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #new aom.tmp`,
      ]);
      generatingRefs.set(`${type.id}/${job.id}`, ref);

      const match = intervalMatches(job.interval ?? 1);
      main.push(
        match
          ? `$execute if score #min aom.tmp matches ${match} run function ${ref.name} ${typeArgs()}`
          : `$function ${ref.name} ${typeArgs()}`,
      );
    }

    generateRefs.set(
      type.id,
      d.defineFunction(`jobs/generate/${type.id}`, main),
    );
  }

  const generateDispatch = d.defineFunction(
    "jobs/generate/dispatch",
    BUILDINGS.flatMap((type) => {
      const ref = generateRefs.get(type.id);
      if (!ref) return [];
      return [typeCommand(type, `function ${ref.name} with storage aom:tmp anchor`)];
    }),
  );

  const generateOne = d.defineFunction("jobs/generate/one", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${generateDispatch.name} with storage aom:tmp anchor`,
  ]);

  const minute = d.defineFunction("minute", [
    "scoreboard players add #min aom.tmp 1",
    "execute if score #min aom.tmp matches 20.. run scoreboard players set #min aom.tmp 0",
    ...eachAnchor(`function ${generateOne.name}`),
  ]);

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  const depositRefs = new Map<string, FunctionRef>();
  const withdrawRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    for (const res of buildingResources(type)) {
      depositRefs.set(
        `${type.id}/${res.id}`,
        d.defineFunction(`storage/deposit/${type.id}/${res.id}`, [
          `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
          `$execute unless data storage aom:data towns.$(town).discovered.${res.id} run ${err("@s", "You have not discovered this resource yet.")}`,
          `$execute unless data storage aom:data towns.$(town).discovered.${res.id} run return fail`,
          `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run data modify storage aom:data towns.$(town).buildings.$(building).storage.${res.id} set value 0`,
          ...capacityFor(type, res),
          "scoreboard players set #stored aom.tmp 0",
          `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
          "scoreboard players operation #space aom.tmp = #capacity aom.tmp",
          "scoreboard players operation #space aom.tmp -= #stored aom.tmp",
          "scoreboard players set #held aom.tmp 0",
          `execute store result score #held aom.tmp run clear @s ${res.item} 0`,
          `$scoreboard players set #take aom.tmp $(amount)`,
          "execute if score #space aom.tmp < #take aom.tmp run scoreboard players operation #take aom.tmp = #space aom.tmp",
          "execute if score #held aom.tmp < #take aom.tmp run scoreboard players operation #take aom.tmp = #held aom.tmp",
          `execute if score #take aom.tmp matches ..0 run ${err("@s", "Nothing can be deposited.")}`,
          "execute if score #take aom.tmp matches ..0 run return fail",
          "execute store result storage aom:tmp do.count int 1 run scoreboard players get #take aom.tmp",
          `data modify storage aom:tmp do.item set value "${res.item}"`,
          "scoreboard players set #cleared aom.tmp 0",
          `execute if score #take aom.tmp matches 1.. run function ${internalClear.name} with storage aom:tmp do`,
          "scoreboard players operation #stored aom.tmp += #cleared aom.tmp",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #stored aom.tmp`,
        ]),
      );

      withdrawRefs.set(
        `${type.id}/${res.id}`,
        d.defineFunction(`storage/withdraw/${type.id}/${res.id}`, [
          `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run tellraw @s ${snbt([text("There is nothing to withdraw.", { color: "red" })])}`,
          `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run return fail`,
          "scoreboard players set #stored aom.tmp 0",
          `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
          `$scoreboard players set #take aom.tmp $(amount)`,
          "execute if score #stored aom.tmp < #take aom.tmp run scoreboard players operation #take aom.tmp = #stored aom.tmp",
          `execute if score #take aom.tmp matches ..0 run ${err("@s", "There is nothing to withdraw.")}`,
          "execute if score #take aom.tmp matches ..0 run return fail",
          "execute store result storage aom:tmp do.count int 1 run scoreboard players get #take aom.tmp",
          `data modify storage aom:tmp do.item set value "${res.item}"`,
          `execute if score #take aom.tmp matches 1.. run function ${internalGive.name} with storage aom:tmp do`,
          "scoreboard players operation #stored aom.tmp -= #take aom.tmp",
          `$execute store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #stored aom.tmp`,
        ]),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Building summaries (shared by sign, chat and menus)
  // -------------------------------------------------------------------------

  const summaryRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (type.townhall) continue;
    const lines: Lines = [];
    lines.push(
      "scoreboard players set #employed aom.tmp 0",
      "scoreboard players set #unlocked aom.tmp 0",
      "scoreboard players set #unlock_total aom.tmp 0",
    );
    for (const job of type.jobs) {
      lines.push(
        `data modify storage aom:tmp summary.workers_${job.id} set value 0`,
        `$execute store result storage aom:tmp summary.workers_${job.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players set #cap aom.tmp 0",
        `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players operation #employed aom.tmp += #cap aom.tmp",
      );
      if (job.kind === "unlock") {
        lines.push(
          "scoreboard players add #unlock_total aom.tmp 1",
          `execute if score #cap aom.tmp matches ${job.required ?? 1}.. run scoreboard players add #unlocked aom.tmp 1`,
        );
      }
    }
    lines.push(
      "execute store result storage aom:tmp summary.employed int 1 run scoreboard players get #employed aom.tmp",
      "execute store result storage aom:tmp summary.unlocked int 1 run scoreboard players get #unlocked aom.tmp",
      "execute store result storage aom:tmp summary.unlock_total int 1 run scoreboard players get #unlock_total aom.tmp",
    );
    for (const res of buildingResources(type)) {
      lines.push(
        `data modify storage aom:tmp summary.stored_${res.id} set value 0`,
        `$execute store result storage aom:tmp summary.stored_${res.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        `data modify storage aom:tmp summary.capacity_${res.id} set value 0`,
        ...capacityFor(type, res),
        `execute store result storage aom:tmp summary.capacity_${res.id} int 1 run scoreboard players get #capacity aom.tmp`,
        `data modify storage aom:tmp summary.discovered_${res.id} set value "locked"`,
        `$execute if data storage aom:data towns.$(town).discovered.${res.id} run data modify storage aom:tmp summary.discovered_${res.id} set value "open"`,
      );
    }
    if (type.population) {
      lines.push(
        `data modify storage aom:tmp summary.villagers set value 0`,
        `$execute store result storage aom:tmp summary.villagers int 1 run data get storage aom:data towns.$(town).buildings.$(building).villagers`,
      );
    }
    summaryRefs.set(type.id, d.defineFunction(`ui/summary/load/${type.id}`, lines));
  }

  summaryRefs.set(
    "townhall",
    d.defineFunction("ui/summary/load/townhall", [
      `data modify storage aom:tmp summary.population set value 0`,
      `$execute store result storage aom:tmp summary.population int 1 run scoreboard players get $(town) aom.population`,
      `data modify storage aom:tmp summary.members set value 0`,
      `$execute store result storage aom:tmp summary.members int 1 run scoreboard players get $(town) aom.members`,
      `data modify storage aom:tmp summary.unemployed set value 0`,
      "scoreboard players set #u aom.tmp 0",
      `$scoreboard players operation #u aom.tmp = $(town) aom.population`,
      `$scoreboard players operation #u aom.tmp -= $(town) aom.employed`,
      `execute store result storage aom:tmp summary.unemployed int 1 run scoreboard players get #u aom.tmp`,
    ]),
  );

  const summaryLoad = d.defineFunction("ui/summary/load", [
    "data remove storage aom:tmp summary",
    `$data modify storage aom:tmp summary.town set value "$(town)"`,
    `$data modify storage aom:tmp summary.building set value $(building)`,
    ...typeDispatch(
      BUILDINGS,
      (type) =>
        `function ${refOf(summaryRefs, type.id).name} {"town":"$(town)","building":$(building)}`,
    ),
  ]);

  // -------------------------------------------------------------------------
  // Sign rendering
  // -------------------------------------------------------------------------

  const renderSignRefs = new Map<string, FunctionRef>();
  renderSignRefs.set(
    "townhall",
    d.defineFunction("ui/render_sign/townhall", [
      `$data modify block ~ ~ ~ front_text.messages set value ${snbt([
        text("Townhall", { color: "gold", bold: true }),
        text("Unemployed: $(unemployed)", { color: WORKER_COLOR }),
        text("Population: $(population)", { color: VILLAGER_COLOR }),
        text("$(town)", { color: "green" }),
      ])}`,
    ]),
  );

  for (const type of BUILDINGS) {
    if (type.townhall) continue;
    const header = text(type.label, { color: "gold", bold: true });
    const town = text("$(town)", { color: "green" });
    if (type.population && type.jobs.length) {
      // Custom: workers on line 2, villagers on line 3.
      renderSignRefs.set(
        type.id,
        d.defineFunction(`ui/render_sign/${type.id}`, [
          `$data modify block ~ ~ ~ front_text.messages set value ${snbt([
            header,
            text("Workers: $(employed)", { color: WORKER_COLOR }),
            text("Villagers: $(villagers)", { color: VILLAGER_COLOR }),
            town,
          ])}`,
        ]),
      );
      continue;
    }
    if (type.population) {
      // Townhouse: no workers, so villagers sit on line 3.
      renderSignRefs.set(
        type.id,
        d.defineFunction(`ui/render_sign/${type.id}`, [
          `$data modify block ~ ~ ~ front_text.messages set value ${snbt([
            header,
            text("", { color: "gray" }),
            text("Villagers: $(villagers)", { color: VILLAGER_COLOR }),
            town,
          ])}`,
        ]),
      );
      continue;
    }
    renderSignRefs.set(
      type.id,
      d.defineFunction(`ui/render_sign/${type.id}`, [
        `$data modify block ~ ~ ~ front_text.messages set value ${snbt([
          header,
          text("Workers: $(employed)", { color: WORKER_COLOR }),
          text("Unlocked: $(unlocked)/$(unlock_total)", { color: "yellow" }),
          town,
        ])}`,
      ]),
    );
  }

  const renderSignsDispatch = d.defineFunction("ui/render_signs/dispatch", [
    ...BUILDINGS.flatMap((type) => [
      typeCommand(
        type,
        `function ${summaryLoad.name} {"town":"$(town)","building":$(building)}`,
      ),
      typeCommand(
        type,
        `function ${refOf(renderSignRefs, type.id).name} with storage aom:tmp summary`,
      ),
    ]),
  ]);

  const renderSignsType = d.defineFunction("ui/render_signs/type", [
    `$data modify entity @s data.aom.type set from storage aom:data towns.$(town).buildings.$(building).type`,
  ]);

  const renderSignsAnchor = d.defineFunction("ui/render_signs/anchor", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute unless block ~ ~ ~ " + SIGN_BLOCK + " run return fail",
    "data modify block ~ ~ ~ front_text.has_glowing_text set value true",
    "data modify block ~ ~ ~ front_text.has_glowing_text set value false",
    `execute if data storage aom:tmp anchor unless data entity @s data.aom.type run function ${renderSignsType.name} with storage aom:tmp anchor`,
    `execute if data storage aom:tmp anchor run function ${renderSignsDispatch.name} with storage aom:tmp anchor`,
  ]);

  const renderSigns = d.defineFunction(
    "ui/render_signs",
    eachAnchor(`function ${renderSignsAnchor.name}`),
  );

  // -------------------------------------------------------------------------
  // Chat pages
  // -------------------------------------------------------------------------

  const chatLineRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    let parts: TextComponent[];
    if (type.townhall) {
      parts = [
        text(`\n${type.label} #$(building)`, { color: "white" }),
        text(" · Population ", { color: "gray" }),
        text("$(population)", { color: VILLAGER_COLOR }),
      ];
    } else if (type.population && !type.jobs.length) {
      parts = [
        text(`\n${type.label} #$(building)`, { color: "white" }),
        text(" · Villagers ", { color: "gray" }),
        text("$(villagers)", { color: VILLAGER_COLOR }),
      ];
    } else {
      parts = [
        text(`\n${type.label} #$(building)`, { color: "white" }),
        ...type.jobs.flatMap((job) => [
          text(` · ${job.label} `, { color: "gray" }),
          text(`$(workers_${job.id})`, { color: WORKER_COLOR }),
        ]),
        ...buildingResources(type).flatMap((res) => [
          text(` · ${res.label} `, { color: "gray" }),
          text(`$(stored_${res.id})/$(capacity_${res.id})`, { color: "aqua" }),
        ]),
      ];
    }
    chatLineRefs.set(
      type.id,
      d.defineFunction(`ui/chat_page/line/${type.id}`, [
        `$data modify storage aom:tmp chat.lines append value ${snbt(parts)}`,
      ]),
    );
  }

  const chatPageAppend = d.defineFunction(
    "ui/chat_page/append",
    typeDispatch(
      BUILDINGS,
      (type) =>
        `function ${refOf(chatLineRefs, type.id).name} with storage aom:tmp summary`,
    ),
  );

  const chatPageAppendLoad = d.defineFunction("ui/chat_page/append/load", [
    `function ${summaryLoad.name} with storage aom:tmp anchor`,
    `function ${chatPageAppend.name} with storage aom:tmp summary`,
  ]);

  const chatPageLine = d.defineFunction("ui/chat_page/line", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${chatPageAppendLoad.name}`,
  ]);

  // -------------------------------------------------------------------------
  // Confirmation
  // -------------------------------------------------------------------------

  const confirmPrompt = d.defineFunction("ui/confirm/prompt", [
    tellraw("@s", [
      text("Are you sure? This cannot be undone.\n", { color: "red" }),
      menuButton("Yes", `trigger aom.menu set ${ACTION_CODE}`, "Confirm", "red"),
      " ",
      text("[Cancel]", {
        color: "gray",
        hover_event: { action: "show_text", value: "Do nothing" },
      }),
    ]),
  ]);

  const confirmExec = d.defineFunction("ui/confirm/exec", [`$function $(fn)`]);

  const confirmDispatch = d.defineFunction("ui/confirm/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.confirm run tellraw @s ${snbt([text("Nothing to confirm.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.confirm run return fail`,
    `$data modify storage aom:tmp confirm.fn set from storage aom:data players.$(key).pending.confirm`,
    `$data remove storage aom:data players.$(key).pending.confirm`,
    `function ${confirmExec.name} with storage aom:tmp confirm`,
  ]);

  const confirmRun = d.defineFunction("ui/confirm/run", [
    "execute unless score @s aom.action matches ..-1 run return fail",
    ...playerCall(confirmDispatch, "confirm"),
  ]);

  // -------------------------------------------------------------------------
  // Town: create, join, leave, delete, villagers, info
  // -------------------------------------------------------------------------

  const townDeleteAnchor = d.defineFunction("town/delete/anchor", [
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  const townDeleteCheck = d.defineFunction("town/delete/check", [
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    `$execute if score $(town) aom.members matches 2.. run tellraw @s ${snbt([text("Only the last member can delete the town.", { color: "red" })])}`,
    `$execute if score $(town) aom.members matches 2.. run return fail`,
    `$execute as @a[tag=aom_member_$(town)] run function ${playerDetach.name} {"town":"$(town)"}`,
    `$kill @e[type=minecraft:interaction,tag=aom_click,nbt={data:{aom:{town:"$(town)"}}}]`,
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] at @s run function ${townDeleteAnchor.name}`,
    `$scoreboard players reset $(town) aom.population`,
    `$scoreboard players reset $(town) aom.employed`,
    `$scoreboard players reset $(town) aom.members`,
    `$scoreboard players reset $(town) aom.build_acc`,
    `$data remove storage aom:data towns.$(town)`,
    `$tellraw @a ${snbt([text("The town of ", { color: "red" }), text("$(town)", { color: "aqua" }), text(" was deleted.", { color: "red" })])}`,
  ]);

  const townDeleteDispatch = d.defineFunction("town/delete/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).town`,
    `function ${townDeleteCheck.name} with storage aom:tmp ctx`,
  ]);

  d.defineFunction("town/delete", playerCall(townDeleteDispatch));

  const townDeletePrompt = d.defineFunction("town/delete/prompt", [
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    `$data modify storage aom:data players.$(key).pending.confirm set value "aom:town/delete"`,
    `function ${confirmPrompt.name}`,
  ]);

  const townLeaveExec = d.defineFunction("town/leave/exec", [
    `$data remove storage aom:data players.$(key).town`,
    `$data remove storage aom:data towns.$(town).members.$(key)`,
    `$tag @s remove aom_member_$(town)`,
    `$execute if data storage aom:data towns.$(town) run scoreboard players remove $(town) aom.members 1`,
    `function ${clearUnlocks.name}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "gray" }, text(" left ", { color: "gray" }), text("$(town)", { color: "aqua" }), text(".", { color: "gray" })])}`,
  ]);

  const townLeaveDispatch = d.defineFunction("town/leave/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).town`,
    `function ${townLeaveExec.name} with storage aom:tmp ctx`,
  ]);

  const townLeave = d.defineFunction("town/leave", playerCall(townLeaveDispatch));

  const townJoinCheck = d.defineFunction("town/join/check", [
    `$execute unless data storage aom:data towns.$(town) run tellraw @s ${snbt([text("This town no longer exists.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town) run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building){type:"townhall"} run return fail`,
    `$execute if data storage aom:data players.$(key).town run function ${townLeave.name}`,
    `$data modify storage aom:data towns.$(town).members.$(key) set value {}`,
    `$data modify storage aom:data players.$(key).town set value "$(town)"`,
    `$scoreboard players add $(town) aom.members 1`,
    `$tag @s add aom_member_$(town)`,
    `$function ${syncAllRef.name} {"town":"$(town)"}`,
    `function ${playerResync.name}`,
    `$function ${discoverScanRef.name} {"town":"$(town)","key":"$(key)"}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "gray" }, text(" joined ", { color: "gray" }), text("$(town)", { color: "aqua" }), text(".", { color: "gray" })])}`,
  ]);

  const townJoinDispatch = d.defineFunction("town/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.town run tellraw @s ${snbt([text("Open the townhall's menu by right-clicking its sign first.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    `function ${townJoinCheck.name} with storage aom:tmp ctx`,
  ]);

  const townJoin = d.defineFunction("town/join", playerCall(townJoinDispatch));

  const townVillager = d.defineFunction("town/villager", [
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building).villagers run data modify storage aom:data towns.$(town).buildings.$(building).villagers set value 1`,
    "scoreboard players set #old aom.tmp 0",
    `$execute store result score #old aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).villagers`,
    "scoreboard players operation #new aom.tmp = #old aom.tmp",
    `execute store result score #delta aom.tmp run data get storage aom:tmp ctx.delta`,
    "scoreboard players operation #new aom.tmp += #delta aom.tmp",
    "execute if score #new aom.tmp matches ..0 run scoreboard players set #new aom.tmp 0",
    "scoreboard players operation #d aom.tmp = #new aom.tmp",
    "scoreboard players operation #d aom.tmp -= #old aom.tmp",
    `$scoreboard players operation $(town) aom.population += #d aom.tmp`,
    `$execute store result storage aom:data towns.$(town).buildings.$(building).villagers int 1 run scoreboard players get #new aom.tmp`,
    `$execute as ${anchorOf({ town: "$(town)", building: "$(building)" })} at @s run function ${renderSignsDispatch.name} {"town":"$(town)","building":$(building)}`,
    `$tellraw @s ${snbt([
      text("Villagers from this building: ", { color: "yellow" }),
      nbt("towns.$(town).buildings.$(building).villagers", { storage: "aom:data" }, { color: "aqua" }),
    ])}`,
  ]);

  // -------------------------------------------------------------------------
  // Town info (chat pages)
  // -------------------------------------------------------------------------

  const infoNavPrev = text("[<] ", {
    color: "green",
    click_event: { action: "run_command", command: "/trigger aom.town_info set 2" },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const infoNavNext = text("[>]", {
    color: "green",
    click_event: { action: "run_command", command: "/trigger aom.town_info set 3" },
    hover_event: { action: "show_text", value: "Next page" },
  });
  const menuNavPrev = text("[<] ", {
    color: "green",
    click_event: {
      action: "run_command",
      command: `/trigger aom.menu set ${ACTION_CODE + TOWNHALL_ACTIONS.pagePrev}`,
    },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const menuNavNext = text("[>]", {
    color: "green",
    click_event: {
      action: "run_command",
      command: `/trigger aom.menu set ${ACTION_CODE + TOWNHALL_ACTIONS.pageNext}`,
    },
    hover_event: { action: "show_text", value: "Next page" },
  });

  const townOverview = d.defineFunction("ui/town/overview", [
    `$scoreboard players operation #u aom.tmp = $(town) aom.population`,
    `$scoreboard players operation #u aom.tmp -= $(town) aom.employed`,
    "scoreboard players set #b aom.tmp 0",
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run scoreboard players add #b aom.tmp 1`,
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" ===\n", { color: "gold" }),
      text("Population: ", { color: "gray" }),
      score("$(town)", "aom.population", { color: VILLAGER_COLOR }),
      text("\nMembers: ", { color: "gray" }),
      score("$(town)", "aom.members", { color: "aqua" }),
      text("\nEmployed: ", { color: "gray" }),
      score("$(town)", "aom.employed", { color: WORKER_COLOR }),
      text("\nUnemployed: ", { color: "gray" }),
      score("#u", "aom.tmp", { color: WORKER_COLOR }),
      text("\nBuildings: ", { color: "gray" }),
      score("#b", "aom.tmp", { color: "aqua" }),
    ])}`,
  ]);

  const townInfoNav = d.defineFunction("town/info/nav", [
    "data modify storage aom:tmp chat.nav set value []",
    `execute unless data storage aom:tmp chat{nav:"menu"} if score #p aom.tmp matches 2.. run data modify storage aom:tmp chat.nav append value ${snbt(infoNavPrev)}`,
    `execute unless data storage aom:tmp chat{nav:"menu"} unless score #p aom.tmp >= #t aom.tmp run data modify storage aom:tmp chat.nav append value ${snbt(infoNavNext)}`,
    `execute if data storage aom:tmp chat{nav:"menu"} if score #p aom.tmp matches 2.. run data modify storage aom:tmp chat.nav append value ${snbt(menuNavPrev)}`,
    `execute if data storage aom:tmp chat{nav:"menu"} unless score #p aom.tmp >= #t aom.tmp run data modify storage aom:tmp chat.nav append value ${snbt(menuNavNext)}`,
    tellraw("@s", [nbt("chat.nav", { storage: "aom:tmp" }, { interpret: true })]),
  ]);

  const townInfoRender1 = d.defineFunction("town/info/render1", [
    `$function ${townOverview.name} {"town":"$(town)"}`,
    `function ${townInfoNav.name}`,
  ]);

  const townInfoRender2 = d.defineFunction("town/info/render2", [
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" members ===\n", { color: "gold" }),
      text("Online: "),
      { selector: "@a[tag=aom_member_$(town)]" },
      text("\n\nEvery member counts as one villager.\n\n"),
    ])}`,
    `function ${townInfoNav.name}`,
  ]);

  const townInfoBuildingLine = d.defineFunction("town/info/building_line", [
    "scoreboard players add #i aom.tmp 1",
    `execute if score #i aom.tmp >= #from aom.tmp if score #i aom.tmp <= #to aom.tmp run function ${chatPageLine.name}`,
  ]);

  const townInfoRenderBuildings = d.defineFunction("town/info/render_buildings", [
    "scoreboard players operation #o aom.tmp = #p aom.tmp",
    "scoreboard players remove #o aom.tmp 3",
    "scoreboard players operation #o aom.tmp *= 8 aom.tmp",
    "scoreboard players operation #from aom.tmp = #o aom.tmp",
    "scoreboard players add #from aom.tmp 1",
    "scoreboard players operation #to aom.tmp = #o aom.tmp",
    "scoreboard players add #to aom.tmp 8",
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" buildings ===\n", { color: "gold" }),
    ])}`,
    "data modify storage aom:tmp chat.lines set value []",
    "scoreboard players set #i aom.tmp 0",
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] at @s run function ${townInfoBuildingLine.name}`,
    tellraw("@s", [
      nbt("chat.lines", { storage: "aom:tmp" }, { interpret: true }),
      text("\n"),
    ]),
    `function ${townInfoNav.name}`,
  ]);

  const townInfoNext = d.defineFunction("town/info/next", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "scoreboard players add #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const townInfoPrev = d.defineFunction("town/info/prev", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "scoreboard players remove #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const townInfoPage = d.defineFunction("town/info/page", [
    `$execute unless data storage aom:data players.$(key).page run data modify storage aom:data players.$(key).page set value 1`,
    `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev} run function ${townInfoPrev.name} with storage aom:tmp chat`,
    `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pageNext} run function ${townInfoNext.name} with storage aom:tmp chat`,
    `execute unless score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} if score @s aom.town_info matches 2..2 run function ${townInfoPrev.name} with storage aom:tmp chat`,
    `execute unless score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} if score @s aom.town_info matches 3..3 run function ${townInfoNext.name} with storage aom:tmp chat`,
    "scoreboard players set #p aom.tmp 0",
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "scoreboard players set #b aom.tmp 0",
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run scoreboard players add #b aom.tmp 1`,
    "scoreboard players operation #t aom.tmp = #b aom.tmp",
    "scoreboard players add #t aom.tmp 7",
    "scoreboard players operation #t aom.tmp /= 8 aom.tmp",
    "scoreboard players add #t aom.tmp 2",
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    "execute if score #p aom.tmp > #t aom.tmp run scoreboard players operation #p aom.tmp = #t aom.tmp",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
    `execute if score #p aom.tmp matches 1 run function ${townInfoRender1.name} with storage aom:tmp chat`,
    `execute if score #p aom.tmp matches 2 run function ${townInfoRender2.name} with storage aom:tmp chat`,
    `execute if score #p aom.tmp matches 3.. run function ${townInfoRenderBuildings.name} with storage aom:tmp chat`,
  ]);

  const townInfoDispatch = d.defineFunction("town/info/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    "scoreboard players set @s aom.action 0",
    `$data modify storage aom:tmp chat.town set from storage aom:data players.$(key).town`,
    `data remove storage aom:tmp chat.nav`,
    `$execute if score @s aom.town_info matches 1..1 run data modify storage aom:data players.$(key).page set value 1`,
    `$execute unless data storage aom:data players.$(key).page run data modify storage aom:data players.$(key).page set value 1`,
    `function ${townInfoPage.name} with storage aom:tmp chat`,
  ]);

  const townInfo = d.defineFunction("town/info", [
    ...playerCall(townInfoDispatch, "chat"),
  ]);

  // -------------------------------------------------------------------------
  // Building: removal and scanning
  // -------------------------------------------------------------------------

  const buildRemoveAnchor = d.defineFunction("build/remove/anchor", [
    `$kill @e[type=minecraft:interaction,tag=aom_click,nbt={data:{aom:{town:"$(town)",building:$(building)}}}]`,
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  const packRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    packRefs.set(
      type.id,
      d.defineFunction(`build/pack/${type.id}`, [
        `$execute unless data storage aom:data towns.$(town).packed.${type.id} run data modify storage aom:data towns.$(town).packed.${type.id} set value []`,
        `$execute if data storage aom:data towns.$(town).buildings.$(building) run data modify storage aom:data towns.$(town).packed.${type.id} append from storage aom:data towns.$(town).buildings.$(building)`,
        `$data remove storage aom:data towns.$(town).buildings.$(building)`,
        `$function ${syncAllRef.name} {"town":"$(town)"}`,
      ]),
    );
  }

  const scanRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    const plan = planById(type.id);
    const dropSelector =
      `@e[type=minecraft:item,distance=..1.5,nbt={Item:{id:"minecraft:oak_sign"}}]`;
    const remove = d.defineFunction(`build/scan/remove/${type.id}`, [
      "data remove storage aom:tmp pack",
      `$data modify storage aom:tmp pack.town set value "$(town)"`,
      `$data modify storage aom:tmp pack.building set value $(building)`,
      `kill ${dropSelector}`,
      `$function ${refOf(packRefs, type.id).name} with storage aom:tmp pack`,
      `summon minecraft:item ~ ~1 ~ {Item:${planItem(plan)}}`,
      `tellraw @a ${snbt([text("[aom] It was packed up; place its plan to rebuild it.", { color: "gray" })])}`,
      `$function ${buildRemoveAnchor.name} {"town":"$(town)","building":$(building)}`,
    ]);
    scanRefs.set(
      type.id,
      d.defineFunction(`build/scan/check/${type.id}`, [
        `execute unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @a ${snbt([text("[aom] A building's sign was broken.", { color: "gray" })])}`,
        `$execute unless block ~ ~ ~ ${SIGN_BLOCK} run function ${remove.name} {"town":"$(town)","building":$(building)}`,
      ]),
    );
  }

  const buildScanDispatch = d.defineFunction(
    "build/scan/dispatch",
    typeDispatch(
      BUILDINGS,
      (type) =>
        `function ${refOf(scanRefs, type.id).name} {"town":"$(town)","building":$(building)}`,
    ),
  );

  const buildScanOne = d.defineFunction("build/scan/one", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${buildScanDispatch.name} with storage aom:tmp anchor`,
  ]);

  const buildScan = d.defineFunction("build/scan", eachAnchor(`function ${buildScanOne.name}`));

  // -------------------------------------------------------------------------
  // Building: placement
  // -------------------------------------------------------------------------

  const anchorSelector = (): string =>
    anchorOf({ town: "$(town)", building: "$(id)" });

  const placeCreateRefs = new Map<string, FunctionRef>();
  for (const type of BUILD_MENU_BUILDINGS) {
    const hookLines: Lines = type.population
      ? [
          `$data modify storage aom:data towns.$(town).buildings.$(id).villagers set value 1`,
          `$scoreboard players add $(town) aom.population 1`,
          `$execute as ${anchorSelector()} at @s run ${waxSign("~ ~ ~")}`,
          `tellraw @s ${snbt([text(`Built a ${type.label.toLowerCase()}.`, { color: "green" })])}`,
        ]
      : [
          `$execute as ${anchorSelector()} at @s run ${waxSign("~ ~ ~")}`,
          `tellraw @s ${snbt([text(`Built a ${type.label.toLowerCase()}.`, { color: "green" })])}`,
        ];
    placeCreateRefs.set(
      type.id,
      d.defineFunction(`build/place/create/${type.id}`, hookLines),
    );
  }

  const placeFinish = d.defineFunction("build/place/finish", [
    `$data remove storage aom:data players.$(key).pending.sign`,
    `$kill ${anchorSelector()}`,
    `$execute in $(dimension) positioned $(x) $(y) $(z) align xyz run ${summonAnchor("~.5 ~.5 ~.5", { town: "$(town)", building: "$(id)", type: "$(type)" })}`,
    `$kill @e[type=minecraft:interaction,tag=aom_click,nbt={data:{aom:{town:"$(town)",building:$(id)}}}]`,
    `$execute as ${anchorSelector()} at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_click"],width:1.0f,height:1.0f,response:0b,data:{aom:{town:"$(town)",building:$(id),type:"$(type)"}}}`,
    `$execute unless entity ${anchorSelector()} run tellraw @s ${snbt([text("[aom] anchor marker was not created", { color: "red" })])}`,
    `$execute as ${anchorSelector()} at @s run function ${renderSignsDispatch.name} {"town":"$(town)","building":$(id)}`,
    `$data modify storage aom:tmp anchor set value {town:"$(town)",building:$(id),type:"$(type)"}`,
    `$function ${showBuildingMenu.name}`,
  ]);

  const placeRestore = d.defineFunction("build/place/restore", [
    `$data modify storage aom:data towns.$(town).buildings.$(id) set from storage aom:data towns.$(town).packed.$(type)[-1]`,
    `$data remove storage aom:data towns.$(town).packed.$(type)[-1]`,
    `$function ${syncAllRef.name} {"town":"$(town)"}`,
    `$execute as ${anchorSelector()} at @s run ${waxSign("~ ~ ~")}`,
    `tellraw @s ${snbt([text("Building restored.", { color: "green" })])}`,
    `function ${placeFinish.name} with storage aom:tmp place`,
  ]);

  const placeFresh = d.defineFunction("build/place/fresh", [
    `$data modify storage aom:data towns.$(town).buildings.$(id) set value {type:"$(type)",jobs:{},storage:{}}`,
    ...BUILD_MENU_BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(id){type:"${type.id}"} run function ${refOf(placeCreateRefs, type.id).name} with storage aom:tmp place`,
    ),
    `function ${placeFinish.name} with storage aom:tmp place`,
  ]);

  const placeCreate = d.defineFunction("build/place/create", [
    `$execute in $(dimension) run ${summonAnchor("$(x) $(y) $(z)", { town: "$(town)", building: "$(id)", type: "$(type)" })}`,
    "data remove storage aom:tmp restore",
    `$execute if data storage aom:data towns.$(town).packed.$(type)[0] run data modify storage aom:tmp restore set value 1`,
    `execute if data storage aom:tmp restore run function ${placeRestore.name} with storage aom:tmp place`,
    `execute unless data storage aom:tmp restore run function ${placeFresh.name} with storage aom:tmp place`,
  ]);

  const placeCheck = d.defineFunction("build/place/check", [
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run tellraw @s ${snbt([text("The sign is gone.", { color: "red" })])}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run return fail`,
    `$scoreboard players add $(town) aom.build_acc 0`,
    "$execute store result storage aom:tmp place.id int 1 run scoreboard players get $(town) aom.build_acc",
    `$scoreboard players add $(town) aom.build_acc 1`,
    `function ${placeCreate.name} with storage aom:tmp place`,
  ]);

  const placeCommon = d.defineFunction("build/place/common", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp place.town set from storage aom:data players.$(key).town`,
    `function ${placeCheck.name} with storage aom:tmp place`,
  ]);

  const requireRefs = new Map<string, FunctionRef>();
  const requireCheckRefs = new Map<string, FunctionRef>();
  for (const type of BUILD_MENU_BUILDINGS) {
    if (!type.requires?.length) continue;
    const names = type.requires
      .map((requirement) => UNLOCK_INFO.get(requirement)?.label ?? requirement)
      .join(" and ");
    requireCheckRefs.set(
      type.id,
      d.defineFunction(`build/require/${type.id}`, [
        ...type.requires.map(
          (requirement) =>
            `$execute unless data storage aom:data towns.$(town).unlocks.${requirement} run scoreboard players set #blocked aom.tmp 1`,
        ),
        `execute if score #blocked aom.tmp matches 1 run ${err("@s", `Requires a staffed ${names}.`)}`,
      ]),
    );
  }
  for (const type of BUILD_MENU_BUILDINGS) {
    requireRefs.set(
      type.id,
      d.defineFunction(`build/require/load/${type.id}`, [
        "scoreboard players set #blocked aom.tmp 0",
        "data remove storage aom:tmp req",
        `$data modify storage aom:tmp req.town set from storage aom:data players.$(key).town`,
        `$data modify storage aom:tmp req.key set value "$(key)"`,
        ...(type.requires?.length
          ? [`execute if data storage aom:tmp req.town run function ${refOf(requireCheckRefs, type.id).name} with storage aom:tmp req`]
          : []),
      ]),
    );
  }

  const placeRefs = new Map<string, FunctionRef>();
  for (const type of BUILD_MENU_BUILDINGS) {
    placeRefs.set(
      type.id,
      d.defineFunction(`build/place/${type.id}`, [
        `function ${refOf(requireRefs, type.id).name} with storage aom:tmp place`,
        "execute if score #blocked aom.tmp matches 1 run return fail",
        `data modify storage aom:tmp place.type set value "${type.id}"`,
        `function ${placeCommon.name} with storage aom:tmp place`,
      ]),
    );
  }

  const buildDeleteExec = d.defineFunction("build/delete/exec", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    `$data modify storage aom:tmp ctx.type set from storage aom:data towns.$(town).buildings.$(building).type`,
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:tmp ctx{type:"${type.id}"} run function ${refOf(packRefs, type.id).name} with storage aom:tmp ctx`,
    ),
    ...BUILDINGS.map((type) => {
      const plan = planById(type.id);
      return `$execute if data storage aom:tmp ctx{type:"${type.id}"} as ${anchorOf({ town: "$(town)", building: "$(building)" })} at @s run summon minecraft:item ~ ~1 ~ {Item:${planItem(plan)}}`;
    }),
    `$execute as ${anchorOf({ town: "$(town)", building: "$(building)" })} at @s run function ${buildRemoveAnchor.name} {"town":"$(town)","building":$(building)}`,
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:tmp ctx{type:"${type.id}"} run tellraw @a ${snbt([text("A ", { color: "gray" }), text(type.label, { color: "aqua" }), text(" in ", { color: "gray" }), text("$(town)", { color: "aqua" }), text(" was packed up.", { color: "gray" })])}`,
    ),
    `tellraw @s ${snbt([text("Building packed; place its plan to rebuild it.", { color: "green" })])}`,
  ]);

  const buildDeleteDispatch = d.defineFunction("build/delete/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.building run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    `function ${buildDeleteExec.name} with storage aom:tmp ctx`,
  ]);

  d.defineFunction("build/delete", playerCall(buildDeleteDispatch));

  const buildDeletePrompt = d.defineFunction("build/delete/prompt", [
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    `$data modify storage aom:data players.$(key).pending.confirm set value "aom:build/delete"`,
    `function ${confirmPrompt.name}`,
  ]);

  // -------------------------------------------------------------------------
  // UI: menus and actions
  // -------------------------------------------------------------------------

  const jobMenuParts = (type: BuildingType): TextComponent[] => {
    const parts: TextComponent[] = [];
    type.jobs.forEach((job, index) => {
      parts.push(
        text(`  ${job.label}: `, { color: "gray" }),
        text(`$(workers_${job.id}) `, { color: WORKER_COLOR }),
        menuButton(
          "Hire",
          `trigger aom.menu set ${ACTION_CODE + hireAction(type, index)}`,
          `Hire a ${job.label}`,
          "green",
        ),
        " ",
      );
      if (type.fire) {
        parts.push(
          menuButton(
            "Fire",
            `trigger aom.menu set ${ACTION_CODE + fireAction(type, index)}`,
            `Fire a ${job.label}`,
            "red",
          ),
          " ",
        );
      }
      parts.push("\n");
    });
    return parts;
  };

  const storageMenuParts = (
    type: BuildingType,
    res: Resource,
    resourceIndex: number,
  ): TextComponent[] => {
    const parts: TextComponent[] = [
      text(`${res.label} `, { color: "gold" }),
      text(`[$(stored_${res.id})/$(capacity_${res.id})] `, { color: "yellow" }),
      text(`$(discovered_${res.id})`, { color: "dark_gray" }),
      "\n  ",
    ];
    STORAGE_AMOUNTS.forEach((amount, amountIndex) => {
      parts.push(
        menuButton(
          amount.label,
          `trigger aom.menu set ${ACTION_CODE + storageAction(type, resourceIndex, "deposit", amountIndex)}`,
          `Deposit ${amount.label} ${res.label}`,
          "red",
        ),
        " ",
      );
    });
    parts.push(text("| ", { color: "dark_gray" }));
    STORAGE_AMOUNTS.forEach((amount, amountIndex) => {
      parts.push(
        menuButton(
          amount.label,
          `trigger aom.menu set ${ACTION_CODE + storageAction(type, resourceIndex, "withdraw", amountIndex)}`,
          `Withdraw ${amount.label} ${res.label}`,
          "green",
        ),
        " ",
      );
    });
    parts.push("\n");
    return parts;
  };

  const menuRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (type.townhall || (!type.jobs.length && !type.population)) continue;
    const resources = buildingResources(type);
    const storagePages = Math.ceil(resources.length / STORAGE_PER_PAGE);
    const pageCount = 1 + storagePages;

    const pages: FunctionRef[] = [];

    // Page 1: jobs, villagers and the way into the storage pages.
    const first: TextComponent[] = [
      text(`${type.label}\n`, { color: "gold", bold: true }),
      ...jobMenuParts(type),
    ];
    if (type.population) {
      first.push(
        text("Villagers: ", { color: "gray" }),
        text("$(villagers) ", { color: VILLAGER_COLOR }),
        menuButton(
          "Add",
          `trigger aom.menu set ${ACTION_CODE + populationAction(type, "add")}`,
          "Add a villager",
          "green",
        ),
        " ",
      );
      if (type.removeVillagers) {
        first.push(
          menuButton(
            "Remove",
            `trigger aom.menu set ${ACTION_CODE + populationAction(type, "remove")}`,
            "Remove a villager",
            "red",
          ),
          " ",
        );
      }
      first.push("\n");
    }
    if (storagePages) {
      first.push(
        menuButton(
          "Storages >",
          `trigger aom.menu set ${ACTION_CODE + STORAGE_PAGE_NEXT}`,
          "Show storage",
          "green",
        ),
        " ",
      );
    }
    first.push(
      menuButton(
        "Delete building",
        `trigger aom.menu set ${ACTION_CODE + deleteAction(type)}`,
        "Delete this building",
        "red",
      ),
    );
    pages.push(d.defineFunction(`ui/menu/${type.id}/1`, ["$" + tellraw("@s", first)]));

    for (let page = 0; page < storagePages; page++) {
      const slice = resources.slice(
        page * STORAGE_PER_PAGE,
        (page + 1) * STORAGE_PER_PAGE,
      );
      const parts: TextComponent[] = [
        text(`${type.label} — storage ${page + 1}/${storagePages}\n`, {
          color: "gold",
          bold: true,
        }),
      ];
      for (const res of slice) {
        parts.push(...storageMenuParts(type, res, resources.indexOf(res)));
      }
      parts.push("\n");
      if (page > 0) {
        parts.push(
          menuButton(
            "< Prev",
            `trigger aom.menu set ${ACTION_CODE + STORAGE_PAGE_PREV}`,
            "Previous page",
            "gray",
          ),
          " ",
        );
      }
      if (page + 1 < storagePages) {
        parts.push(
          menuButton(
            "Next >",
            `trigger aom.menu set ${ACTION_CODE + STORAGE_PAGE_NEXT}`,
            "Next page",
            "gray",
          ),
          " ",
        );
      }
      parts.push(
        menuButton(
          "Delete building",
          `trigger aom.menu set ${ACTION_CODE + deleteAction(type)}`,
          "Delete this building",
          "red",
        ),
      );
      pages.push(d.defineFunction(`ui/menu/${type.id}/${page + 2}`, ["$" + tellraw("@s", parts)]));
    }

    // The menu reads the player's storage page, clamps it, and draws it.
    menuRefs.set(
      type.id,
      d.defineFunction(`ui/menu/${type.id}`, [
        `$execute unless data storage aom:data players.$(key).menu_building{town:"$(town)",building:$(building)} run data modify storage aom:data players.$(key).storage_page set value 1`,
        `$data modify storage aom:data players.$(key).menu_building set value {town:"$(town)",building:$(building)}`,
        `$execute unless data storage aom:data players.$(key).storage_page run data modify storage aom:data players.$(key).storage_page set value 1`,
        "scoreboard players set #p aom.tmp 0",
        `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).storage_page`,
        "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
        `execute if score #p aom.tmp matches ${pageCount}.. run scoreboard players set #p aom.tmp ${pageCount}`,
        `$execute store result storage aom:data players.$(key).storage_page int 1 run scoreboard players get #p aom.tmp`,
        ...pages.map(
          (ref, index) =>
            `execute if score #p aom.tmp matches ${index + 1} run function ${ref.name} with storage aom:tmp summary`,
        ),
      ]),
    );
  }

  const menuTownhall = d.defineFunction("ui/menu/townhall", [
    "data remove storage aom:tmp chat",
    `$data modify storage aom:tmp chat.town set value "$(town)"`,
    `function ${playerKey.name}`,
    `data modify storage aom:tmp chat.key set from storage aom:tmp player_key`,
    `data modify storage aom:tmp chat.nav set value "menu"`,
    "scoreboard players set @s aom.action 0",
    `function ${townInfoPage.name} with storage aom:tmp chat`,
    tellraw("@s", [
      text("\nMenu: ", { color: "gray" }),
      menuButton(
        "Join town",
        `trigger aom.menu set ${ACTION_CODE + TOWNHALL_ACTIONS.join}`,
        "Join this town",
        "green",
      ),
      " ",
      menuButton(
        "Leave town",
        `trigger aom.menu set ${ACTION_CODE + TOWNHALL_ACTIONS.leave}`,
        "Leave this town",
        "red",
      ),
      " ",
      menuButton(
        "Delete town",
        `trigger aom.menu set ${ACTION_CODE + TOWNHALL_ACTIONS.deleteTown}`,
        "Delete this town",
        "red",
      ),
    ]),
  ]);

  const menuSave = d.defineFunction("ui/menu/save", [
    `$data modify storage aom:data players.$(key).pending set from storage aom:tmp anchor`,
  ]);

  const menuResetPageExec = d.defineFunction("ui/menu/reset_page/exec", [
    `$data modify storage aom:data players.$(key).page set value 1`,
    `$data modify storage aom:data players.$(key).storage_page set value 1`,
  ]);
  const menuResetPage = d.defineFunction("ui/menu/reset_page", [
    ...playerCall(menuResetPageExec),
  ]);

  const menuShow = d.defineFunction("ui/menu/show", [
    ...playerCall(menuSave),
    `execute if data storage aom:tmp anchor run function ${summaryLoad.name} with storage aom:tmp anchor`,
    `data modify storage aom:tmp summary.key set from storage aom:tmp player_key`,
    ...BUILDINGS.map((type) => {
      if (type.townhall) {
        return `execute if data storage aom:tmp anchor{type:"${type.id}"} run function ${menuTownhall.name} with storage aom:tmp anchor`;
      }
      const menu = refOf(menuRefs, type.id);
      return `execute if data storage aom:tmp anchor{type:"${type.id}"} run function ${menu.name} with storage aom:tmp summary`;
    }),
  ]);

  const menuRefresh = d.defineFunction("ui/menu/refresh", [
    "execute unless data storage aom:tmp menu run return fail",
    "data modify storage aom:tmp anchor set from storage aom:tmp menu",
    `function ${menuShow.name}`,
  ]);

  // Storage pagination: move the player's storage page; the menu clamps it.
  const storageNav = d.defineFunction("ui/storage/nav", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).storage_page`,
    `$execute if score @s aom.action matches ${STORAGE_PAGE_PREV} run scoreboard players remove #p aom.tmp 1`,
    `$execute if score @s aom.action matches ${STORAGE_PAGE_NEXT} run scoreboard players add #p aom.tmp 1`,
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).storage_page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const clickCheck = d.defineFunction("ui/click/check", [
    "execute unless data entity @s interaction.player run return fail",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `execute as @p[distance=..4] run function ${menuResetPage.name}`,
    `execute as @p[distance=..4] run function ${menuShow.name}`,
  ]);

  const actionFind = d.defineFunction("ui/action/find", [
    "data remove storage aom:tmp anchor",
    `execute at @s as @e[type=minecraft:marker,tag=aom_anchor,distance=..5,limit=1,sort=nearest] run data modify storage aom:tmp anchor set from entity @s data.aom`,
    `execute unless data storage aom:tmp anchor run tellraw @s ${snbt([text("No building nearby. Stand next to its sign and right-click it.", { color: "red" })])}`,
    "execute unless data storage aom:tmp anchor run return fail",
    ...playerCall(menuSave),
  ]);

  const actionRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (type.townhall) {
      actionRefs.set(
        "townhall",
        d.defineFunction("ui/action/townhall", [
          `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.join} run function ${townJoin.name}`,
          `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.leave} run function ${townLeave.name}`,
          `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.join}..${TOWNHALL_ACTIONS.leave} run function ${menuRefresh.name}`,
          `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.deleteTown} run function ${townDeletePrompt.name} with storage aom:tmp ctx`,
          `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} run function ${menuRefresh.name}`,
        ]),
      );
      continue;
    }
    if (!type.jobs.length && !type.population) continue;

    const lines: Lines = [
      `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
      `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    ];
    type.jobs.forEach((job, index) => {
      lines.push(
        `$execute if score @s aom.action matches ${hireAction(type, index)} run function ${refOf(hireRefs, `${type.id}/${job.id}`).name} {"key":"$(key)","town":"$(town)","building":$(building)}`,
      );
      if (type.fire) {
        lines.push(
          `$execute if score @s aom.action matches ${fireAction(type, index)} run function ${refOf(fireRefs, `${type.id}/${job.id}`).name} {"key":"$(key)","town":"$(town)","building":$(building)}`,
        );
      }
    });
    if (type.population) {
      lines.push(
        `execute if score @s aom.action matches ${populationAction(type, "add")} run data modify storage aom:tmp ctx.delta set value 1`,
        `execute if score @s aom.action matches ${populationAction(type, "add")} run function ${townVillager.name} with storage aom:tmp ctx`,
      );
      if (type.removeVillagers) {
        lines.push(
          `execute if score @s aom.action matches ${populationAction(type, "remove")} run data modify storage aom:tmp ctx.delta set value -1`,
          `execute if score @s aom.action matches ${populationAction(type, "remove")} run function ${townVillager.name} with storage aom:tmp ctx`,
        );
      }
    }
    buildingResources(type).forEach((res, resourceIndex) => {
      STORAGE_AMOUNTS.forEach((amount, amountIndex) => {
        const deposit = storageAction(type, resourceIndex, "deposit", amountIndex);
        const withdraw = storageAction(type, resourceIndex, "withdraw", amountIndex);
        const args = `{"key":"$(key)","town":"$(town)","building":$(building),"amount":${amount.value}}`;
        const key = `${type.id}/${res.id}`;
        lines.push(
          `$execute if score @s aom.action matches ${deposit} run function ${refOf(depositRefs, key).name} ${args}`,
          `$execute if score @s aom.action matches ${withdraw} run function ${refOf(withdrawRefs, key).name} ${args}`,
        );
      });
    });
    lines.push(
      `execute if score @s aom.action matches ${STORAGE_PAGE_PREV}..${STORAGE_PAGE_NEXT} run function ${storageNav.name} with storage aom:tmp ctx`,
      `execute unless score @s aom.action matches ${deleteAction(type)} run function ${menuRefresh.name}`,
      `execute if score @s aom.action matches ${deleteAction(type)} run function ${buildDeletePrompt.name} with storage aom:tmp ctx`,
    );
    actionRefs.set(type.id, d.defineFunction(`ui/action/${type.id}`, lines));
  }

  const actionDispatch2 = d.defineFunction("ui/action/dispatch2", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run tellraw @s ${snbt([text("This building no longer exists.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    `$data modify storage aom:tmp menu.town set value "$(town)"`,
    `$data modify storage aom:tmp menu.building set value $(building)`,
    `$data modify storage aom:tmp menu.type set from storage aom:data towns.$(town).buildings.$(building).type`,
    ...typeDispatch(
      BUILDINGS,
      (type) =>
        `function ${refOf(actionRefs, type.id).name} with storage aom:tmp ctx`,
    ),
  ]);

  const actionDispatch = d.defineFunction("ui/action/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.building run function ${actionFind.name}`,
    `$execute unless data storage aom:data players.$(key).pending.building run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    `function ${actionDispatch2.name} with storage aom:tmp ctx`,
  ]);

  const actionRun = d.defineFunction("ui/action/run", playerCall(actionDispatch));

  const uiAction = d.defineFunction("ui/action", [
    `execute if score @s aom.action matches ..-1 run function ${confirmRun.name}`,
    `execute if score @s aom.action matches 1.. run function ${actionRun.name}`,
  ]);

  // -------------------------------------------------------------------------
  // Guide
  // -------------------------------------------------------------------------

  const guideTotal = GUIDE.length;
  const guidePrevNav = text("[<] ", {
    color: "green",
    click_event: { action: "run_command", command: "/trigger aom.guide set 2" },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const guideNextNav = text("[>]", {
    color: "green",
    click_event: { action: "run_command", command: "/trigger aom.guide set 3" },
    hover_event: { action: "show_text", value: "Next page" },
  });

  const guidePages = GUIDE.map((page, index) =>
    d.defineFunction(`ui/guide/page/${index + 1}`, [
      tellraw("@s", [
        text(`${page.heading}\n`, { color: "gold", bold: true }),
        ...page.lines.map((line) => text(`${line}\n`, { color: "gray" })),
        text("\nPage ", { color: "dark_gray" }),
        score("#p", "aom.tmp", { color: "aqua" }),
        text(`/${guideTotal}  `, { color: "dark_gray" }),
        ...(index > 0 ? [guidePrevNav] : []),
        ...(index < guideTotal - 1 ? [guideNextNav] : []),
      ]),
    ]),
  );

  const guidePrev = d.defineFunction("ui/guide/prev", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).guide_page`,
    "scoreboard players remove #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).guide_page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const guideNext = d.defineFunction("ui/guide/next", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).guide_page`,
    "scoreboard players add #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).guide_page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const guideDispatch = d.defineFunction("ui/guide/dispatch", [
    `$execute unless data storage aom:data players.$(key).guide_page run data modify storage aom:data players.$(key).guide_page set value 1`,
    `execute if score @s aom.guide matches 2..2 run function ${guidePrev.name} with storage aom:tmp guide`,
    `execute if score @s aom.guide matches 3..3 run function ${guideNext.name} with storage aom:tmp guide`,
    "scoreboard players set #p aom.tmp 0",
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).guide_page`,
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    `execute if score #p aom.tmp matches ${guideTotal}.. run scoreboard players set #p aom.tmp ${guideTotal}`,
    `$execute store result storage aom:data players.$(key).guide_page int 1 run scoreboard players get #p aom.tmp`,
    ...guidePages.map(
      (ref, index) =>
        `execute if score #p aom.tmp matches ${index + 1} run function ${ref.name}`,
    ),
  ]);

  const guide = d.defineFunction("ui/guide", playerCall(guideDispatch, "guide"));

  // -------------------------------------------------------------------------
  // Craftable plans: recipes, advancements and placement
  // -------------------------------------------------------------------------

  const planRayStep = d.ref("plan/ray/step");
  const planRayStart = d.defineFunction("plan/ray/start", [
    `scoreboard players set @s ${RAY_OBJECTIVE} 50`,
    `$return run function ${planRayStep.name} {on_hit: "$(on_hit)", on_miss: "$(on_miss)"}`,
  ]);
  d.defineFunction(planRayStep.path, [
    `scoreboard players remove @s ${RAY_OBJECTIVE} 1`,
    `$execute if score @s ${RAY_OBJECTIVE} matches ..0 run function $(on_miss)`,
    `execute if score @s ${RAY_OBJECTIVE} matches ..0 run return fail`,
    `$execute if block ~ ~ ~ ${SIGN_BLOCK} align xyz run function $(on_hit)`,
    `execute if block ~ ~ ~ ${SIGN_BLOCK} align xyz run return 1`,
    `$execute positioned ^ ^ ^0.1 run function ${planRayStep.name} {on_hit: "$(on_hit)", on_miss: "$(on_miss)"}`,
  ]);

  const planLocalTmp =
    "@e[type=minecraft:marker,tag=aom_tmp_pos,distance=..0.2,limit=1,sort=nearest]";

  const planPlaceCandidate = d.defineFunction("plan/place/candidate", [
    "scoreboard players set #found aom.tmp 1",
    'execute align xyz run summon minecraft:marker ~ ~ ~ {Tags:["aom_tmp_pos"]}',
    `$execute store result storage aom:data players.$(key).found.x int 1 run data get entity ${planLocalTmp} Pos[0]`,
    `$execute store result storage aom:data players.$(key).found.y int 1 run data get entity ${planLocalTmp} Pos[1]`,
    `$execute store result storage aom:data players.$(key).found.z int 1 run data get entity ${planLocalTmp} Pos[2]`,
    "kill @e[type=minecraft:marker,tag=aom_tmp_pos]",
    `$data modify storage aom:data players.$(key).found.dimension set from entity @s Dimension`,
    `$function $(action) with storage aom:tmp ctx`,
  ]);

  const planSearchRadius = 3;

  const planPlaceSearchFromHere = d.defineFunction("plan/place/search_here", [
    "$data remove storage aom:data players.$(key).found",
    `$data modify storage aom:data players.$(key).found set value {}`,
    "scoreboard players set #found aom.tmp 0",
    ...Array.from({ length: planSearchRadius + 1 }, (_, ring) => {
      const args = `{"key":"$(key)","action":"$(action)"}`;
      const offsets: [number, number, number][] = [];
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          if (dx === 0 && dz === 0) {
            offsets.push([0, 0, 0]);
            continue;
          }
          offsets.push([dx, -1, dz], [dx, 0, dz], [dx, 1, dz]);
        }
      }
      return offsets.map(
        ([dx, dy, dz]) =>
          `$execute if score #found aom.tmp matches 0 positioned ~${dx} ~${dy} ~${dz} align xyz if block ~ ~ ~ ${SIGN_BLOCK} unless entity ${findAnchorAt()} run function ${planPlaceCandidate.name} ${args}`,
      );
    }).flat(),
    "execute if score #found aom.tmp matches 0 run function aom:plan/place/miss",
  ]);

  const planPlacePrepare = d.defineFunction("plan/place/prepare", [
    `execute at @s anchored eyes run function ${planRayStart.name} {on_hit: "aom:plan/place/hit", on_miss: "aom:plan/place/miss"}`,
  ]);
  d.defineFunction("plan/place/hit", [
    `execute align xyz run function ${planPlaceSearchFromHere.name} with storage aom:tmp ctx`,
  ]);
  d.defineFunction("plan/place/miss", [
    err("@s", "Point at the sign you just placed."),
  ]);

  for (const plan of PLANS) {
    const type = BUILDINGS.find((entry) => entry.id === plan.id)!;
    for (const wood of WOODS) {
      const ingredients = type.id === "townhouse"
        ? [wood.planks, wood.planks]
        : [wood.planks, ...plan.extras];
      d.recipe(`plan/${plan.id}/${wood.name}`, {
        type: "minecraft:crafting_shapeless",
        ingredients,
        result: {
          id: wood.sign,
          count: 1,
          components: planComponents(plan),
        },
      });
    }

    const place = d.defineFunction(`plan/${plan.id}/place`, [
      `advancement revoke @s only aom:plan_${plan.id}_place`,
      `function ${playerKey.name}`,
      "data remove storage aom:tmp ctx",
      "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
      `data modify storage aom:tmp ctx.plan set value "${plan.id}"`,
      `data modify storage aom:tmp ctx.action set value "aom:plan/dispatch"`,
      `function ${planPlacePrepare.name}`,
    ]);

    d.advancement(`plan_${plan.id}_place`, {
      criteria: {
        placed: {
          trigger: "minecraft:placed_block",
          conditions: {
            location: {
              type: "minecraft:all_of",
              terms: [
                {
                  type: "minecraft:match_tool",
                  predicate: {
                    items: SIGN_ITEMS,
                    components: {
                      "minecraft:custom_data": { aom: { plan: plan.id } },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      rewards: { function: place.name },
    });
  }

  // Debug: `/function aom:debug/plans` opens a chat picker that hands out a
  // plan of any building. The entry point is `/function` (operator-only) and
  // its buttons ride the shared `aom.menu` bus like every other menu.
  const debugPageCount = Math.max(1, Math.ceil(BUILDINGS.length / BUILD_PAGE_SIZE));
  const debugPages: FunctionRef[] = [];
  for (let page = 0; page < debugPageCount; page++) {
    const slice = BUILDINGS.slice(page * BUILD_PAGE_SIZE, (page + 1) * BUILD_PAGE_SIZE);
    const parts: TextComponent[] = [
      text(`=== Debug: plans (page ${page + 1}/${debugPageCount}) ===\n`, {
        color: "gold",
        bold: true,
      }),
      text("Pick a building to get its plan:\n", { color: "gray" }),
    ];
    for (const type of slice) {
      const index = BUILDINGS.indexOf(type);
      parts.push(
        menuButton(
          type.label,
          `trigger aom.menu set ${DEBUG_CODE + index + 1}`,
          `Get the ${type.label} plan`,
        ),
        " ",
      );
    }
    parts.push("\n");
    if (page > 0) {
      parts.push(
        menuButton(
          "< Prev",
          `trigger aom.menu set ${DEBUG_CODE + BUILD_PAGE_PREV}`,
          "Previous page",
          "gray",
        ),
        " ",
      );
    }
    if (page + 1 < debugPageCount) {
      parts.push(
        menuButton(
          "Next >",
          `trigger aom.menu set ${DEBUG_CODE + BUILD_PAGE_NEXT}`,
          "Next page",
          "gray",
        ),
      );
    }
    debugPages.push(
      d.defineFunction(`ui/debug/page/${page + 1}`, [tellraw("@s", parts)]),
    );
  }

  const debugShow = d.defineFunction("debug/show", [
    `$execute unless data storage aom:data players.$(key).debug_page run data modify storage aom:data players.$(key).debug_page set value 1`,
    "scoreboard players set #p aom.tmp 0",
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).debug_page`,
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    `execute if score #p aom.tmp matches ${debugPageCount}.. run scoreboard players set #p aom.tmp ${debugPageCount}`,
    `$execute store result storage aom:data players.$(key).debug_page int 1 run scoreboard players get #p aom.tmp`,
    ...debugPages.map(
      (ref, index) =>
        `execute if score #p aom.tmp matches ${index + 1} run function ${ref.name}`,
    ),
  ]);

  const debugPrev = d.defineFunction("debug/prev", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).debug_page`,
    "scoreboard players remove #p aom.tmp 1",
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).debug_page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const debugNext = d.defineFunction("debug/next", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).debug_page`,
    "scoreboard players add #p aom.tmp 1",
    `execute if score #p aom.tmp matches ${debugPageCount}.. run scoreboard players set #p aom.tmp ${debugPageCount}`,
    `$execute store result storage aom:data players.$(key).debug_page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  const debugGiveRefs = BUILDINGS.map((type) =>
    d.defineFunction(`debug/give/${type.id}`, [
      `give @s ${planItemArgument(planById(type.id))} 1`,
      tellraw("@s", [text(`${type.label} plan given.`, { color: "green" })]),
    ]),
  );

  const debugDispatch = d.defineFunction("debug/dispatch", [
    ...BUILDINGS.map(
      (type, index) =>
        `execute if score @s aom.action matches ${index + 1} run function ${debugGiveRefs[index]!.name}`,
    ),
    `execute if score @s aom.action matches ${BUILD_PAGE_PREV} run function ${debugPrev.name} with storage aom:tmp dbg`,
    `execute if score @s aom.action matches ${BUILD_PAGE_NEXT} run function ${debugNext.name} with storage aom:tmp dbg`,
    `function ${debugShow.name} with storage aom:tmp dbg`,
  ]);

  const busDebug = d.defineFunction("internal/triggers/menu/debug", [
    "scoreboard players set @s aom.action 0",
    "scoreboard players operation @s aom.action = @s aom.menu",
    `scoreboard players remove @s aom.action ${DEBUG_CODE}`,
    `function ${playerKey.name}`,
    "data remove storage aom:tmp dbg",
    "data modify storage aom:tmp dbg.key set from storage aom:tmp player_key",
    `function ${debugDispatch.name} with storage aom:tmp dbg`,
  ]);

  const debugReset = d.defineFunction("debug/reset", [
    `$data modify storage aom:data players.$(key).debug_page set value 1`,
    `function ${debugShow.name} with storage aom:tmp dbg`,
  ]);

  d.defineFunction("debug/plans", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp dbg",
    "data modify storage aom:tmp dbg.key set from storage aom:tmp player_key",
    `function ${debugReset.name} with storage aom:tmp dbg`,
  ]);

  const townFoundRun = d.defineFunction("town/found/run", [
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run tellraw @s ${snbt([text("The sign is gone.", { color: "red" })])}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run return fail`,
    `$function ${playerKey.name}`,
    "data remove storage aom:tmp town",
    "data modify storage aom:tmp town.key set from storage aom:tmp player_key",
    `$execute in $(dimension) run data modify storage aom:tmp town.name set from block $(x) $(y) $(z) front_text.messages[0]`,
    "execute if data storage aom:tmp town.name.text run data modify storage aom:tmp town.name set from storage aom:tmp town.name.text",
    `$execute in $(dimension) positioned $(x) $(y) $(z) run function ${d.ref("town/create/validate").name} with storage aom:tmp town`,
  ]);

  const townCreateValidate = d.defineFunction("town/create/validate", [
    "data remove storage aom:tmp check",
    "data modify storage aom:tmp check set value {}",
    `$data modify storage aom:tmp check."$(name)" set value 1`,
    `$execute store success score #valid aom.tmp run data get storage aom:tmp check.$(name)`,
    "data remove storage aom:tmp check",
    `execute if score #valid aom.tmp matches 0 run tellraw @s ${snbt([text("Town names may only contain letters, numbers and underscores.", { color: "red" })])}`,
    "execute if score #valid aom.tmp matches 0 run return fail",
    `$execute if data storage aom:data towns.$(name) run tellraw @s ${snbt([text("A town named ", { color: "red" }), text("$(name)", { color: "aqua" }), text(" already exists.", { color: "red" })])}`,
    `$execute if data storage aom:data towns.$(name) run return fail`,
    `$data modify storage aom:data towns.$(name) set value {members:{}}`,
    `$data modify storage aom:data towns.$(name).buildings.1 set value {type:"townhall"}`,
    `$scoreboard players set $(name) aom.population 0`,
    `$scoreboard players set $(name) aom.employed 0`,
    `$scoreboard players set $(name) aom.members 0`,
    `$scoreboard players set $(name) aom.build_acc 2`,
    `$execute align xyz run ${summonAnchor("~.5 ~.5 ~.5", { town: "$(name)", building: 1, type: "townhall" })}`,
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(name)",building:1}}}] at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_click"],width:1.0f,height:1.0f,response:0b,data:{aom:{town:"$(name)",building:1,type:"townhall"}}}`,
    "execute align xyz run " + waxSign("~ ~ ~"),
    `$data modify storage aom:data towns.$(name).members.$(key) set value {}`,
    `$data modify storage aom:data players.$(key).town set value "$(name)"`,
    `$scoreboard players add $(name) aom.members 1`,
    `$tag @s add aom_member_$(name)`,
    `$function ${syncAllRef.name} {"town":"$(name)"}`,
    `function ${playerResync.name}`,
    `$function ${discoverScanRef.name} {"town":"$(name)","key":"$(key)"}`,
    `$function ${renderSignsDispatch.name} {"town":"$(name)","building":1}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "green" }, text(" founded the town of ", { color: "green" }), text("$(name)", { color: "aqua" }), text("!", { color: "green" })])}`,
    `$data modify storage aom:tmp anchor set value {town:"$(name)",building:1,type:"townhall"}`,
    `$function ${showBuildingMenu.name}`,
  ]);

  const townFoundConfirm = d.defineFunction("town/found/confirm", [
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `execute as @p[distance=..4] run function ${townFoundRun.name} with storage aom:tmp found`,
  ]);

  const townFoundCancel = d.defineFunction("town/found/cancel", [
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `tellraw @a ${snbt([text("A town founding was cancelled.", { color: "gray" })])}`,
    `summon minecraft:item ~ ~1 ~ {Item:${townhallPlanItem}}`,
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  const townFoundCheckAt = d.defineFunction("town/found/check/at", [
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} at @s run summon minecraft:item ~ ~1 ~ {Item:${townhallPlanItem}}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run kill @s`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run kill @s`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run return fail`,
    `execute if data entity @s interaction.player run function ${townFoundConfirm.name} with storage aom:tmp found`,
    `execute unless data entity @s interaction.player if data entity @s attack run function ${townFoundCancel.name}`,
  ]);

  const townFoundCheck = d.defineFunction("town/found/check", [
    "data remove storage aom:tmp found",
    "data modify storage aom:tmp found set from entity @s data.aom",
    `function ${townFoundCheckAt.name} with storage aom:tmp found`,
  ]);

  const townFoundSite = d.defineFunction("town/found/site", [
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run tellraw @s ${snbt([text("You must place the plan on a sign.", { color: "red" })])}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run return fail`,
    `$kill @e[type=minecraft:interaction,tag=aom_found,nbt={data:{aom:{x:$(x),y:$(y),z:$(z),dimension:"$(dimension)"}}}]`,
    `$execute in $(dimension) run summon minecraft:marker $(x) $(y) $(z) {Tags:["aom_tmp_pos"]}`,
    `$execute in $(dimension) as @e[type=minecraft:marker,tag=aom_tmp_pos,limit=1] at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_found"],width:1.0f,height:1.0f,response:0b,data:{aom:{x:$(x),y:$(y),z:$(z),dimension:"$(dimension)"}}}`,
    `$execute in $(dimension) run kill @e[type=minecraft:marker,tag=aom_tmp_pos]`,
    `$execute in $(dimension) unless entity @e[type=minecraft:interaction,tag=aom_found,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("[aom] The founding interaction was not created here.", { color: "red" })])}`,
    `$tellraw @s ${snbt([
      text("Townhall plan placed.\n", { color: "gold", bold: true }),
      text("1. Write your town's name on the first line of the sign.\n", { color: "gray" }),
      text("2. Right-click the sign to found your town and join it.\n", { color: "gray" }),
      text("Left-click or break the sign to cancel (the plan is returned).", { color: "dark_gray" }),
    ])}`,
  ]);

  const planBuild = d.defineFunction("plan/build", [
    "data remove storage aom:tmp place",
    `$data modify storage aom:tmp place.key set value "$(key)"`,
    `$data modify storage aom:tmp place.x set value $(x)`,
    `$data modify storage aom:tmp place.y set value $(y)`,
    `$data modify storage aom:tmp place.z set value $(z)`,
    `$data modify storage aom:tmp place.dimension set value "$(dimension)"`,
    `$function aom:build/place/$(plan)`,
  ]);

  d.defineFunction("plan/dispatch", [
    `$execute unless data storage aom:data players.$(key).found run return fail`,
    "data remove storage aom:tmp found",
    `$data modify storage aom:tmp found.key set value "$(key)"`,
    `$data modify storage aom:tmp found.plan set value "$(plan)"`,
    `$data modify storage aom:tmp found.x set from storage aom:data players.$(key).found.x`,
    `$data modify storage aom:tmp found.y set from storage aom:data players.$(key).found.y`,
    `$data modify storage aom:tmp found.z set from storage aom:data players.$(key).found.z`,
    `$data modify storage aom:tmp found.dimension set from storage aom:data players.$(key).found.dimension`,
    `$data remove storage aom:data players.$(key).found`,
    `$execute if data storage aom:data players.$(key).town run function ${planBuild.name} with storage aom:tmp found`,
    `$execute unless data storage aom:data players.$(key).town if data storage aom:tmp found{plan:"townhall"} run function ${townFoundSite.name} with storage aom:tmp found`,
    `$execute unless data storage aom:data players.$(key).town unless data storage aom:tmp found{plan:"townhall"} run tellraw @s ${snbt([text("You are not in a town. Place a Townhall Plan to found one.", { color: "red" })])}`,
  ]);

  // -------------------------------------------------------------------------
  // Special mechanics: mine depth and the Nether portal
  // -------------------------------------------------------------------------

  const depthTown = d.defineFunction("player/second/depth", [
    "scoreboard players set #depth aom.tmp 62",
    "scoreboard players set #lv aom.tmp 0",
    `$execute store result score #lv aom.tmp run data get storage aom:data towns.$(town).jobs.leveller`,
    "scoreboard players operation #lv aom.tmp *= 10 aom.tmp",
    "scoreboard players operation #depth aom.tmp -= #lv aom.tmp",
    "execute if score #depth aom.tmp matches ..-65 run scoreboard players set #depth aom.tmp -64",
  ]);

  const recordOverworld = d.defineFunction("player/second/overworld", [
    `$execute store result storage aom:data players.$(key).ow.x double 1 run data get entity @s Pos[0]`,
    `$execute store result storage aom:data players.$(key).ow.y double 1 run data get entity @s Pos[1]`,
    `$execute store result storage aom:data players.$(key).ow.z double 1 run data get entity @s Pos[2]`,
    `$data modify storage aom:data players.$(key).ow.dimension set from entity @s Dimension`,
  ]);

  const portalTeleport = d.defineFunction("player/second/teleport", [
    `$execute in $(dimension) run tp @s $(x) $(y) $(z)`,
    `tellraw @s ${snbt([text("The Nether is not researched yet. Staff a Portal at the University first.", { color: "red" })])}`,
  ]);

  const portalReturn = d.defineFunction("player/second/return", [
    `$execute if data storage aom:data towns.$(town).mechanics.portal run return 0`,
    `$execute unless data storage aom:data players.$(key).ow run return 0`,
    "data remove storage aom:tmp ret2",
    `$data modify storage aom:tmp ret2.dimension set from storage aom:data players.$(key).ow.dimension`,
    `$data modify storage aom:tmp ret2.x set from storage aom:data players.$(key).ow.x`,
    `$data modify storage aom:tmp ret2.y set from storage aom:data players.$(key).ow.y`,
    `$data modify storage aom:tmp ret2.z set from storage aom:data players.$(key).ow.z`,
    `function ${portalTeleport.name} with storage aom:tmp ret2`,
  ]);

  const netherCheck = d.defineFunction("player/second/nether", [
    `$execute unless data storage aom:data players.$(key).town run return 0`,
    "data remove storage aom:tmp ret",
    `$data modify storage aom:tmp ret.town set from storage aom:data players.$(key).town`,
    `$data modify storage aom:tmp ret.key set value "$(key)"`,
    `execute if data storage aom:tmp ret.town run function ${portalReturn.name} with storage aom:tmp ret`,
  ]);

  const secondCheck = d.defineFunction("player/second/check", [
    "scoreboard players set #depth aom.tmp 62",
    "data remove storage aom:tmp pstown",
    `$data modify storage aom:tmp pstown.town set from storage aom:data players.$(key).town`,
    `$data modify storage aom:tmp pstown.key set value "$(key)"`,
    `execute if data storage aom:tmp pstown.town run function ${depthTown.name} with storage aom:tmp pstown`,
    "scoreboard players set #y aom.tmp 0",
    "execute store result score #y aom.tmp run data get entity @s Pos[1]",
    "execute if entity @s[nbt={Dimension:\"minecraft:overworld\"}] if score #y aom.tmp < #depth aom.tmp run effect give @s minecraft:mining_fatigue 3 0 true",
    `execute if entity @s[nbt={Dimension:"minecraft:overworld"}] run function ${recordOverworld.name} with storage aom:tmp ps`,
    `execute if entity @s[nbt={Dimension:"minecraft:the_nether"}] run function ${netherCheck.name} with storage aom:tmp ps`,
  ]);

  const playerSecond = d.defineFunction("player/second", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ps",
    "data modify storage aom:tmp ps.key set from storage aom:tmp player_key",
    `function ${secondCheck.name} with storage aom:tmp ps`,
  ]);

  // -------------------------------------------------------------------------
  // Triggers, load and schedules
  // -------------------------------------------------------------------------

  const busAction = d.defineFunction("internal/triggers/menu/action", [
    "scoreboard players set @s aom.action 0",
    "scoreboard players operation @s aom.action = @s aom.menu",
    `scoreboard players remove @s aom.action ${ACTION_CODE}`,
    `execute if score @s aom.action matches 0 run scoreboard players set @s aom.action ${CONFIRM_ACTION}`,
    `function ${uiAction.name}`,
  ]);

  const triggers = {
    menu: d.defineFunction("internal/triggers/menu", [
      `execute if score @s aom.menu matches ${ACTION_CODE}..1999 run function ${busAction.name}`,
      `execute if score @s aom.menu matches ${DEBUG_CODE}.. run function ${busDebug.name}`,
    ]),
    townInfo: d.defineFunction("internal/triggers/town_info", [
      `function ${townInfo.name}`,
    ]),
    guide: d.defineFunction("internal/triggers/guide", [`function ${guide.name}`]),
  };

  const second = d.ref("second");
  const refresh = d.ref("refresh");

  d.defineFunction(second.path, [
    `schedule function ${second.name} 1s replace`,
    "scoreboard players add #seconds aom.tmp 1",
    `execute if score #seconds aom.tmp matches 60.. run function ${minute.name}`,
    "execute if score #seconds aom.tmp matches 60.. run scoreboard players set #seconds aom.tmp 0",
    `execute as @a run function ${playerSecond.name}`,
  ]);

  d.defineFunction(refresh.path, [
    `schedule function ${refresh.name} 2s replace`,
    `function ${renderSigns.name}`,
  ]);

  const tick = d.defineFunction("tick", [
    ...triggerDispatch([
      { objective: "aom.menu", handler: triggers.menu },
      { objective: "aom.town_info", handler: triggers.townInfo },
      { objective: "aom.guide", handler: triggers.guide },
    ]),
    "",
    `execute as @a[scores={aom.left=1..}] run function ${playerJoin.name}`,
    `execute as @a[tag=!${READY_TAG}] run function ${starter.name}`,
    `execute as @e[type=minecraft:interaction,tag=aom_click] at @s run function ${clickCheck.name}`,
    `execute as @e[type=minecraft:interaction,tag=aom_found] at @s run function ${townFoundCheck.name}`,
    `function ${buildScan.name}`,
  ]);

  const load = d.defineFunction("load", [
    objectiveAdd("aom.population", "dummy"),
    objectiveAdd("aom.employed", "dummy"),
    objectiveAdd("aom.members", "dummy"),
    objectiveAdd("aom.build_acc", "dummy"),
    objectiveAdd("aom.players.ray", "dummy"),
    objectiveAdd("aom.tmp", "dummy"),
    objectiveAdd("aom.left", "minecraft.custom:minecraft.leave_game"),
    "scoreboard objectives remove aom.action",
    "scoreboard objectives remove aom.build",
    "scoreboard objectives remove aom.page",
    "scoreboard objectives remove aom.create_town",
    objectiveAdd("aom.menu", "trigger"),
    objectiveAdd("aom.town_info", "trigger"),
    objectiveAdd("aom.guide", "trigger"),
    objectiveAdd("aom.action", "dummy"),
    "",
    gamerule("limited_crafting", true),
    "",
    ...[...new Set([8, 10, ...BUILDINGS.flatMap((type) =>
      type.jobs.flatMap((job) => (job.capacity ? [job.capacity] : [])),
    )])].map((value) => `scoreboard players set ${value} aom.tmp ${value}`),
    "scoreboard players set #min aom.tmp 0",
    "scoreboard players set #seconds aom.tmp 0",
    "",
    ...PLANS.map((plan) => `advancement revoke @a only aom:plan_${plan.id}_place`),
    ...RESOURCES.map((res) => `advancement revoke @a only aom:discover/${res.id}`),
    "",
    // A full recipe/advancement re-sync so recipe-list changes take effect.
    `execute as @a run function ${playerResync.name}`,
    "",
    scheduleFunction(second, "1s"),
    scheduleFunction(refresh, "1s"),
  ]);

  d.onLoad(load);
  d.onTick(tick);

  defineUninstall(d, {
    objectives: [
      "aom.population",
      "aom.employed",
      "aom.members",
      "aom.build_acc",
      "aom.players.ray",
      "aom.tmp",
      "aom.left",
      "aom.menu",
      "aom.create_town",
      "aom.page",
      "aom.town_info",
      "aom.guide",
      "aom.build",
      "aom.action",
    ],
    storage: [
      "aom:data players",
      "aom:data towns",
      "aom:tmp anchor",
      "aom:tmp chat",
      "aom:tmp check",
      "aom:tmp confirm",
      "aom:tmp ctx",
      "aom:tmp det",
      "aom:tmp disc",
      "aom:tmp disc2",
      "aom:tmp do",
      "aom:tmp found",
      "aom:tmp give",
      "aom:tmp guide",
      "aom:tmp join",
      "aom:tmp key",
      "aom:tmp place",
      "aom:tmp player_key",
      "aom:tmp ps",
      "aom:tmp pstown",
      "aom:tmp req",
      "aom:tmp ret",
      "aom:tmp ret2",
      "aom:tmp summary",
      "aom:tmp town",
    ],
    kill: [
      "@e[type=minecraft:marker,tag=aom_anchor]",
      "@e[type=minecraft:marker,tag=aom_tmp_pos]",
      "@e[type=minecraft:interaction,tag=aom_click]",
      "@e[type=minecraft:interaction,tag=aom_found]",
    ],
    tags: [READY_TAG],
    schedules: ["aom:second", "aom:refresh"],
  });

  return d;
}
