import {
  Datapack,
  anchors,
  anchorOf,
  castRay,
  defineUninstall,
  findAnchorAt,
  latestVersion,
  nbt,
  objectiveAdd,
  raycast,
  recipeTake,
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
  BUILDINGS,
  BUILD_MENU_BUILDINGS,
  CONFIRM_ACTION,
  INDUSTRIAL_BUILDINGS,
  STORAGE_AMOUNTS,
  TOWNHALL_ACTIONS,
  TOWNHOUSE_ACTIONS,
  UNLOCKS,
  buildingResources,
  deleteAction,
  generationJobs,
  storageAction,
  storageJobs,
  type BuildingType,
  type Job,
  type Resource,
} from "./registry.ts";

const MARKER_ANCHOR = anchors();
const MARKER_TMP = "@e[type=minecraft:marker,tag=aom_tmp_pos,limit=1]";
const SIGN_BLOCK = "#minecraft:signs";

const RAY_OBJECTIVE = "aom.players.ray";

// Chat menu buttons run through the always-enabled `aom.menu` trigger so the
// real command (action / build choice) stays out of `/trigger` completion.
// These offsets keep those hidden values clear of the "open menu" range.
const ACTION_CODE = 1000;
const BUILD_CODE = 2000;

interface Plan {
  readonly id: string;
  readonly ingredients: readonly string[];
  readonly label: string;
  readonly lore: string;
}

// Plans are signs, so you place the anchor exactly where you want it (floor or
// wall). The item carries its own type in `custom_data`, so it works whether it
// was crafted or recovered from a packed building. The townhall plan is also
// how a town is founded: placing it outside a town starts a founding site.
const PLAN_SIGN = "minecraft:oak_sign";
const PLANS: readonly Plan[] = [
  { id: "townhouse", ingredients: ["minecraft:oak_planks", "minecraft:stick"], label: "Townhouse Plan", lore: "Craft, then place a sign to build a townhouse" },
  { id: "lumbermill", ingredients: ["minecraft:oak_log", "minecraft:stick"], label: "Lumbermill Plan", lore: "Craft, then place a sign to build a lumbermill" },
  { id: "townhall", ingredients: ["minecraft:oak_planks", "minecraft:dirt"], label: "Townhall Plan", lore: "Place to found a town, or to rebuild a townhall" },
];

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

/** The item a building is returned as when it is deleted. */
const planItem = (plan: Plan): string =>
  JSON.stringify({
    id: PLAN_SIGN,
    count: 1,
    components: planComponents(plan),
  });

/** Cancelling a founding hands the Townhall Plan back. */
const townhallPlanItem = planItem(planById("townhall"));

// Deletion returns the building's plan, so every building needs one.
const planFor = (type: BuildingType): Plan => {
  try {
    return planById(type.id);
  } catch {
    throw new Error(`Building ${type.id} has no plan to return on removal`);
  }
};

