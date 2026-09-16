import {
  Datapack,
  anchors,
  anchorOf,
  castRay,
  findAnchorAt,
  latestVersion,
  objectiveAdd,
  raycast,
  recipeTake,
  scheduleFunction,
  snbt,
  summonAnchor,
  text,
  tellraw,
  triggerDispatch,
  waxSign,
  type FunctionRef,
  type Lines,
  type TextComponent,
} from "../../../mcgen/src/index.ts";
import { defineDialogs } from "./dialogs.ts";
import {
  BUILDINGS,
  CONFIRM_ACTION,
  INDUSTRIAL_BUILDINGS,
  STORAGE_AMOUNTS,
  TOWNHOUSE_ACTIONS,
  UNLOCKS,
  buildingResources,
  deleteAction,
  generationJobs,
  jobActions,
  storageAction,
  storageActionBase,
  storageJobs,
  type BuildingType,
} from "./registry.ts";

const MARKER_ANCHOR = anchors();
const MARKER_TMP = "@e[type=minecraft:marker,tag=aom_tmp_pos,limit=1]";
const SIGN_BLOCK = "#minecraft:signs";
const ANCHOR_BLOCK = "#aom:anchors";

const RAY_OBJECTIVE = "aom.players.ray";

/** Selectors are dimension-scoped, so anchor iteration covers each dimension. */
const DIMENSIONS = [
  "minecraft:overworld",
  "minecraft:the_nether",
  "minecraft:the_end",
] as const;

const eachAnchor = (command: string): Lines =>
  DIMENSIONS.map(
    (dimension) =>
      `execute in ${dimension} as ${MARKER_ANCHOR} at @s run ${command}`,
  );

const err = (target: string, message: string): string =>
  tellraw(target, [text(message, { color: "red" })]);