// A selector without a positional argument (distance/x/dx/...) already
// searches every dimension, so anchors are iterated with a single unpositioned
// selector rather than once per dimension.
const eachAnchor = (command: string): Lines => [
  `execute as ${MARKER_ANCHOR} at @s align xyz run ${command}`,
];

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
  const giveOne = d.defineFunction("internal/give/one", [
    `$give @s $(item) $(count)`,
  ]);
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

  /** Resolves a per-type function collected in a lookup map. */
  const refOf = (refs: Map<string, FunctionRef>, id: string): FunctionRef => {
    const ref = refs.get(id);
    if (!ref) throw new Error(`Missing function for ${id}`);
    return ref;
  };

  /** Guard for a line that only runs for one building type. */
  const typeCommand = (type: BuildingType, command: string): string =>
    `$execute if data storage aom:data towns.$(town).buildings.$(building){type:"${type.id}"} run ${command}`;

  const typeDispatch = (
    types: readonly BuildingType[],
    command: (type: BuildingType) => string,
  ): Lines => types.map((type) => typeCommand(type, command(type)));

  /** Resolves the caller's key into `aom:tmp <storage>` and calls the handler.
   *  `extra` is emitted between the key and the call, for handlers that take
   *  more than the key. */
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

  /** `#capacity` = the storage jobs' combined capacity for one resource. */
  // `ui/menu/show` is defined with the other menus further down; founding and
  // placement both open a menu through this handle.
  const showBuildingMenu = d.ref("ui/menu/show");

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

  // -------------------------------------------------------------------------
  // Raycasts
  // -------------------------------------------------------------------------

  const anchorRay = raycast(d, {
    path: "internal/ray/anchors",
    test: SIGN_BLOCK,
    objective: RAY_OBJECTIVE,
  });

  // -------------------------------------------------------------------------
  // Player helpers
  // -------------------------------------------------------------------------

  const syncAllRef = d.ref("jobs/unlock/sync_all");

  const clearUnlocks = d.defineFunction(
    "player/clear_unlocks",
    UNLOCKS.flatMap((unlock) =>
      unlock.recipes.map((recipe) => recipeTake("@s", recipe)),
    ),
  );

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
  ]);

  const playerJoinDispatch = d.defineFunction("player/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run return 0`,
    `$data modify storage aom:tmp join.town set from storage aom:data players.$(key).town`,
    `function ${playerJoinSync.name} with storage aom:tmp join`,
  ]);

  const playerJoin = d.defineFunction("player/join", [
    "scoreboard players set @s aom.left 0",
    ...playerCall(playerJoinDispatch, "join"),
  ]);

  // -------------------------------------------------------------------------
  // Unlocks
  // -------------------------------------------------------------------------

  const unlockSyncRefs: FunctionRef[] = [];
  for (const unlock of UNLOCKS) {
    const checks = BUILDINGS.flatMap((type) => {
      const job = type.jobs.find((entry) => entry.unlock === unlock.id);
      if (!job) return [];
      return [{
        type,
        ref: d.defineFunction(`jobs/unlock/${unlock.id}/check/${type.id}`, [
          "scoreboard players set #u aom.tmp 0",
          `$execute store result score #u aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          "execute if score #u aom.tmp matches 1.. run scoreboard players set #active aom.tmp 1",
        ]),
      }];
    });

    const checkDispatch = d.defineFunction(
      `jobs/unlock/${unlock.id}/check/dispatch`,
      checks.map(({ type, ref }) =>
        typeCommand(
          type,
          `function ${ref.name} {"town":"$(town)","building":$(building)}`,
        ),
      ),
    );

    const check = d.defineFunction(`jobs/unlock/${unlock.id}/check`, [
      "data remove storage aom:tmp unlock",
      "data modify storage aom:tmp unlock set from entity @s data.aom",
      `execute if data storage aom:tmp unlock run function ${checkDispatch.name} with storage aom:tmp unlock`,
    ]);

    unlockSyncRefs.push(d.defineFunction(`jobs/unlock/${unlock.id}/sync`, [
      "scoreboard players set #active aom.tmp 0",
      `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run function ${check.name}`,
      ...unlock.recipes.map(
        (recipe) =>
          `$execute if score #active aom.tmp matches 1.. as @a[tag=aom_member_$(town)] run recipe give @s ${recipe}`,
      ),
      ...unlock.recipes.map(
        (recipe) =>
          `$execute if score #active aom.tmp matches 0 as @a[tag=aom_member_$(town)] run recipe take @s ${recipe}`,
      ),
    ]));
  }

  d.defineFunction(syncAllRef.path, [
    ...unlockSyncRefs.map(
      (ref) => `$function ${ref.name} {"town":"$(town)"}`,
    ),
  ]);

  // -------------------------------------------------------------------------
  // Hiring and firing
  // -------------------------------------------------------------------------

  const unemployedGuardMacro: Lines = [
    "$scoreboard players operation #u aom.tmp = $(town) aom.population",
    "$scoreboard players operation #u aom.tmp -= $(town) aom.employed",
    `execute if score #u aom.tmp matches ..0 run ${err("@s", "You have no unemployed villagers.")}`,
    "execute if score #u aom.tmp matches ..0 run return fail",
  ];

  const hireRefs = new Map<string, FunctionRef>();
  for (const type of INDUSTRIAL_BUILDINGS) {
    for (const job of type.jobs) {
      const readJobScore = jobScore(job.id);
      const hireSpecific: Lines =
        job.kind === "unlock"
          ? [
              ...readJobScore,
              `execute if score #w aom.tmp matches 1.. run ${err("@s", "This job is already staffed.")}`,
              "execute if score #w aom.tmp matches 1.. run return fail",
              `$data modify storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} set value 1`,
              `$scoreboard players add $(town) aom.employed 1`,
              `$function ${syncAllRef.name} {"town":"$(town)"}`,
            ]
          : [
              ...readJobScore,
              "scoreboard players add #w aom.tmp 1",
              `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
              `$scoreboard players add $(town) aom.employed 1`,
            ];

      hireRefs.set(
        `${type.id}/${job.id}`,
        d.defineFunction(
          `jobs/hire/${type.id}/${job.id}`,
          [...unemployedGuardMacro, ...hireSpecific],
        ),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  const generationRefs = new Map<string, FunctionRef>();
  for (const type of INDUSTRIAL_BUILDINGS) {
    const lines: Lines = [];
    for (const res of buildingResources(type)) {
      const generators = generationJobs(type, res.id);
      if (generators.length === 0) continue;
      lines.push(
        "scoreboard players set #workers aom.tmp 0",
        ...generators.flatMap((job) => [
          "scoreboard players set #gen aom.tmp 0",
          `$execute store result score #gen aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `scoreboard players operation #workers aom.tmp += #gen aom.tmp`,
        ]),
        ...capacityFor(type, res),
      );
      lines.push(
        "scoreboard players set #stored aom.tmp 0",
        `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        "scoreboard players operation #new aom.tmp = #stored aom.tmp",
        "scoreboard players operation #new aom.tmp += #workers aom.tmp",
        "execute if score #new aom.tmp > #capacity aom.tmp run scoreboard players operation #new aom.tmp = #capacity aom.tmp",
        `$execute if score #workers aom.tmp matches 1.. store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #new aom.tmp`,
      );
    }
    if (lines.length) {
      generationRefs.set(
        type.id,
        d.defineFunction(`jobs/generate/${type.id}`, lines),
      );
    }
  }

  const generateDispatch = d.defineFunction(
    "jobs/generate/dispatch",
    INDUSTRIAL_BUILDINGS.flatMap((type) => {
      const ref = generationRefs.get(type.id);
      if (!ref) return [];
      return [
        typeCommand(
          type,
          `function ${ref.name} {"town":"$(town)","building":$(building)}`,
        ),
      ];
    }),
  );

  const jobsGenerate = d.defineFunction("jobs/generate", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${generateDispatch.name} with storage aom:tmp anchor`,
  ]);

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  const depositRefs = new Map<string, FunctionRef>();
  const withdrawRefs = new Map<string, FunctionRef>();
  for (const type of INDUSTRIAL_BUILDINGS) {
    for (const res of buildingResources(type)) {
      depositRefs.set(
        `${type.id}/${res.id}`,
        d.defineFunction(`storage/deposit/${type.id}/${res.id}`, [
          `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
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
  // Building summaries (shared by sign, book and chat rendering)
  // -------------------------------------------------------------------------

  const summaryRefs = new Map<string, FunctionRef>();
  for (const type of INDUSTRIAL_BUILDINGS) {
    const lines: Lines = [];
    lines.push("scoreboard players set #employed aom.tmp 0");
    for (const job of type.jobs) {
      lines.push(
        `data modify storage aom:tmp summary.workers_${job.id} set value 0`,
        `$execute store result storage aom:tmp summary.workers_${job.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players set #cap aom.tmp 0",
        `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players operation #employed aom.tmp += #cap aom.tmp",
      );
    }
    lines.push(
      "execute store result storage aom:tmp summary.employed int 1 run scoreboard players get #employed aom.tmp",
    );
    for (const res of buildingResources(type)) {
      lines.push(
        `data modify storage aom:tmp summary.stored_${res.id} set value 0`,
        `$execute store result storage aom:tmp summary.stored_${res.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        `data modify storage aom:tmp summary.capacity_${res.id} set value 0`,
        ...capacityFor(type, res),
        `execute store result storage aom:tmp summary.capacity_${res.id} int 1 run scoreboard players get #capacity aom.tmp`,
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
    ]),
  );

  summaryRefs.set(
    "townhouse",
    d.defineFunction("ui/summary/load/townhouse", [
      `data modify storage aom:tmp summary.villagers set value 0`,
      `$execute store result storage aom:tmp summary.villagers int 1 run data get storage aom:data towns.$(town).buildings.$(building).villagers`,
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
        text("Population: $(population)", { color: "yellow" }),
        text("Members: $(members)", { color: "aqua" }),
        text("$(town)", { color: "green" }),
      ])}`,
    ]),
  );
  renderSignRefs.set(
    "townhouse",
    d.defineFunction("ui/render_sign/townhouse", [
      `$data modify block ~ ~ ~ front_text.messages set value ${snbt([
        text("Townhouse", { color: "gold", bold: true }),
        text("Villagers: $(villagers)", { color: "white" }),
        text("", { color: "gray" }),
        text("$(town)", { color: "green" }),
      ])}`,
    ]),
  );

  for (const type of INDUSTRIAL_BUILDINGS) {
    const lines = [
      text(type.label, { color: "gold", bold: true }),
      text("Workers: $(employed)", { color: "white" }),
      text("", { color: "gray" }),
      text("$(town)", { color: "green" }),
    ];
    renderSignRefs.set(
      type.id,
      d.defineFunction(`ui/render_sign/${type.id}`, [
        `$data modify block ~ ~ ~ front_text.messages set value ${snbt(lines)}`,
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

  // Older anchors predate the stored type; stamp it on so menus can dispatch.
  const renderSignsType = d.defineFunction("ui/render_signs/type", [
    `$data modify entity @s data.aom.type set from storage aom:data towns.$(town).buildings.$(building).type`,
  ]);

  const renderSignsAnchor = d.defineFunction("ui/render_signs/anchor", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    // Only touch signs: an anchor on a non-sign block must not clobber it.
    "execute unless block ~ ~ ~ " + SIGN_BLOCK + " run return fail",
    // Flip the glow flag both ways so the block entity is always marked
    // changed and clients are sent a fresh block-entity update even when the
    // text itself is unchanged.
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
    if (type.category === "townhouse") {
      parts = [
        text(`\n${type.label} #$(building)`, { color: "white" }),
        text(" · Villagers ", { color: "gray" }),
        text("$(villagers)", { color: "aqua" }),
      ];
    } else if (type.category === "industrial") {
      parts = [
        text(`\n${type.label} #$(building)`, { color: "white" }),
        ...type.jobs.flatMap((job) => [
          text(` · ${job.label} `, { color: "gray" }),
          text(`$(workers_${job.id})`, { color: "aqua" }),
        ]),
        ...buildingResources(type).flatMap((res) => [
          text(` · ${res.label} `, { color: "gray" }),
          text(`$(stored_${res.id})/$(capacity_${res.id})`, { color: "aqua" }),
        ]),
      ];
    } else {
      parts = [text(`\n${type.label} #$(building)`, { color: "white" })];
    }
    chatLineRefs.set(
      type.id,
      d.defineFunction(`ui/chat_page/line/${type.id}`, [
        `$data modify storage aom:tmp chat.lines append value ${snbt(parts)}`,
      ]),
    );
  }

  const chatPageAppend = d.defineFunction("ui/chat_page/append", typeDispatch(
    BUILDINGS,
    (type) =>
      `function ${refOf(chatLineRefs, type.id).name} with storage aom:tmp summary`,
  ));

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
      menuButton(
        "Yes",
        `trigger aom.menu set ${ACTION_CODE}`,
        "Confirm",
        "red",
      ),
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
    `$tellraw @a ${snbt([{ selector: "@s", color: "gray" }, text(" joined ", { color: "gray" }), text("$(town)", { color: "aqua" }), text(".", { color: "gray" })])}`,
  ]);

  const townJoinDispatch = d.defineFunction("town/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.town run tellraw @s ${snbt([text("Stand next to a townhall sign and run /trigger aom.menu first.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    `function ${townJoinCheck.name} with storage aom:tmp ctx`,
  ]);

  const townJoin = d.defineFunction("town/join", playerCall(townJoinDispatch));

  const townVillager = d.defineFunction("town/villager", [
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building){type:"townhouse"} run return fail`,
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
      text("Villagers from this townhouse: ", { color: "yellow" }),
      nbt("towns.$(town).buildings.$(building).villagers", {
        storage: "aom:data",
      }, { color: "aqua" }),
    ])}`,
  ]);

  // Validates the town name and creates the town on the sign the caller faces.
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
    // Align first: `positioned` may be fractional, so `~.5` would drift.
    `$execute align xyz run ${summonAnchor("~.5 ~.5 ~.5", { town: "$(name)", building: 1, type: "townhall" })}`,
    `$execute as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(name)",building:1}}}] at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_click"],width:1.0f,height:1.0f,response:0b,data:{aom:{town:"$(name)",building:1,type:"townhall"}}}`,
    "execute align xyz run " + waxSign("~ ~ ~"),
    // The founder joins immediately.
    `$data modify storage aom:data towns.$(name).members.$(key) set value {}`,
    `$data modify storage aom:data players.$(key).town set value "$(name)"`,
    `$scoreboard players add $(name) aom.members 1`,
    `$tag @s add aom_member_$(name)`,
    `$function ${syncAllRef.name} {"town":"$(name)"}`,
    `$function ${renderSignsDispatch.name} {"town":"$(name)","building":1}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "green" }, text(" founded the town of ", { color: "green" }), text("$(name)", { color: "aqua" }), text("!", { color: "green" })])}`,
    // Open the townhall menu, with the new town hall armed for its buttons.
    `$data modify storage aom:tmp anchor set value {town:"$(name)",building:1,type:"townhall"}`,
    `$function ${showBuildingMenu.name}`,
  ]);

  // -------------------------------------------------------------------------
  // Town info (chat pages)
  // -------------------------------------------------------------------------

  // Navigation differs by entry point: the standalone `/trigger aom.town_info`
  // pages use that trigger, while the townhall menu's pages reuse the menu bus
  // and re-render the menu. `aom:tmp chat.nav` selects which.
  const infoNavPrev = text("[<] ", {
    color: "green",
    click_event: {
      action: "run_command",
      command: "/trigger aom.town_info set 2",
    },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const infoNavNext = text("[>]", {
    color: "green",
    click_event: {
      action: "run_command",
      command: "/trigger aom.town_info set 3",
    },
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
      score("$(town)", "aom.population", { color: "aqua" }),
      text("\nMembers: ", { color: "gray" }),
      score("$(town)", "aom.members", { color: "aqua" }),
      text("\nEmployed: ", { color: "gray" }),
      score("$(town)", "aom.employed", { color: "aqua" }),
      text("\nUnemployed: ", { color: "gray" }),
      score("#u", "aom.tmp", { color: "aqua" }),
      text("\nBuildings: ", { color: "gray" }),
      score("#b", "aom.tmp", { color: "aqua" }),
    ])}`,
  ]);

  const townInfoNav = d.defineFunction("town/info/nav", [
    "data modify storage aom:tmp chat.nav set value []",
    // Standalone info pages navigate through `aom.town_info`.
    `execute unless data storage aom:tmp chat{nav:"menu"} if score #p aom.tmp matches 2.. run data modify storage aom:tmp chat.nav append value ${snbt(infoNavPrev)}`,
    `execute unless data storage aom:tmp chat{nav:"menu"} unless score #p aom.tmp >= #t aom.tmp run data modify storage aom:tmp chat.nav append value ${snbt(infoNavNext)}`,
    // The townhall menu's pages navigate through the menu bus, re-rendering it.
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
    // Menu pages carry the action code; standalone pages use the trigger values.
    `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev} run function ${townInfoPrev.name} with storage aom:tmp chat`,
    `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pageNext} run function ${townInfoNext.name} with storage aom:tmp chat`,
    `execute unless score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} if score @s aom.town_info matches 2..2 run function ${townInfoPrev.name} with storage aom:tmp chat`,
    `execute unless score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} if score @s aom.town_info matches 3..3 run function ${townInfoNext.name} with storage aom:tmp chat`,
    "scoreboard players set #p aom.tmp 0",
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    // total pages = 2 fixed pages + one per 8 buildings
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

  // `/trigger aom.town_info` shows the same pages from anywhere, without a sign.
  const townInfoDispatch = d.defineFunction("town/info/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    "scoreboard players set @s aom.action 0",
    `$data modify storage aom:tmp chat.town set from storage aom:data players.$(key).town`,
    `data remove storage aom:tmp chat.nav`,
    // A bare `/trigger aom.town_info` sets 1: start again at page 1. The nav
    // buttons set 2/3, which keep the current page.
    `execute if score @s aom.town_info matches 1..1 run data modify storage aom:data players.$(key).page set value 1`,
    `$execute unless data storage aom:data players.$(key).page run data modify storage aom:data players.$(key).page set value 1`,
    `function ${townInfoPage.name} with storage aom:tmp chat`,
  ]);

  const townInfo = d.defineFunction("town/info", [
    ...playerCall(townInfoDispatch, "chat"),
  ]);

  // -------------------------------------------------------------------------
  // Building: removal and scanning
  // -------------------------------------------------------------------------

  // Anchor cleanup, run as the anchor marker.
  const buildRemoveAnchor = d.defineFunction("build/remove/anchor", [
    `$kill @e[type=minecraft:interaction,tag=aom_click,nbt={data:{aom:{town:"$(town)",building:$(building)}}}]`,
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  // Packing pushes the building (workers/villagers/storage included) onto the
  // town's per-type stack `packed.<type>`; placing a plan of that type pops it.
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
    const plan = planFor(type);
    // Breaking a built sign drops a plain sign item (and sometimes a plan item
    // with its `custom_data`). Kill any dropped sign on the block, then refund
    // exactly one, so breaking a sign can never duplicate it.
    const dropSelector =
      `@e[type=minecraft:item,distance=..1.5,nbt={Item:{id:"${PLAN_SIGN}"}}]`;
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

  const buildScanDispatch = d.defineFunction("build/scan/dispatch", typeDispatch(
    BUILDINGS,
    (type) =>
      `function ${refOf(scanRefs, type.id).name} {"town":"$(town)","building":$(building)}`,
  ));

  const buildScanOne = d.defineFunction("build/scan/one", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${buildScanDispatch.name} with storage aom:tmp anchor`,
  ]);

  const buildScan = d.defineFunction(
    "build/scan",
    eachAnchor(`function ${buildScanOne.name}`),
  );

  // -------------------------------------------------------------------------
  // Building: placement
  // -------------------------------------------------------------------------

  // The anchor is placed with absolute coordinates: `positioned` plus relative
  // `~.5` proved unreliable here, while absolute coordinates are exact.
  const anchorSelector = (): string =>
    anchorOf({ town: "$(town)", building: "$(id)" });

  const placeCreateRefs = new Map<string, FunctionRef>();
  for (const type of BUILD_MENU_BUILDINGS) {
    const hookLines: Lines =
      type.category === "townhouse"
        ? [
            `$data modify storage aom:data towns.$(town).buildings.$(id).villagers set value 1`,
            `$scoreboard players add $(town) aom.population 1`,
            `$execute as ${anchorSelector()} at @s run ${waxSign("~ ~ ~")}`,
            `tellraw @s ${snbt([text("Built a townhouse.", { color: "green" })])}`,
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
    // Self-heal: exactly one anchor marker per building, at the sign block.
    `$kill ${anchorSelector()}`,
    // Align first: the stored sign coords may be fractional, and `~.5` from a
    // fractional base would put the anchor off the sign block.
    `$execute in $(dimension) positioned $(x) $(y) $(z) align xyz run ${summonAnchor("~.5 ~.5 ~.5", { town: "$(town)", building: "$(id)", type: "$(type)" })}`,
    `$kill @e[type=minecraft:interaction,tag=aom_click,nbt={data:{aom:{town:"$(town)",building:$(id)}}}]`,
    `$execute as ${anchorSelector()} at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_click"],width:1.0f,height:1.0f,response:0b,data:{aom:{town:"$(town)",building:$(id),type:"$(type)"}}}`,
    `$execute unless entity ${anchorSelector()} run tellraw @s ${snbt([text("[aom] anchor marker was not created", { color: "red" })])}`,
    `$execute as ${anchorSelector()} at @s run function ${renderSignsDispatch.name} {"town":"$(town)","building":$(id)}`,
    // Open the new building's menu straight away.
    `$data modify storage aom:tmp anchor set value {town:"$(town)",building:$(id),type:"$(type)"}`,
    `$function ${showBuildingMenu.name}`,
  ]);

  // Restores a packed building (workers/villagers/storage intact) at this sign.
  const placeRestore = d.defineFunction("build/place/restore", [
    `$data modify storage aom:data towns.$(town).buildings.$(id) set from storage aom:data towns.$(town).packed.$(type)[-1]`,
    `$data remove storage aom:data towns.$(town).packed.$(type)[-1]`,
    `$function ${syncAllRef.name} {"town":"$(town)"}`,
    `$execute as ${anchorSelector()} at @s run ${waxSign("~ ~ ~")}`,
    `tellraw @s ${snbt([text("Building restored.", { color: "green" })])}`,
    `function ${placeFinish.name} with storage aom:tmp place`,
  ]);

  // A new building starts empty.
  const placeFresh = d.defineFunction("build/place/fresh", [
    `$data modify storage aom:data towns.$(town).buildings.$(id) set value {type:"$(type)",jobs:{},storage:{}}`,
    // The place arguments carry the building number as `id`, not `building`.
    ...BUILD_MENU_BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(id){type:"${type.id}"} run function ${refOf(placeCreateRefs, type.id).name} with storage aom:tmp place`,
    ),
    `function ${placeFinish.name} with storage aom:tmp place`,
  ]);

  const placeCreate = d.defineFunction("build/place/create", [
    `$execute in $(dimension) run ${summonAnchor("$(x) $(y) $(z)", { town: "$(town)", building: "$(id)", type: "$(type)" })}`,
    // Decide restore-vs-fresh before either branch runs: restore deletes the
    // packed entry, so re-testing `packed` afterwards would also run fresh.
    "data remove storage aom:tmp restore",
    `$execute if data storage aom:data towns.$(town).packed.$(type)[0] run data modify storage aom:tmp restore set value 1`,
    `execute if data storage aom:tmp restore run function ${placeRestore.name} with storage aom:tmp place`,
    `execute unless data storage aom:tmp restore run function ${placeFresh.name} with storage aom:tmp place`,
  ]);

  const placeCheck = d.defineFunction("build/place/check", [
    // Absolute-coordinate checks so they never depend on the execution position.
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

  const placeRefs = new Map<string, FunctionRef>();
  for (const type of BUILD_MENU_BUILDINGS) {
    placeRefs.set(
      type.id,
      d.defineFunction(`build/place/${type.id}`, [
        `data modify storage aom:tmp place.type set value "${type.id}"`,
        `function ${placeCommon.name} with storage aom:tmp place`,
      ]),
    );
  }

  const buildSetDispatch = d.defineFunction("build/set/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.sign run tellraw @s ${snbt([text("Place a sign, look at it and run /trigger aom.menu first.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.sign run return fail`,
    "data remove storage aom:tmp place",
    `$data modify storage aom:tmp place.key set value "$(key)"`,
    `$data modify storage aom:tmp place.x set from storage aom:data players.$(key).pending.sign.x`,
    `$data modify storage aom:tmp place.y set from storage aom:data players.$(key).pending.sign.y`,
    `$data modify storage aom:tmp place.z set from storage aom:data players.$(key).pending.sign.z`,
    `$data modify storage aom:tmp place.dimension set from storage aom:data players.$(key).pending.sign.dimension`,
    ...BUILD_MENU_BUILDINGS.map(
      (type, index) =>
        `execute if score @s aom.action matches ${index + 1} run function ${refOf(placeRefs, type.id).name} with storage aom:tmp place`,
    ),
  ]);

  const buildSet = d.defineFunction("build/set", [
    "execute unless score @s aom.action matches 1.. run return fail",
    ...playerCall(buildSetDispatch),
  ]);

  const buildMenu = d.defineFunction("ui/build/menu", [
    tellraw("@s", [
      text("=== Build ===\n", { color: "gold", bold: true }),
      text("Look at the sign you want to build on, then pick:\n", {
        color: "gray",
      }),
      ...BUILD_MENU_BUILDINGS.flatMap((type, index) => [
        menuButton(
          type.label,
          `trigger aom.menu set ${BUILD_CODE + index + 1}`,
          `Build a ${type.label}`,
        ),
        text(` ${type.description}\n`, { color: "dark_gray" }),
      ]),
      text("\nYou do not need to write anything on the sign.", {
        color: "dark_gray",
      }),
    ]),
  ]);

  const buildCreateDispatch = d.defineFunction("build/create/dispatch", [
    // Building needs an existing town; found one with a Townhall Plan.
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town. Place a Townhall Plan to found one.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    "execute align xyz run summon minecraft:marker ~ ~ ~ {Tags:[\"aom_tmp_pos\"]}",
    `$data modify storage aom:data players.$(key).pending.sign set value {}`,
    `$execute store result storage aom:data players.$(key).pending.sign.x int 1 run data get entity ${MARKER_TMP} Pos[0]`,
    `$execute store result storage aom:data players.$(key).pending.sign.y int 1 run data get entity ${MARKER_TMP} Pos[1]`,
    `$execute store result storage aom:data players.$(key).pending.sign.z int 1 run data get entity ${MARKER_TMP} Pos[2]`,
    "kill @e[type=minecraft:marker,tag=aom_tmp_pos]",
    `$data modify storage aom:data players.$(key).pending.sign.dimension set from entity @s Dimension`,
    `function ${buildMenu.name}`,
  ]);

  const buildCreateAt = d.defineFunction("build/create/at", [
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @s ${snbt([text("You must look at a sign.", { color: "red" })])}`,
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run return fail`,
    `execute if entity ${findAnchorAt()} run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `execute if entity ${findAnchorAt()} run return fail`,
    ...playerCall(buildCreateDispatch),
  ]);

  const buildDeleteExec = d.defineFunction("build/delete/exec", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    `$data modify storage aom:tmp ctx.type set from storage aom:data towns.$(town).buildings.$(building).type`,
    // Keep the workers: push the building onto the town's packed stack.
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:tmp ctx{type:"${type.id}"} run function ${refOf(packRefs, type.id).name} with storage aom:tmp ctx`,
    ),
    // The plan drops at the sign; the item names its own type.
    ...BUILDINGS.map((type) => {
      const plan = planFor(type);
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
  // UI: menu, actions, confirmation
  // -------------------------------------------------------------------------

  // The townhall menu *is* the town info: its pages and navigation are followed
  // by the town's action buttons.
  const menuTownhall = d.defineFunction("ui/menu/townhall", [
    `data remove storage aom:tmp chat`,
    `data modify storage aom:tmp chat.town set value "$(town)"`,
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

  const menuTownhouse = d.defineFunction("ui/menu/townhouse", [
    "$" + tellraw("@s", [
      text("Townhouse\n", { color: "gold", bold: true }),
      text("Villagers: ", { color: "gray" }),
      text("$(villagers)\n", { color: "aqua" }),
      menuButton(
        "Add villager",
        `trigger aom.menu set ${ACTION_CODE + TOWNHOUSE_ACTIONS.addVillager}`,
        "Add a villager",
        "green",
      ),
      " ",
      menuButton(
        "Remove villager",
        `trigger aom.menu set ${ACTION_CODE + TOWNHOUSE_ACTIONS.removeVillager}`,
        "Remove a villager",
        "red",
      ),
      "\n",
      menuButton(
        "Delete building",
        `trigger aom.menu set ${ACTION_CODE + TOWNHOUSE_ACTIONS.delete}`,
        "Delete this building",
        "red",
      ),
    ]),
  ]);

  const menuRefs = new Map<string, FunctionRef>();
  for (const type of INDUSTRIAL_BUILDINGS) {
    const parts: TextComponent[] = [
      text(`${type.label}\n`, { color: "gold", bold: true }),
    ];
    const jobLine = (job: Job, index: number): void => {
      parts.push(
        text(`  ${job.label}: `, { color: "gray" }),
        text(`$(workers_${job.id}) `, { color: "aqua" }),
        menuButton(
          "Hire",
          `trigger aom.menu set ${ACTION_CODE + index + 1}`,
          `Hire a ${job.label}`,
          "green",
        ),
        "\n",
      );
    };
    // Jobs that do not use a resource (recipe unlocks) first.
    type.jobs.forEach((job, index) => {
      if (job.kind === "unlock") jobLine(job, index);
    });
    buildingResources(type).forEach((res, resourceIndex) => {
      parts.push(text(`${res.label}:\n`, { color: "gold" }));
      type.jobs.forEach((job, index) => {
        if (job.resource === res.id) jobLine(job, index);
      });
      parts.push(text("  ", { color: "gray" }));
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
      parts.push(
        text("[", { color: "gray" }),
        text(`$(stored_${res.id})`, { color: "yellow" }),
        text("/", { color: "gray" }),
        text(`$(capacity_${res.id})`, { color: "yellow" }),
        text("] ", { color: "gray" }),
      );
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
    });
    parts.push(
      menuButton(
        "Delete building",
        `trigger aom.menu set ${ACTION_CODE + deleteAction(type)}`,
        "Delete this building",
        "red",
      ),
    );
    menuRefs.set(
      type.id,
      d.defineFunction(`ui/menu/${type.id}`, ["$" + tellraw("@s", parts)]),
    );
  }

  // Menus are opened from the nearest anchor (stand at the sign), and the
  // anchor carries its building type so the dispatch needs no macro arguments.
  const menuSave = d.defineFunction("ui/menu/save", [
    `$data modify storage aom:data players.$(key).pending set from storage aom:tmp anchor`,
  ]);

  // A freshly opened menu always starts on its first chat page. Re-renders
  // (`ui/menu/refresh`) keep the current page so navigation works.
  const menuResetPageExec = d.defineFunction("ui/menu/reset_page/exec", [
    `$data modify storage aom:data players.$(key).page set value 1`,
  ]);
  const menuResetPage = d.defineFunction("ui/menu/reset_page", [
    ...playerCall(menuResetPageExec),
  ]);

  // Shows the menu for the anchor currently in `aom:tmp anchor` (run as the
  // player). Shared by the raycast (`ui/menu/open`) and right-click on the
  // building's interaction entity (`ui/click/check`).
  const menuShow = d.defineFunction("ui/menu/show", [
    ...playerCall(menuSave),
    `execute if data storage aom:tmp anchor run function ${summaryLoad.name} with storage aom:tmp anchor`,
    ...BUILDINGS.map((type) => {
      const menu = type.category === "townhall"
        ? menuTownhall
        : type.category === "townhouse"
          ? menuTownhouse
          : refOf(menuRefs, type.id);
      const args = type.category === "townhall" ? "anchor" : "summary";
      return `execute if data storage aom:tmp anchor{type:"${type.id}"} run function ${menu.name} with storage aom:tmp ${args}`;
    }),
  ]);

  // Re-shows the building whose action just ran, with fresh data. `aom:tmp
  // menu` is set by `ui/action/dispatch2` and survives the action handlers
  // clobbering `aom:tmp ctx`.
  const menuRefresh = d.defineFunction("ui/menu/refresh", [
    "execute unless data storage aom:tmp menu run return fail",
    "data modify storage aom:tmp anchor set from storage aom:tmp menu",
    `function ${menuShow.name}`,
  ]);

  // Opening the build menu for the sign currently in `aom:tmp anchor`.
  const menuOpen = d.defineFunction("ui/menu/open", [
    "data remove storage aom:tmp anchor",
    `execute if entity ${findAnchorAt()} as ${findAnchorAt()} run data modify storage aom:tmp anchor set from entity @s data.aom`,
    `execute unless data storage aom:tmp anchor at @s as @e[type=minecraft:marker,tag=aom_anchor,distance=..0.9,limit=1,sort=nearest] run data modify storage aom:tmp anchor set from entity @s data.aom`,
    `execute unless data storage aom:tmp anchor at @s as @e[type=minecraft:marker,tag=aom_anchor,distance=..3,limit=1,sort=nearest] run data modify storage aom:tmp anchor set from entity @s data.aom`,
    // No building here: an empty sign starts the build flow instead.
    `execute unless data storage aom:tmp anchor if block ~ ~ ~ ${SIGN_BLOCK} run function ${buildCreateAt.name}`,
    `execute unless data storage aom:tmp anchor unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @s ${snbt([text("Look at a building sign or townhall first.", { color: "red" })])}`,
    "execute unless data storage aom:tmp anchor run return fail",
    `function ${menuResetPage.name}`,
    `function ${menuShow.name}`,
  ]);

  const menuHit = d.defineFunction("ui/menu/hit", [
    `execute align xyz run function ${menuOpen.name}`,
  ]);

  // Right-clicking a building's interaction entity opens that building's menu.
  const clickCheck = d.defineFunction("ui/click/check", [
    "execute unless data entity @s interaction.player run return fail",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `execute as @p[distance=..4] run function ${menuResetPage.name}`,
    `execute as @p[distance=..4] run function ${menuShow.name}`,
  ]);

  const menuMiss = d.defineFunction("ui/menu/miss", [
    err("@s", "Look at a building sign or townhall first."),
  ]);
  const uiMenu = d.defineFunction("ui/menu", [
    castRay(anchorRay, menuHit, menuMiss),
  ]);

  const actionFind = d.defineFunction("ui/action/find", [
    "data remove storage aom:tmp anchor",
    `execute at @s as @e[type=minecraft:marker,tag=aom_anchor,distance=..5,limit=1,sort=nearest] run data modify storage aom:tmp anchor set from entity @s data.aom`,
    `execute unless data storage aom:tmp anchor run tellraw @s ${snbt([text("No building nearby. Stand next to its sign and run /trigger aom.menu.", { color: "red" })])}`,
    "execute unless data storage aom:tmp anchor run return fail",
    ...playerCall(menuSave),
  ]);

  const actionRefs = new Map<string, FunctionRef>();
  for (const type of BUILDINGS) {
    if (type.category === "townhall") {
      actionRefs.set("townhall", d.defineFunction("ui/action/townhall", [
        `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.join} run function ${townJoin.name}`,
        `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.leave} run function ${townLeave.name}`,
        `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.join}..${TOWNHALL_ACTIONS.leave} run function ${menuRefresh.name}`,
        `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.deleteTown} run function ${townDeletePrompt.name} with storage aom:tmp ctx`,
        // Page navigation re-renders the same menu with the new page.
        `execute if score @s aom.action matches ${TOWNHALL_ACTIONS.pagePrev}..${TOWNHALL_ACTIONS.pageNext} run function ${menuRefresh.name}`,
      ]));
      continue;
    }
    if (type.category === "townhouse") {
      actionRefs.set("townhouse", d.defineFunction("ui/action/townhouse", [
        `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
        `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.addVillager} run data modify storage aom:tmp ctx.delta set value 1`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.removeVillager} run data modify storage aom:tmp ctx.delta set value -1`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.addVillager}..${TOWNHOUSE_ACTIONS.removeVillager} run function ${townVillager.name} with storage aom:tmp ctx`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.addVillager}..${TOWNHOUSE_ACTIONS.removeVillager} run function ${menuRefresh.name}`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.delete} run function ${buildDeletePrompt.name} with storage aom:tmp ctx`,
      ]));
      continue;
    }

    const lines: Lines = [
      `$execute unless data storage aom:data players.$(key){town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
      `$execute unless data storage aom:data players.$(key){town:"$(town)"} run return fail`,
    ];
    type.jobs.forEach((job, index) => {
      const key = `${type.id}/${job.id}`;
      lines.push(
        `$execute if score @s aom.action matches ${index + 1} run function ${refOf(hireRefs, key).name} {"key":"$(key)","town":"$(town)","building":$(building)}`,
      );
    });
    buildingResources(type).forEach((res, resourceIndex) => {
      STORAGE_AMOUNTS.forEach((amount, amountIndex) => {
        const deposit = storageAction(type, resourceIndex, "deposit", amountIndex);
        const withdraw = storageAction(
          type,
          resourceIndex,
          "withdraw",
          amountIndex,
        );
        const args = `{"key":"$(key)","town":"$(town)","building":$(building),"amount":${amount.value}}`;
        const key = `${type.id}/${res.id}`;
        lines.push(
          `$execute if score @s aom.action matches ${deposit} run function ${refOf(depositRefs, key).name} ${args}`,
          `$execute if score @s aom.action matches ${withdraw} run function ${refOf(withdrawRefs, key).name} ${args}`,
        );
      });
    });
    lines.push(
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
      (type) => `function ${refOf(actionRefs, type.id).name} with storage aom:tmp ctx`,
    ),
  ]);

  const actionDispatch = d.defineFunction("ui/action/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.building run function ${actionFind.name}`,
    `$execute unless data storage aom:data players.$(key).pending.building run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    `function ${actionDispatch2.name} with storage aom:tmp ctx`,
  ]);

  const actionRun = d.defineFunction(
    "ui/action/run",
    playerCall(actionDispatch),
  );

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
    click_event: {
      action: "run_command",
      command: "/trigger aom.guide set 2",
    },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const guideNextNav = text("[>]", {
    color: "green",
    click_event: {
      action: "run_command",
      command: "/trigger aom.guide set 3",
    },
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
  // Craftable plans: place a token block to found a town / build.
  // -------------------------------------------------------------------------

  // Positioning: step along the view to the sign you are looking at. The step
  // aligns to the hit block *before* calling `on_hit`, so the callback runs at
  // the sign block itself.
  const planRayStep = d.ref("plan/ray/step");
  const planRayStart = d.defineFunction("plan/ray/start", [
    `scoreboard players set @s ${RAY_OBJECTIVE} 50`,
    `$return run function ${planRayStep.name} {on_hit: "$(on_hit)", on_miss: "$(on_miss)"}`,
  ]);
  d.defineFunction(planRayStep.path, [
    `scoreboard players remove @s ${RAY_OBJECTIVE} 1`,
    `$execute if score @s ${RAY_OBJECTIVE} matches ..0 run function $(on_miss)`,
    `execute if score @s ${RAY_OBJECTIVE} matches ..0 run return fail`,
    // Stop at the first sign you look at, even if it is already built: the
    // search around it finds the freshly placed sign next to it.
    `$execute if block ~ ~ ~ ${SIGN_BLOCK} align xyz run function $(on_hit)`,
    `execute if block ~ ~ ~ ${SIGN_BLOCK} align xyz run return 1`,
    `$execute positioned ^ ^ ^0.1 run function ${planRayStep.name} {on_hit: "$(on_hit)", on_miss: "$(on_miss)"}`,
  ]);

  const planLocalTmp =
    "@e[type=minecraft:marker,tag=aom_tmp_pos,distance=..0.2,limit=1,sort=nearest]";

  // Snapshot the current block as `found` and continue.
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

  // How far from the aimed block to look, step by step, before giving up.
  const planSearchRadius = 3;

  // Starting at the aimed block, check this block first, then step back toward
  // the player at increasing distance for a sign without a building.
  const planPlaceSearchFromHere = d.defineFunction("plan/place/search_here", [
    "data remove storage aom:data players.$(key).found",
    `data modify storage aom:data players.$(key).found set value {}`,
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

  // Placing a plan sign builds it: the ray picks the aimed block, then the
  // search accepts that block or one back toward the player.
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
    d.recipe(`plan/${plan.id}`, {
      type: "minecraft:crafting_shapeless",
      ingredients: [...plan.ingredients],
      result: {
        id: PLAN_SIGN,
        count: 1,
        components: planComponents(plan),
      },
    });

    const place = d.defineFunction(`plan/${plan.id}/place`, [
      `advancement revoke @s only aom:plan_${plan.id}_place`,
      `function ${playerKey.name}`,
      "data remove storage aom:tmp ctx",
      "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
      `data modify storage aom:tmp ctx.plan set value "${plan.id}"`,
      `data modify storage aom:tmp ctx.action set value "aom:plan/dispatch"`,
      `function ${planPlacePrepare.name}`,
    ]);

    // Self-describing: placement matches the sign's custom_data, so the same
    // item works whether it was crafted or recovered from a deletion.
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
                    items: PLAN_SIGN,
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

  // --- Founding a town from a placed townhall plan -------------------------
  //
  // Placing a Townhall Plan outside a town summons an `aom_found` interaction
  // on the sign. Writing on the sign is unaffected (the editor opens on
  // placement). Right-clicking confirms and founds the town; left-clicking or
  // breaking the sign cancels. No trigger is involved.

  // Runs as the clicker: validates the sign and founds the town from its name.
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
    `$execute in $(dimension) positioned $(x) $(y) $(z) run function ${townCreateValidate.name} with storage aom:tmp town`,
  ]);

  // Right-click: found the town. The site is cleaned up by the next poll, once
  // the building anchor exists (or, on failure, kept so the player can retry).
  const townFoundConfirm = d.defineFunction("town/found/confirm", [
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `execute as @p[distance=..4] run function ${townFoundRun.name} with storage aom:tmp found`,
  ]);

  // Left-click: cancel, hand the plan back and clear the site.
  const townFoundCancel = d.defineFunction("town/found/cancel", [
    "data remove entity @s interaction",
    "data remove entity @s attack",
    `tellraw @a ${snbt([text("A town founding was cancelled.", { color: "gray" })])}`,
    `summon minecraft:item ~ ~1 ~ {Item:${townhallPlanItem}}`,
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  // Polled each tick for every founding site, with its `data.aom` in scope.
  const townFoundCheckAt = d.defineFunction("town/found/check/at", [
    // The sign is gone: hand the plan back and clean up the site.
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} at @s run summon minecraft:item ~ ~1 ~ {Item:${townhallPlanItem}}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run kill @s`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    // Founding succeeded: an anchor now exists here, so remove the site.
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

  // Set up the site at the sign the plan was placed on.
  const townFoundSite = d.defineFunction("town/found/site", [
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run tellraw @s ${snbt([text("You must place the plan on a sign.", { color: "red" })])}`,
    `$execute in $(dimension) unless block $(x) $(y) $(z) ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `$execute in $(dimension) if entity @e[type=minecraft:marker,tag=aom_anchor,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run return fail`,
    `$kill @e[type=minecraft:interaction,tag=aom_found,nbt={data:{aom:{x:$(x),y:$(y),z:$(z),dimension:"$(dimension)"}}}]`,
    // Summon via a marker so the interaction sits exactly on the sign block.
    `$execute in $(dimension) run summon minecraft:marker $(x) $(y) $(z) {Tags:["aom_tmp_pos"]}`,
    `$execute in $(dimension) as @e[type=minecraft:marker,tag=aom_tmp_pos,limit=1] at @s align xyz run summon minecraft:interaction ~.5 ~ ~.5 {Tags:["aom_found"],width:1.0f,height:1.0f,response:0b,data:{aom:{x:$(x),y:$(y),z:$(z),dimension:"$(dimension)"}}}`,
    `$execute in $(dimension) run kill @e[type=minecraft:marker,tag=aom_tmp_pos]`,
    `$execute in $(dimension) unless entity @e[type=minecraft:interaction,tag=aom_found,x=$(x),y=$(y),z=$(z),dx=1,dy=1,dz=1,limit=1] run tellraw @s ${snbt([text("[aom] The founding interaction was not created here.", { color: "red" })])}`,
    `$tellraw @s ${snbt([
      text("Townhall plan placed.\n", { color: "gold", bold: true }),
      text("1. Write your town's name on the first line of the sign.\n", {
        color: "gray",
      }),
      text("2. Right-click the sign to found your town and join it.\n", {
        color: "gray",
      }),
      text("Left-click or break the sign to cancel (the plan is returned).", {
        color: "dark_gray",
      }),
    ])}`,
  ]);

  // In a town: a plan builds (or rebuilds) its building as before.
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
    // Already in a town: build the plan's building.
    `$execute if data storage aom:data players.$(key).town run function ${planBuild.name} with storage aom:tmp found`,
    // Townless with a Townhall Plan: start a founding site.
    `$execute unless data storage aom:data players.$(key).town if data storage aom:tmp found{plan:"townhall"} run function ${townFoundSite.name} with storage aom:tmp found`,
    // Townless with any other plan: nothing to build.
    `$execute unless data storage aom:data players.$(key).town unless data storage aom:tmp found{plan:"townhall"} run tellraw @s ${snbt([text("You are not in a town. Place a Townhall Plan to found one.", { color: "red" })])}`,
  ]);

  // -------------------------------------------------------------------------
  // Triggers, load and schedules
  // -------------------------------------------------------------------------

  // `aom.menu` is the visible button bus: 1..999 opens the looked-at menu,
  // 1000+ is an action, 2000+ is a build choice. The decoded value lands in the
  // hidden dummy `aom.action`, which the handlers already read.
  const busAction = d.defineFunction("internal/triggers/menu/action", [
    "scoreboard players set @s aom.action 0",
    "scoreboard players operation @s aom.action = @s aom.menu",
    `scoreboard players remove @s aom.action ${ACTION_CODE}`,
    // `ACTION_CODE` itself is the confirm "yes" button (the only negative
    // action), since action indices start at 1.
    `execute if score @s aom.action matches 0 run scoreboard players set @s aom.action ${CONFIRM_ACTION}`,
    `function ${uiAction.name}`,
  ]);

  const busBuild = d.defineFunction("internal/triggers/menu/build", [
    "scoreboard players set @s aom.action 0",
    "scoreboard players operation @s aom.action = @s aom.menu",
    `scoreboard players remove @s aom.action ${BUILD_CODE}`,
    `function ${buildSet.name}`,
  ]);

  const triggers = {
    menu: d.defineFunction("internal/triggers/menu", [
      `execute if score @s aom.menu matches ${ACTION_CODE}..${BUILD_CODE - 1} run function ${busAction.name}`,
      `execute if score @s aom.menu matches ${BUILD_CODE}.. run function ${busBuild.name}`,
      `execute if score @s aom.menu matches ..${ACTION_CODE - 1} run function ${uiMenu.name}`,
    ]),
    townInfo: d.defineFunction("internal/triggers/town_info", [
      `function ${townInfo.name}`,
    ]),
    guide: d.defineFunction("internal/triggers/guide", [
      `function ${guide.name}`,
    ]),
  };

  const minute = d.defineFunction(
    "minute",
    eachAnchor(`function ${jobsGenerate.name}`),
  );

  const second = d.ref("second");
  const refresh = d.ref("refresh");

  d.defineFunction(second.path, [
    `schedule function ${second.name} 1s replace`,
    "scoreboard players add #seconds aom.tmp 1",
    `execute if score #seconds aom.tmp matches 60.. run function ${minute.name}`,
    "execute if score #seconds aom.tmp matches 60.. run scoreboard players set #seconds aom.tmp 0",
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
    // Hidden button values are plain scores now; the buttons carry them through
    // the visible aom.menu trigger. Drop the old trigger objectives so
    // upgrading worlds stop completing them.
    "scoreboard objectives remove aom.action",
    "scoreboard objectives remove aom.build",
    "scoreboard objectives remove aom.page",
    "scoreboard objectives remove aom.create_town",
    objectiveAdd("aom.menu", "trigger"),
    objectiveAdd("aom.town_info", "trigger"),
    objectiveAdd("aom.guide", "trigger"),
    objectiveAdd("aom.action", "dummy"),
    "",
    "scoreboard players set 576 aom.tmp 576",
    "scoreboard players set 8 aom.tmp 8",
    "",
    ...PLANS.map(
      (plan) => `advancement revoke @a only aom:plan_${plan.id}_place`,
    ),
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
      "aom:tmp do",
      "aom:tmp found",
      "aom:tmp give",
      "aom:tmp guide",
      "aom:tmp join",
      "aom:tmp key",
      "aom:tmp place",
      "aom:tmp player_key",
      "aom:tmp summary",
      "aom:tmp town",
      "aom:tmp unlock",
    ],
    kill: [
      "@e[type=minecraft:marker,tag=aom_anchor]",
      "@e[type=minecraft:marker,tag=aom_tmp_pos]",
      "@e[type=minecraft:interaction,tag=aom_click]",
      "@e[type=minecraft:interaction,tag=aom_found]",
    ],
    schedules: ["aom:second", "aom:refresh"],
  });

  return d;
}