export function build(): Datapack {
  const d = new Datapack(
    "aom",
    latestVersion(),
    "Age of Minecraft — found and grow a town.",
  );

  defineDialogs(d);

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
  d.defineFunction("internal/give/one", [`$give @s $(item) $(count)`]);
  d.defineFunction(giveLoop.path, [
    "execute if score #give aom.tmp matches ..0 run return 0",
    "scoreboard players set #chunk aom.tmp 6400",
    "execute if score #give aom.tmp < #chunk aom.tmp run scoreboard players operation #chunk aom.tmp = #give aom.tmp",
    "execute store result storage aom:tmp give.count int 1 run scoreboard players get #chunk aom.tmp",
    "function aom:internal/give/one with storage aom:tmp give",
    "scoreboard players operation #give aom.tmp -= #chunk aom.tmp",
    `execute if score #give aom.tmp matches 1.. run function ${giveLoop.name}`,
  ]);
  const internalGive = d.defineFunction("internal/give", [
    `$data modify storage aom:tmp give.item set value "$(item)"`,
    `$scoreboard players set #give aom.tmp $(count)`,
    `function ${giveLoop.name}`,
  ]);

  // -------------------------------------------------------------------------
  // Raycasts
  // -------------------------------------------------------------------------

  const signRay = raycast(d, {
    path: "internal/ray/signs",
    test: SIGN_BLOCK,
    objective: RAY_OBJECTIVE,
  });
  const anchorRay = raycast(d, {
    path: "internal/ray/anchors",
    test: ANCHOR_BLOCK,
    objective: RAY_OBJECTIVE,
  });

  // -------------------------------------------------------------------------
  // Player helpers
  // -------------------------------------------------------------------------

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

  d.defineFunction("player/detach", [
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
    `$function aom:jobs/unlock/sync_all {"town":"$(town)"}`,
  ]);

  const playerJoinDispatch = d.defineFunction("player/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run return 0`,
    `$data modify storage aom:tmp join.town set from storage aom:data players.$(key).town`,
    `function ${playerJoinSync.name} with storage aom:tmp join`,
  ]);

  const playerJoin = d.defineFunction("player/join", [
    "scoreboard players set @s aom.left 0",
    `function ${playerKey.name}`,
    "data remove storage aom:tmp join",
    "data modify storage aom:tmp join.key set from storage aom:tmp player_key",
    `function ${playerJoinDispatch.name} with storage aom:tmp join`,
  ]);

  // -------------------------------------------------------------------------
  // Unlocks
  // -------------------------------------------------------------------------

  const syncAllRef = d.ref("jobs/unlock/sync_all");

  for (const unlock of UNLOCKS) {
    const checkDispatch = d.defineFunction(
      `jobs/unlock/${unlock.id}/check/dispatch`,
      BUILDINGS.filter((type) => type.jobs.some((job) => job.unlock === unlock.id))
        .map(
          (type) =>
            `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:jobs/unlock/${unlock.id}/check/${type.id} {"town":"$(town)","building":$(building)}`,
        ),
    );

    d.defineFunction(`jobs/unlock/${unlock.id}/check`, [
      "data remove storage aom:tmp unlock",
      "data modify storage aom:tmp unlock set from entity @s data.aom",
      `execute if data storage aom:tmp unlock run function ${checkDispatch.name} with storage aom:tmp unlock`,
    ]);

    for (const type of BUILDINGS) {
      const job = type.jobs.find((entry) => entry.unlock === unlock.id);
      if (!job) continue;
      d.defineFunction(`jobs/unlock/${unlock.id}/check/${type.id}`, [
        "scoreboard players set #u aom.tmp 0",
        `$execute store result score #u aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "execute if score #u aom.tmp matches 1.. run scoreboard players set #active aom.tmp 1",
      ]);
    }

    d.defineFunction(`jobs/unlock/${unlock.id}/sync`, [
      "scoreboard players set #active aom.tmp 0",
      ...DIMENSIONS.map(
        (dimension) =>
          `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run function aom:jobs/unlock/${unlock.id}/check`,
      ),
      ...unlock.recipes.flatMap((recipe) =>
        DIMENSIONS.map(
          (dimension) =>
            `$execute in ${dimension} if score #active aom.tmp matches 1.. as @a[tag=aom_member_$(town)] run recipe give @s ${recipe}`,
        ),
      ),
      ...unlock.recipes.flatMap((recipe) =>
        DIMENSIONS.map(
          (dimension) =>
            `$execute in ${dimension} if score #active aom.tmp matches 0 as @a[tag=aom_member_$(town)] run recipe take @s ${recipe}`,
        ),
      ),
    ]);
  }

  d.defineFunction(syncAllRef.path, [
    ...UNLOCKS.map(
      (unlock) =>
        `$function aom:jobs/unlock/${unlock.id}/sync {"town":"$(town)"}`,
    ),
  ]);

  // -------------------------------------------------------------------------
  // Hiring and firing
  // -------------------------------------------------------------------------

  const unemployedGuardMacro: Lines = [
    "$scoreboard players operation #u aom.tmp = $(town) aom.population",
    "$scoreboard players operation #u aom.tmp -= $(town) aom.employed",
    `$execute if score #u aom.tmp matches ..0 run ${err("@s", "You have no unemployed villagers.")}`,
    "$execute if score #u aom.tmp matches ..0 run return fail",
  ];

  for (const type of INDUSTRIAL_BUILDINGS) {
    for (const job of type.jobs) {
      const readJobScore = [
        "scoreboard players set #w aom.tmp 0",
        `$execute store result score #w aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
      ];
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

      const fireLines: Lines = [
        ...readJobScore,
        `execute if score #w aom.tmp matches ..0 run ${err("@s", "Nobody works at this job.")}`,
        "execute if score #w aom.tmp matches ..0 run return fail",
        "scoreboard players remove #w aom.tmp 1",
        `$execute store result storage aom:data towns.$(town).buildings.$(building).jobs.${job.id} int 1 run scoreboard players get #w aom.tmp`,
        `$scoreboard players remove $(town) aom.employed 1`,
        ...(job.kind === "unlock"
          ? [`$function ${syncAllRef.name} {"town":"$(town)"}`]
          : []),
      ];

      d.defineFunction(
        `jobs/hire/${type.id}/${job.id}`,
        [...unemployedGuardMacro, ...hireSpecific],
      );
      d.defineFunction(`jobs/fire/${type.id}/${job.id}`, fireLines);
    }
  }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  const generateDispatch = d.defineFunction(
    "jobs/generate/dispatch",
    INDUSTRIAL_BUILDINGS.flatMap((type) => {
      const hasGeneration = buildingResources(type).some(
        (res) => generationJobs(type, res.id).length > 0,
      );
      if (!hasGeneration) return [];
      return [
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:jobs/generate/${type.id} {"town":"$(town)","building":$(building)}`,
      ];
    }),
  );

  d.defineFunction("jobs/generate", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    `execute if data storage aom:tmp anchor run function ${generateDispatch.name} with storage aom:tmp anchor`,
  ]);

  for (const type of INDUSTRIAL_BUILDINGS) {
    const lines: Lines = [];
    for (const res of buildingResources(type)) {
      const generators = generationJobs(type, res.id);
      if (generators.length === 0) continue;
      const storage = storageJobs(type, res.id);
      lines.push(
        "scoreboard players set #workers aom.tmp 0",
        ...generators.flatMap((job) => [
          "scoreboard players set #gen aom.tmp 0",
          `$execute store result score #gen aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `$scoreboard players operation #workers aom.tmp += #gen aom.tmp`,
        ]),
        "scoreboard players set #capacity aom.tmp 0",
      );
      for (const job of storage) {
        const perWorker = job.capacity ?? 0;
        lines.push(
          "scoreboard players set #cap aom.tmp 0",
          `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `scoreboard players operation #cap aom.tmp *= ${perWorker} aom.tmp`,
          "scoreboard players operation #capacity aom.tmp += #cap aom.tmp",
        );
      }
      lines.push(
        "scoreboard players set #stored aom.tmp 0",
        `$execute store result score #stored aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        "scoreboard players operation #new aom.tmp = #stored aom.tmp",
        "scoreboard players operation #new aom.tmp += #workers aom.tmp",
        "execute if score #new aom.tmp > #capacity aom.tmp run scoreboard players operation #new aom.tmp = #capacity aom.tmp",
        `$execute if score #workers aom.tmp matches 1.. store result storage aom:data towns.$(town).buildings.$(building).storage.${res.id} int 1 run scoreboard players get #new aom.tmp`,
      );
    }
    if (lines.length) d.defineFunction(`jobs/generate/${type.id}`, lines);
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  for (const type of INDUSTRIAL_BUILDINGS) {
    for (const res of buildingResources(type)) {
      const storage = storageJobs(type, res.id);
      const capacityLines: Lines = ["scoreboard players set #capacity aom.tmp 0"];
      for (const job of storage) {
        const perWorker = job.capacity ?? 0;
        capacityLines.push(
          "scoreboard players set #cap aom.tmp 0",
          `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `scoreboard players operation #cap aom.tmp *= ${perWorker} aom.tmp`,
          "scoreboard players operation #capacity aom.tmp += #cap aom.tmp",
        );
      }

      d.defineFunction(`storage/deposit/${type.id}/${res.id}`, [
        `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
        `$execute unless data storage aom:data towns.$(town).buildings.$(building).storage.${res.id} run data modify storage aom:data towns.$(town).buildings.$(building).storage.${res.id} set value 0`,
        ...capacityLines,
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
      ]);

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
      ]);
    }
  }

  // -------------------------------------------------------------------------
  // Building summaries (shared by sign, book and chat rendering)
  // -------------------------------------------------------------------------

  for (const type of INDUSTRIAL_BUILDINGS) {
    const lines: Lines = [];
    for (const job of type.jobs) {
      lines.push(
        `$data modify storage aom:tmp summary.workers_${job.id} set value 0`,
        `$execute store result storage aom:tmp summary.workers_${job.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
      );
    }
    for (const res of buildingResources(type)) {
      lines.push(
        `$data modify storage aom:tmp summary.stored_${res.id} set value 0`,
        `$execute store result storage aom:tmp summary.stored_${res.id} int 1 run data get storage aom:data towns.$(town).buildings.$(building).storage.${res.id}`,
        `$data modify storage aom:tmp summary.capacity_${res.id} set value 0`,
        "scoreboard players set #capacity aom.tmp 0",
      );
      for (const job of storageJobs(type, res.id)) {
        const perWorker = job.capacity ?? 0;
        lines.push(
          "scoreboard players set #cap aom.tmp 0",
          `$execute store result score #cap aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
          `scoreboard players operation #cap aom.tmp *= ${perWorker} aom.tmp`,
          "scoreboard players operation #capacity aom.tmp += #cap aom.tmp",
        );
      }
      lines.push(
        `execute store result storage aom:tmp summary.capacity_${res.id} int 1 run scoreboard players get #capacity aom.tmp`,
      );
    }
    d.defineFunction(`ui/summary/load/${type.id}`, lines);
  }

  const summaryLoad = d.defineFunction("ui/summary/load", [
    "data remove storage aom:tmp summary",
    `$data modify storage aom:tmp summary.town set value "$(town)"`,
    `$data modify storage aom:tmp summary.building set value $(building)`,
    ...INDUSTRIAL_BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:ui/summary/load/${type.id} {"town":"$(town)","building":$(building)}`,
    ),
  ]);

  // -------------------------------------------------------------------------
  // Sign rendering
  // -------------------------------------------------------------------------

  for (const type of INDUSTRIAL_BUILDINGS) {
    const job =
      type.jobs.find((entry) => entry.kind === "generation") ?? type.jobs[0];
    const res = buildingResources(type)[0];
    const lines = [
      type.label,
      job ? `${job.label} $(workers_${job.id})` : "",
      res ? `${res.label} $(stored_${res.id})/$(capacity_${res.id})` : "",
      "$(town)",
    ];
    d.defineFunction(`ui/render_sign/${type.id}`, [
      `$data modify block ~ ~ ~ front_text.messages set value ${snbt(lines)}`,
    ]);
  }

  d.defineFunction("ui/render_signs/dispatch", [
    ...INDUSTRIAL_BUILDINGS.flatMap((type) => [
      `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function ${summaryLoad.name} {"town":"$(town)","building":$(building)}`,
      `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:ui/render_sign/${type.id} with storage aom:tmp summary`,
    ]),
  ]);

  d.defineFunction("ui/render_signs/anchor", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute if data storage aom:tmp anchor run function aom:ui/render_signs/dispatch with storage aom:tmp anchor",
  ]);

  const renderSigns = d.defineFunction(
    "ui/render_signs",
    eachAnchor("function aom:ui/render_signs/anchor"),
  );

  // -------------------------------------------------------------------------
  // Book rendering
  // -------------------------------------------------------------------------

  d.defineFunction("ui/render_book/write", [
    `$data modify block ~ ~ ~ Book set value ${JSON.stringify({
      id: "minecraft:written_book",
      count: 1,
      components: {
        "minecraft:written_book_content": {
          title: "$(town)",
          author: "Age of Minecraft",
          pages: [
            [
              { text: "Town: " },
              { text: "$(town)", bold: true },
              { text: "\nPopulation: " },
              { text: "$(population)" },
              { text: "\nEmployed: " },
              { text: "$(employed)" },
              { text: "\nUnemployed: " },
              { text: "$(unemployed)" },
              { text: "\nBuildings: " },
              { text: "$(buildings)" },
              {
                text: "\n\nLook at this lectern and run /trigger aom.menu to manage the town.",
              },
            ],
            [
              { text: "Members (online):\n" },
              { selector: "@a[tag=aom_member_$(town)]" },
              { text: "\n\nEvery member counts as one villager." },
            ],
            [
              { text: "Buildings, jobs and storage:" },
              {
                nbt: "book.lines",
                storage: "aom:tmp",
                interpret: true,
              },
            ],
          ],
          resolved: false,
        },
      },
    })}`,
  ]);

  for (const type of BUILDINGS) {
    const summary =
      type.category === "townhouse"
        ? ""
        : [
            ...type.jobs.map(
              (job) => `${job.label} $(workers_${job.id})`,
            ),
            ...buildingResources(type).map(
              (res) =>
                `${res.label} $(stored_${res.id})/$(capacity_${res.id})`,
            ),
          ].join(", ");
    const line =
      type.category === "townhouse"
        ? `\\n${type.label} #$(building)`
        : `\\n${type.label} #$(building): ${summary}`;
    d.defineFunction(`ui/render_book/append/${type.id}`, [
      `$data modify storage aom:tmp book.lines append value {"text":"${line}"}`,
    ]);
  }

  d.defineFunction("ui/render_book/append", [
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:ui/render_book/append/${type.id} with storage aom:tmp summary`,
    ),
  ]);

  d.defineFunction("ui/render_book/line", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute if data storage aom:tmp anchor run function aom:ui/render_book/append/load",
  ]);

  d.defineFunction("ui/render_book/append/load", [
    `function ${summaryLoad.name} with storage aom:tmp anchor`,
    "function aom:ui/render_book/append with storage aom:tmp summary",
  ]);

  d.defineFunction("ui/render_book/town", [
    "data remove storage aom:tmp book",
    `$data modify storage aom:tmp book.town set value "$(town)"`,
    "data modify storage aom:tmp book.population set value 0",
    `$execute store result storage aom:tmp book.population int 1 run scoreboard players get $(town) aom.population`,
    "data modify storage aom:tmp book.employed set value 0",
    `$execute store result storage aom:tmp book.employed int 1 run scoreboard players get $(town) aom.employed`,
    `$scoreboard players operation #u aom.tmp = $(town) aom.population`,
    `$scoreboard players operation #u aom.tmp -= $(town) aom.employed`,
    "execute store result storage aom:tmp book.unemployed int 1 run scoreboard players get #u aom.tmp",
    "scoreboard players set #buildings aom.tmp 0",
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run scoreboard players add #buildings aom.tmp 1`,
    ),
    "execute store result storage aom:tmp book.buildings int 1 run scoreboard players get #buildings aom.tmp",
    "data modify storage aom:tmp book.lines set value []",
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] at @s run function aom:ui/render_book/line`,
    ),
    "function aom:ui/render_book/write with storage aom:tmp book",
  ]);

  d.defineFunction("ui/render_book/dispatch", [
    `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"townhouse"} run function aom:ui/render_book/town {"town":"$(town)","building":$(building)}`,
  ]);

  d.defineFunction("ui/render_book/anchor", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute if data storage aom:tmp anchor run function aom:ui/render_book/dispatch with storage aom:tmp anchor",
  ]);

  const renderBook = d.defineFunction(
    "ui/render_book",
    eachAnchor("function aom:ui/render_book/anchor"),
  );

  // -------------------------------------------------------------------------
  // Chat pages
  // -------------------------------------------------------------------------

  for (const type of BUILDINGS) {
    const parts: TextComponent[] =
      type.category === "townhouse"
        ? [text(`\n${type.label} #$(building)`, { color: "white" })]
        : [
            text(`\n${type.label} #$(building)`, { color: "white" }),
            ...type.jobs.flatMap((job) => [
              text(` · ${job.label} `, { color: "gray" }),
              text(`$(workers_${job.id})`, { color: "aqua" }),
            ]),
            ...buildingResources(type).flatMap((res) => [
              text(` · ${res.label} `, { color: "gray" }),
              text(`$(stored_${res.id})/$(capacity_${res.id})`, {
                color: "aqua",
              }),
            ]),
          ];
    d.defineFunction(`ui/chat_page/line/${type.id}`, [
      `$data modify storage aom:tmp chat.lines append value ${snbt(parts)}`,
    ]);
  }

  d.defineFunction("ui/chat_page/append", [
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:ui/chat_page/line/${type.id} with storage aom:tmp summary`,
    ),
  ]);

  d.defineFunction("ui/chat_page/line", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute if data storage aom:tmp anchor run function aom:ui/chat_page/append/load",
  ]);

  d.defineFunction("ui/chat_page/append/load", [
    `function ${summaryLoad.name} with storage aom:tmp anchor`,
    "function aom:ui/chat_page/append with storage aom:tmp summary",
  ]);

  // -------------------------------------------------------------------------
  // Town: create, join, leave, delete, villagers, info
  // -------------------------------------------------------------------------

  const renderBookTown = d.ref("ui/render_book/town");

  d.defineFunction("town/delete/anchor", [
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  const townDeleteCheck = d.defineFunction("town/delete/check", [
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    `$execute if score $(town) aom.members matches 2.. run tellraw @s ${snbt([text("Only the last member can delete the town.", { color: "red" })])}`,
    `$execute if score $(town) aom.members matches 2.. run return fail`,
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @a[tag=aom_member_$(town)] run function aom:player/detach {"town":"$(town)"}`,
    ),
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] at @s run function aom:town/delete/anchor`,
    ),
    `$scoreboard players reset $(town) aom.population`,
    `$scoreboard players reset $(town) aom.employed`,
    `$scoreboard players reset $(town) aom.members`,
    `$scoreboard players reset $(town) aom.build_acc`,
    `$data remove storage aom:data towns.$(town)`,
    `$tellraw @s ${snbt([text("The town of $(town) was deleted.", { color: "green" })])}`,
  ]);

  d.defineFunction("town/delete/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).town`,
    `function ${townDeleteCheck.name} with storage aom:tmp ctx`,
  ]);

  d.defineFunction("town/delete", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:town/delete/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("town/delete/prompt", [
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    `$data modify storage aom:data players.$(key).pending.confirm set value "aom:town/delete"`,
    "dialog show @s aom:confirm",
  ]);

  d.defineFunction("town/leave/exec", [
    `$data remove storage aom:data players.$(key).town`,
    `$data remove storage aom:data towns.$(town).members.$(key)`,
    `$tag @s remove aom_member_$(town)`,
    `$execute if data storage aom:data towns.$(town) run scoreboard players remove $(town) aom.members 1`,
    `$execute if data storage aom:data towns.$(town) run scoreboard players remove $(town) aom.population 1`,
    `function ${clearUnlocks.name}`,
    `$tellraw @s ${snbt([text("You left ", { color: "yellow" }), text("$(town)", { color: "aqua" }), text(".", { color: "yellow" })])}`,
  ]);

  d.defineFunction("town/leave/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).town`,
    "function aom:town/leave/exec with storage aom:tmp ctx",
  ]);

  d.defineFunction("town/leave", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:town/leave/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("town/join/check", [
    `$execute unless data storage aom:data towns.$(town) run tellraw @s ${snbt([text("This town no longer exists.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town) run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) {type:"townhouse"} run return fail`,
    `$execute if data storage aom:data players.$(key).town run function aom:town/leave`,
    `$data modify storage aom:data towns.$(town).members.$(key) set value {}`,
    `$data modify storage aom:data players.$(key).town set value "$(town)"`,
    `$scoreboard players add $(town) aom.members 1`,
    `$scoreboard players add $(town) aom.population 1`,
    `$tag @s add aom_member_$(town)`,
    `$function aom:jobs/unlock/sync_all {"town":"$(town)"}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "gray" }, text(" joined ", { color: "gray" }), text("$(town)", { color: "aqua" }), text(".", { color: "gray" })])}`,
  ]);

  d.defineFunction("town/join/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.town run tellraw @s ${snbt([text("Look at a townhouse lectern and run /trigger aom.menu first.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.town run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    "function aom:town/join/check with storage aom:tmp ctx",
  ]);

  d.defineFunction("town/join", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:town/join/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("town/villager", [
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) {type:"townhouse"} run return fail`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building).villagers run data modify storage aom:data towns.$(town).buildings.$(building).villagers set value 1`,
    "scoreboard players set #old aom.tmp 0",
    `$execute store result score #old aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).villagers`,
    "scoreboard players operation #new aom.tmp = #old aom.tmp",
    `$scoreboard players add #new aom.tmp $(delta)`,
    "execute if score #new aom.tmp matches ..0 run scoreboard players set #new aom.tmp 0",
    "scoreboard players operation #d aom.tmp = #new aom.tmp",
    "scoreboard players operation #d aom.tmp -= #old aom.tmp",
    `$scoreboard players operation $(town) aom.population += #d aom.tmp`,
    `$execute store result storage aom:data towns.$(town).buildings.$(building).villagers int 1 run scoreboard players get #new aom.tmp`,
    `$tellraw @s ${snbt([text("Villagers from this townhouse: ", { color: "yellow" }), { nbt: "towns.$(town).buildings.$(building).villagers", storage: "aom:data", color: "aqua" }])}`,
  ]);

  d.defineFunction("town/create/validate", [
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
    `$data modify storage aom:data towns.$(name).buildings.1 set value {type:"townhouse",villagers:1}`,
    `$scoreboard players set $(name) aom.population 1`,
    `$scoreboard players set $(name) aom.employed 0`,
    `$scoreboard players set $(name) aom.members 0`,
    `$scoreboard players set $(name) aom.build_acc 2`,
    `$${summonAnchor("~.5 ~.5 ~.5", { town: "$(name)", building: 1 })}`,
    "execute if entity @s[y_rotation=-45..45] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=south]",
    "execute if entity @s[y_rotation=45..135] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=west]",
    "execute if entity @s[y_rotation=-135..-45] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=east]",
    "execute if entity @s[y_rotation=135..180] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=north]",
    "execute if entity @s[y_rotation=-180..-135] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=north]",
    `$function ${renderBookTown.name} {"town":"$(name)","building":1}`,
    `$tellraw @a ${snbt([{ selector: "@s", color: "green" }, text(" founded the town of ", { color: "green" }), text("$(name)", { color: "aqua" }), text("!", { color: "green" })])}`,
    `$tellraw @s ${snbt([text("Look at the lectern and run /trigger aom.menu to join your town.", { color: "yellow" })])}`,
  ]);

  d.defineFunction("town/create/at", [
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @s ${snbt([text("You must look at a sign to found a town.", { color: "red" })])}`,
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run return fail`,
    `execute if entity ${findAnchorAt()} run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    "execute if entity " + findAnchorAt() + " run return fail",
    "data remove storage aom:tmp town",
    "data modify storage aom:tmp town.name set from block ~ ~ ~ front_text.messages[0]",
    "execute if data storage aom:tmp town.name.text run data modify storage aom:tmp town.name set from storage aom:tmp town.name.text",
    "function aom:town/create/validate with storage aom:tmp town",
  ]);

  d.defineFunction("town/create/hit", [
    "execute align xyz run function aom:town/create/at",
  ]);

  const townCreateHit = d.ref("town/create/hit");
  d.defineFunction("town/create", [castRay(signRay, townCreateHit)]);

  // -------------------------------------------------------------------------
  // Town info (chat pages)
  // -------------------------------------------------------------------------

  const navPrev = text("[<] ", {
    color: "green",
    click_event: {
      action: "run_command",
      command: "/trigger aom.town_info set 2",
    },
    hover_event: { action: "show_text", value: "Previous page" },
  });
  const navNext = text("[>]", {
    color: "green",
    click_event: {
      action: "run_command",
      command: "/trigger aom.town_info set 3",
    },
    hover_event: { action: "show_text", value: "Next page" },
  });

  d.defineFunction("town/info/render1", [
    `$scoreboard players operation #u aom.tmp = $(town) aom.population`,
    `$scoreboard players operation #u aom.tmp -= $(town) aom.employed`,
    "execute store result storage aom:tmp chat.unemployed int 1 run scoreboard players get #u aom.tmp",
    "scoreboard players set #b aom.tmp 0",
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] run scoreboard players add #b aom.tmp 1`,
    ),
    "execute store result storage aom:tmp chat.buildings int 1 run scoreboard players get #b aom.tmp",
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" ===\n", { color: "gold" }),
      text("Population: "),
      { score: { name: "$(town)", objective: "aom.population" }, color: "aqua" },
      text("\nEmployed: "),
      { score: { name: "$(town)", objective: "aom.employed" }, color: "aqua" },
      text("\nUnemployed: "),
      { nbt: "chat.unemployed", storage: "aom:tmp", color: "aqua" },
      text("\nBuildings: "),
      { nbt: "chat.buildings", storage: "aom:tmp", color: "aqua" },
      text("\n\n"),
      navPrev,
      navNext,
    ])}`,
  ]);

  d.defineFunction("town/info/render2", [
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" members ===\n", { color: "gold" }),
      text("Online: "),
      { selector: "@a[tag=aom_member_$(town)]" },
      text("\n\nEvery member counts as one villager.\n\n"),
      navPrev,
      navNext,
    ])}`,
  ]);

  d.defineFunction("town/info/render3", [
    `$tellraw @s ${snbt([
      text("=== ", { color: "gold" }),
      text("$(town)", { color: "gold", bold: true }),
      text(" buildings ===\n", { color: "gold" }),
    ])}`,
    "data modify storage aom:tmp chat.lines set value []",
    ...DIMENSIONS.map(
      (dimension) =>
        `$execute in ${dimension} as @e[type=minecraft:marker,tag=aom_anchor,nbt={data:{aom:{town:"$(town)"}}}] at @s run function aom:ui/chat_page/line`,
    ),
    `$tellraw @s ${snbt([
      { nbt: "chat.lines", storage: "aom:tmp", interpret: true },
      text("\n"),
      navPrev,
      navNext,
    ])}`,
  ]);

  d.defineFunction("town/info/next", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "scoreboard players add #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  d.defineFunction("town/info/prev", [
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "scoreboard players remove #p aom.tmp 1",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
  ]);

  d.defineFunction("town/info/page", [
    "execute if score @s aom.town_info matches 2..2 run function aom:town/info/prev with storage aom:tmp chat",
    "execute if score @s aom.town_info matches 3..3 run function aom:town/info/next with storage aom:tmp chat",
    "scoreboard players set #p aom.tmp 0",
    `$execute store result score #p aom.tmp run data get storage aom:data players.$(key).page`,
    "execute if score #p aom.tmp matches ..1 run scoreboard players set #p aom.tmp 1",
    "execute if score #p aom.tmp matches 3.. run scoreboard players set #p aom.tmp 3",
    `$execute store result storage aom:data players.$(key).page int 1 run scoreboard players get #p aom.tmp`,
    "execute if score #p aom.tmp matches 1 run function aom:town/info/render1 with storage aom:tmp chat",
    "execute if score #p aom.tmp matches 2 run function aom:town/info/render2 with storage aom:tmp chat",
    "execute if score #p aom.tmp matches 3 run function aom:town/info/render3 with storage aom:tmp chat",
  ]);

  d.defineFunction("town/info/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp chat.town set from storage aom:data players.$(key).town`,
    `$execute unless data storage aom:data players.$(key).page run data modify storage aom:data players.$(key).page set value 1`,
    "function aom:town/info/page with storage aom:tmp chat",
  ]);

  d.defineFunction("town/info", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp chat",
    "data modify storage aom:tmp chat.key set from storage aom:tmp player_key",
    "function aom:town/info/dispatch with storage aom:tmp chat",
  ]);

  // -------------------------------------------------------------------------
  // Building: removal and scanning
  // -------------------------------------------------------------------------

  for (const type of BUILDINGS) {
    if (type.category === "townhouse") {
      d.defineFunction(`build/remove/${type.id}`, [
        "scoreboard players set #v aom.tmp 0",
        `$execute store result score #v aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).villagers`,
        `$scoreboard players operation $(town) aom.population -= #v aom.tmp`,
        `$data remove storage aom:data towns.$(town).buildings.$(building)`,
      ]);
      continue;
    }
    const lines: Lines = [
      "scoreboard players set #e aom.tmp 0",
      "scoreboard players set #j aom.tmp 0",
    ];
    for (const job of type.jobs) {
      lines.push(
        "scoreboard players set #j aom.tmp 0",
        `$execute store result score #j aom.tmp run data get storage aom:data towns.$(town).buildings.$(building).jobs.${job.id}`,
        "scoreboard players operation #e aom.tmp += #j aom.tmp",
      );
    }
    lines.push(
      `$scoreboard players operation $(town) aom.employed -= #e aom.tmp`,
      `$data remove storage aom:data towns.$(town).buildings.$(building)`,
      `$function ${syncAllRef.name} {"town":"$(town)"}`,
    );
    d.defineFunction(`build/remove/${type.id}`, lines);
  }

  d.defineFunction("build/remove", [
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:build/remove/${type.id} {"town":"$(town)","building":$(building)}`,
    ),
    "setblock ~ ~ ~ air",
    "kill @s",
  ]);

  for (const type of BUILDINGS) {
    const expected = type.category === "townhouse" ? "minecraft:lectern" : SIGN_BLOCK;
    d.defineFunction(`build/scan/check/${type.id}`, [
      `$execute unless block ~ ~ ~ ${expected} run function aom:build/remove {"town":"$(town)","building":$(building)}`,
    ]);
  }

  d.defineFunction("build/scan/dispatch", [
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:build/scan/check/${type.id} {"town":"$(town)","building":$(building)}`,
    ),
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run kill @s`,
  ]);

  d.defineFunction("build/scan/one", [
    "data remove storage aom:tmp anchor",
    "data modify storage aom:tmp anchor set from entity @s data.aom",
    "execute if data storage aom:tmp anchor run function aom:build/scan/dispatch with storage aom:tmp anchor",
  ]);

  d.defineFunction(
    "build/scan",
    eachAnchor("function aom:build/scan/one"),
  );

  // -------------------------------------------------------------------------
  // Building: placement
  // -------------------------------------------------------------------------

  d.defineFunction("build/place/lectern", [
    "execute if entity @s[y_rotation=-45..45] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=south]",
    "execute if entity @s[y_rotation=45..135] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=west]",
    "execute if entity @s[y_rotation=-135..-45] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=east]",
    "execute if entity @s[y_rotation=135..180] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=north]",
    "execute if entity @s[y_rotation=-180..-135] run setblock ~ ~ ~ minecraft:lectern[has_book=true,facing=north]",
  ]);

  const renderSignsDispatch = d.ref("ui/render_signs/dispatch");

  for (const type of BUILDINGS) {
    const hookLines: Lines =
      type.category === "townhouse"
        ? [
            `$data modify storage aom:data towns.$(town).buildings.$(id).villagers set value 1`,
            `$scoreboard players add $(town) aom.population 1`,
            `$execute in $(dimension) positioned $(x) $(y) $(z) run function aom:build/place/lectern`,
            `$tellraw @s ${snbt([text("Built a townhouse.", { color: "green" })])}`,
          ]
        : [
            `$execute in $(dimension) positioned $(x) $(y) $(z) run ${waxSign("~ ~ ~")}`,
            `$tellraw @s ${snbt([text(`Built a ${type.label.toLowerCase()}.`, { color: "green" })])}`,
          ];
    d.defineFunction(`build/place/create/${type.id}`, hookLines);
  }

  d.defineFunction("build/place/finish", [
    `$data remove storage aom:data players.$(key).pending.sign`,
    ...INDUSTRIAL_BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(id) {type:"${type.id}"} run execute in $(dimension) positioned $(x) $(y) $(z) run function ${renderSignsDispatch.name} {"town":"$(town)","building":$(id)}`,
    ),
    `$execute if data storage aom:data towns.$(town).buildings.$(id) {type:"townhouse"} run execute in $(dimension) positioned $(x) $(y) $(z) run function ${renderBookTown.name} {"town":"$(town)","building":$(id)}`,
  ]);

  d.defineFunction("build/place/create", [
    `$data modify storage aom:data towns.$(town).buildings.$(id) set value {type:"$(type)",jobs:{},storage:{}}`,
    `$execute in $(dimension) positioned $(x) $(y) $(z) run ${summonAnchor("~.5 ~.5 ~.5", { town: "$(town)", building: "$(id)" })}`,
    ...BUILDINGS.map(
      (b) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(id) {type:"${b.id}"} run function aom:build/place/create/${b.id} with storage aom:tmp place`,
    ),
    "function aom:build/place/finish with storage aom:tmp place",
  ]);

  d.defineFunction("build/place/check", [
    `$execute in $(dimension) positioned $(x) $(y) $(z) unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @s ${snbt([text("The sign is gone.", { color: "red" })])}`,
    `$execute in $(dimension) positioned $(x) $(y) $(z) unless block ~ ~ ~ ${SIGN_BLOCK} run return fail`,
    `$execute in $(dimension) positioned $(x) $(y) $(z) if entity ${findAnchorAt()} run tellraw @s ${snbt([text("There is already a building at this sign.", { color: "red" })])}`,
    `$execute in $(dimension) positioned $(x) $(y) $(z) if entity ${findAnchorAt()} run return fail`,
    `$scoreboard players add $(town) aom.build_acc 0`,
    "$execute store result storage aom:tmp place.id int 1 run scoreboard players get $(town) aom.build_acc",
    `$scoreboard players add $(town) aom.build_acc 1`,
    "function aom:build/place/create with storage aom:tmp place",
  ]);

  d.defineFunction("build/place/common", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("You are not in a town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    `$data modify storage aom:tmp place.town set from storage aom:data players.$(key).town`,
    "function aom:build/place/check with storage aom:tmp place",
  ]);

  for (const type of BUILDINGS) {
    d.defineFunction(`build/place/${type.id}`, [
      `$data modify storage aom:tmp place.type set value "${type.id}"`,
      "function aom:build/place/common with storage aom:tmp place",
    ]);
  }

  d.defineFunction("build/set/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.sign run tellraw @s ${snbt([text("Place a sign, look at it and run /trigger aom.create_building first.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.sign run return fail`,
    "data remove storage aom:tmp place",
    `$data modify storage aom:tmp place.key set value "$(key)"`,
    `$data modify storage aom:tmp place.x set from storage aom:data players.$(key).pending.sign.x`,
    `$data modify storage aom:tmp place.y set from storage aom:data players.$(key).pending.sign.y`,
    `$data modify storage aom:tmp place.z set from storage aom:data players.$(key).pending.sign.z`,
    `$data modify storage aom:tmp place.dimension set from storage aom:data players.$(key).pending.sign.dimension`,
    ...BUILDINGS.map(
      (type, index) =>
        `execute if score @s aom.build matches ${index + 1} run function aom:build/place/${type.id} with storage aom:tmp place`,
    ),
  ]);

  d.defineFunction("build/set", [
    "execute unless score @s aom.build matches 1.. run return fail",
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:build/set/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("build/create/dispatch", [
    `$execute unless data storage aom:data players.$(key).town run tellraw @s ${snbt([text("Join a town before building.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).town run return fail`,
    "execute align xyz run summon minecraft:marker ~ ~ ~ {Tags:[\"aom_tmp_pos\"]}",
    `$data modify storage aom:data players.$(key).pending.sign set value {}`,
    `$execute store result storage aom:data players.$(key).pending.sign.x int 1 run data get entity ${MARKER_TMP} Pos[0]`,
    `$execute store result storage aom:data players.$(key).pending.sign.y int 1 run data get entity ${MARKER_TMP} Pos[1]`,
    `$execute store result storage aom:data players.$(key).pending.sign.z int 1 run data get entity ${MARKER_TMP} Pos[2]`,
    "kill @e[type=minecraft:marker,tag=aom_tmp_pos]",
    `$data modify storage aom:data players.$(key).pending.sign.dimension set from entity @s Dimension`,
    "dialog show @s aom:build",
  ]);

  d.defineFunction("build/create/at", [
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run tellraw @s ${snbt([text("You must look at a sign.", { color: "red" })])}`,
    `execute unless block ~ ~ ~ ${SIGN_BLOCK} run return fail`,
    "execute if entity " + findAnchorAt() + " run tellraw @s " +
      snbt([text("There is already a building at this sign.", { color: "red" })]),
    "execute if entity " + findAnchorAt() + " run return fail",
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:build/create/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("build/create/hit", [
    "execute align xyz run function aom:build/create/at",
  ]);

  const buildCreateHit = d.ref("build/create/hit");
  d.defineFunction("build/create", [
    castRay(signRay, buildCreateHit),
  ]);

  d.defineFunction("build/delete/exec", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    `$execute as ${anchorOf({ town: "$(town)", building: "$(building)" })} at @s run function aom:build/remove {"town":"$(town)","building":$(building)}`,
    `$tellraw @s ${snbt([text("Building removed.", { color: "green" })])}`,
  ]);

  d.defineFunction("build/delete/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.building run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    "function aom:build/delete/exec with storage aom:tmp ctx",
  ]);

  d.defineFunction("build/delete", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:build/delete/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("build/delete/prompt", [
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    `$data modify storage aom:data players.$(key).pending.confirm set value "aom:build/delete"`,
    "dialog show @s aom:confirm",
  ]);

  // -------------------------------------------------------------------------
  // UI: menu, actions, confirmation
  // -------------------------------------------------------------------------

  d.defineFunction("ui/menu/open", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run tellraw @s ${snbt([text("This building no longer exists.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    `$data modify storage aom:data players.$(key).pending.town set value "$(town)"`,
    `$data modify storage aom:data players.$(key).pending.building set value $(building)`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) {type:"townhouse"} unless data storage aom:data players.$(key) {town:"$(town)"} run tellraw @s ${snbt([text("This building belongs to another town.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) {type:"townhouse"} unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run dialog show @s aom:${type.id}`,
    ),
  ]);

  d.defineFunction("ui/menu/at", [
    `execute unless entity ${findAnchorAt()} run tellraw @s ${snbt([text("Look at a building anchor and run this command again.", { color: "red" })])}`,
    "execute unless entity " + findAnchorAt() + " run return fail",
    "execute as " + findAnchorAt() + " run data modify storage aom:tmp anchor set from entity @s data.aom",
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "data modify storage aom:tmp ctx.town set from storage aom:tmp anchor.town",
    "data modify storage aom:tmp ctx.building set from storage aom:tmp anchor.building",
    "function aom:ui/menu/open with storage aom:tmp ctx",
  ]);

  d.defineFunction("ui/menu/hit", [
    "execute align xyz run function aom:ui/menu/at",
  ]);

  const menuHit = d.ref("ui/menu/hit");
  d.defineFunction("ui/menu", [
    castRay(anchorRay, menuHit),
  ]);

  d.defineFunction("ui/confirm/exec", [
    `$function $(fn)`,
  ]);

  d.defineFunction("ui/confirm/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.confirm run tellraw @s ${snbt([text("Nothing to confirm.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.confirm run return fail`,
    `$data modify storage aom:tmp confirm.fn set from storage aom:data players.$(key).pending.confirm`,
    `$data remove storage aom:data players.$(key).pending.confirm`,
    "function aom:ui/confirm/exec with storage aom:tmp confirm",
  ]);

  d.defineFunction("ui/confirm/run", [
    "execute unless score @s aom.action matches ..-1 run return fail",
    `function ${playerKey.name}`,
    "data remove storage aom:tmp confirm",
    "data modify storage aom:tmp confirm.key set from storage aom:tmp player_key",
    "function aom:ui/confirm/dispatch with storage aom:tmp confirm",
  ]);

  d.defineFunction("ui/action/dispatch2", [
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run tellraw @s ${snbt([text("This building no longer exists.", { color: "red" })])}`,
    `$execute unless data storage aom:data towns.$(town).buildings.$(building) run return fail`,
    ...BUILDINGS.map(
      (type) =>
        `$execute if data storage aom:data towns.$(town).buildings.$(building) {type:"${type.id}"} run function aom:ui/action/${type.id} with storage aom:tmp ctx`,
    ),
  ]);

  d.defineFunction("ui/action/dispatch", [
    `$execute unless data storage aom:data players.$(key).pending.building run tellraw @s ${snbt([text("No building menu is open. Look at a building and run /trigger aom.menu.", { color: "red" })])}`,
    `$execute unless data storage aom:data players.$(key).pending.building run return fail`,
    `$data modify storage aom:tmp ctx.town set from storage aom:data players.$(key).pending.town`,
    `$data modify storage aom:tmp ctx.building set from storage aom:data players.$(key).pending.building`,
    "function aom:ui/action/dispatch2 with storage aom:tmp ctx",
  ]);

  d.defineFunction("ui/action/run", [
    `function ${playerKey.name}`,
    "data remove storage aom:tmp ctx",
    "data modify storage aom:tmp ctx.key set from storage aom:tmp player_key",
    "function aom:ui/action/dispatch with storage aom:tmp ctx",
  ]);

  d.defineFunction("ui/action", [
    "execute if score @s aom.action matches ..-1 run function aom:ui/confirm/run",
    "execute if score @s aom.action matches 1.. run function aom:ui/action/run",
  ]);

  for (const type of BUILDINGS) {
    if (type.category === "townhouse") {
      d.defineFunction("ui/action/townhouse", [
        "execute if score @s aom.action matches 1 run function aom:town/join",
        "execute if score @s aom.action matches 2 run function aom:town/leave",
        `$execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.addVillager} run function aom:town/villager {"key":"$(key)","town":"$(town)","building":$(building),"delta":1}`,
        `$execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.removeVillager} run function aom:town/villager {"key":"$(key)","town":"$(town)","building":$(building),"delta":-1}`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.deleteTown} run function aom:town/delete/prompt with storage aom:tmp ctx`,
        `execute if score @s aom.action matches ${TOWNHOUSE_ACTIONS.townInfo} run function aom:town/info`,
      ]);
      continue;
    }

    const lines: Lines = [
      `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run tellraw @s ${snbt([text("You are not a member of this town.", { color: "red" })])}`,
      `$execute unless data storage aom:data players.$(key) {town:"$(town)"} run return fail`,
    ];
    type.jobs.forEach((job, index) => {
      const actions = jobActions(index);
      lines.push(
        `$execute if score @s aom.action matches ${actions.hire} run function aom:jobs/hire/${type.id}/${job.id} {"key":"$(key)","town":"$(town)","building":$(building)}`,
        `$execute if score @s aom.action matches ${actions.fire} run function aom:jobs/fire/${type.id}/${job.id} {"key":"$(key)","town":"$(town)","building":$(building)}`,
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
        lines.push(
          `$execute if score @s aom.action matches ${deposit} run function aom:storage/deposit/${type.id}/${res.id} ${args}`,
          `$execute if score @s aom.action matches ${withdraw} run function aom:storage/withdraw/${type.id}/${res.id} ${args}`,
        );
      });
    });
    lines.push(
      `execute if score @s aom.action matches ${deleteAction(type)} run function aom:build/delete/prompt with storage aom:tmp ctx`,
    );
    d.defineFunction(`ui/action/${type.id}`, lines);
  }

  // -------------------------------------------------------------------------
  // Triggers, load and schedules
  // -------------------------------------------------------------------------

  const triggers = {
    help: d.defineFunction("internal/triggers/help", ["dialog show @s aom:help"]),
    startVillage: d.defineFunction("internal/triggers/start_village", [
      "function aom:town/create",
    ]),
    createBuilding: d.defineFunction("internal/triggers/create_building", [
      "function aom:build/create",
    ]),
    menu: d.defineFunction("internal/triggers/menu", ["function aom:ui/menu"]),
    townInfo: d.defineFunction("internal/triggers/town_info", [
      "function aom:town/info",
    ]),
    build: d.defineFunction("internal/triggers/build", [
      "function aom:build/set",
    ]),
    action: d.defineFunction("internal/triggers/action", [
      "function aom:ui/action",
    ]),
  };

  const minute = d.defineFunction(
    "minute",
    eachAnchor("function aom:jobs/generate"),
  );

  const second = d.ref("second");
  const refresh = d.ref("refresh");

  d.defineFunction(second.path, [
    `schedule function ${second.name} 1s replace`,
    "scoreboard players add #seconds aom.tmp 1",
    `execute if score #seconds aom.tmp matches 60.. run function ${minute.name}`,
    "execute if score #seconds aom.tmp matches 60.. run scoreboard players set #seconds aom.tmp 0",
    "function aom:build/scan",
  ]);

  d.defineFunction(refresh.path, [
    `schedule function ${refresh.name} 5s replace`,
    `function ${renderSigns.name}`,
    `function ${renderBook.name}`,
  ]);

  const tick = d.defineFunction("tick", [
    ...triggerDispatch([
      { objective: "aom.help", handler: triggers.help },
      { objective: "aom.start_village", handler: triggers.startVillage },
      { objective: "aom.create_building", handler: triggers.createBuilding },
      { objective: "aom.menu", handler: triggers.menu },
      { objective: "aom.town_info", handler: triggers.townInfo },
      { objective: "aom.build", handler: triggers.build },
      {
        objective: "aom.action",
        handler: triggers.action,
        match: "..-1",
      },
      { objective: "aom.action", handler: triggers.action, match: "1.." },
    ]),
    "",
    `execute as @a[scores={aom.left=1..}] run function ${playerJoin.name}`,
  ]);

  const load = d.defineFunction("load", [
    objectiveAdd("aom.population", "dummy"),
    objectiveAdd("aom.employed", "dummy"),
    objectiveAdd("aom.members", "dummy"),
    objectiveAdd("aom.build_acc", "dummy"),
    objectiveAdd("aom.players.ray", "dummy"),
    objectiveAdd("aom.tmp", "dummy"),
    objectiveAdd("aom.left", "minecraft.custom:minecraft.leave_game"),
    objectiveAdd("aom.help", "trigger"),
    objectiveAdd("aom.start_village", "trigger"),
    objectiveAdd("aom.create_building", "trigger"),
    objectiveAdd("aom.menu", "trigger"),
    objectiveAdd("aom.town_info", "trigger"),
    objectiveAdd("aom.build", "trigger"),
    objectiveAdd("aom.action", "trigger"),
    "",
    "scoreboard players set 576 aom.tmp 576",
    "",
    scheduleFunction(second, "1s"),
    scheduleFunction(refresh, "5s"),
  ]);

  d.onLoad(load);
  d.onTick(tick);

  d.blockTag("anchors", ["#minecraft:signs", "minecraft:lectern"]);

  return d;
}
