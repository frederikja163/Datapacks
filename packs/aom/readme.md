# Age of Minecraft (AOM) — Implementation Spec

> **Self-contained.** Implement from this file only. The legacy FileCompiler pack in `aom/` is historical, is not part of the TypeScript build, and must not be ported (see the appendix at the end).
>
> Target: `packs/aom` (TypeScript), Minecraft **26.3** (data pack format **121.0**). Follow the repo conventions in `AGENTS.md`: use `mcgen`, `defineFunction`/`FunctionRef`, typed text components, and run `bun run typecheck` before committing.

## 1. Vision

AOM is a village-building and management datapack inspired by Millénaire and survival challenge packs. The player founds a town, grows it with buildings, staffs jobs, and the town generates resources and unlocks recipes for its members.

Design pillars:

- **Build with signs.** The world itself is the UI: signs mark buildings, a lectern holds the town book, dialogs handle every action.
- **Population is the currency.** Townhouses provide villagers; jobs consume them.
- **The town works while staffed.** Generation and storage jobs produce and hold resources over time.
- **Progress through unlocks.** Staffing an unlock job grants the whole town a recipe or permission.
- **Every member matters.** Each player in the town also counts as a villager.

## 2. Core loop

1. `/trigger aom.help` — explains the loop.
2. Place a sign whose text is the town name, look at it, run `/trigger aom.start_village` → the town is founded and its **townhouse** (lectern + book) appears at that spot.
3. Open the townhouse book and **Join**.
4. Place a sign, look at it, run `/trigger aom.create_building` → a dialog asks which building to build there.
5. Open a building's menu and staff its jobs. Villagers come from townhouses and members.
6. Generation jobs fill the building's storage; storage jobs raise its capacity.
7. Withdraw resources and enjoy the recipes unlocked by unlock jobs.

## 3. Concepts

### Town

- The top-level unit: members, buildings, population and unlocks all belong to a town.
- Founded once per unique name; a town is a data object keyed by its (validated) name.
- The **townhouse** is its anchor and UI.

### Members

- A player joins a town through the townhouse menu (or leaves it there).
- Membership is stored globally (`players.<key>.town`) and per town (`towns.<town>.members`).
- Members are also tagged `aom_member_<town>` so effects can select online members with `@a[tag=...]`.
- Every member counts as **+1 villager** in the town's population.

### Villagers

- `population` = Σ townhouse contributions + number of members.
- `employed` = Σ staffed jobs across the town's buildings.
- `unemployed` = population − employed. It **may be negative**; hiring is only allowed while it is positive. Removing a townhouse or losing a member never unassigns workers automatically.

### Buildings

Two categories:

| Category | Role |
| --- | --- |
| **Townhouse** | Provides villagers to the town pool and anchors the town (lectern + book). |
| **Industrial** | Provides jobs (unlocks, generation, storage). |

Every building has:

- a type from the registry (section 7),
- an **anchor block** in the world — a sign (industrial) or a lectern (townhouse) — plus a **marker entity** at the same position carrying `{town, building}` so position → building lookups and per-building iteration are native,
- a job map `{ <job>: int }` (worker count; townhouses have none),
- optional storage `{ <resource>: int }` (industrial only).

### Jobs

| Kind | Max workers | Effect while staffed |
| --- | --- | --- |
| Unlock | 1 | Grants a named unlock to the town (recipes, permissions). |
| Generation | unlimited | Each worker adds `rate` items per minute to the building's storage for its resource. |
| Storage | unlimited | Each worker adds `capacity` to the storage limit for its resource. |

A building can mix kinds. The lumbermill is the reference example:

| Job | Kind | Limit | Resource | Amount |
| --- | --- | --- | --- | --- |
| Tool crafter | Unlock | 1 | — | Unlocks wooden tool recipes |
| Oak cutter | Generation | unlimited | `oak_logs` | 1 / minute / worker |
| Oak banker | Storage | unlimited | `oak_logs` | +576 capacity / worker |

### Storage

- Per building, per resource: a single item count.
- `capacity(resource) = base + per_worker × workers(storage jobs for that resource)` (base defaults to 0).
- Generation is capped by capacity; overflow is discarded.
- Members can deposit and withdraw from the building menu.

### Unlocks

- An unlock is active while its job is staffed (unlock jobs hold exactly one worker, so it is on/off).
- Unlock effects are looked up in the registry. The first effect type is **recipe** (`recipe give`/`recipe take`), applied to every member and re-synced on join and on unlock change.
- More effect types (e.g. allowing a sapling to be planted) can be added later behind the same registry entry.

## 4. Commands

All player commands are `/trigger`, so non-operators can use every button and command.

| Trigger | Opens / does |
| --- | --- |
| `/trigger aom.help` | Help dialog describing the loop. |
| `/trigger aom.start_village` | Reads the sign you are looking at as the town name and founds the town. |
| `/trigger aom.create_building` | Stores the sign you are looking at and opens the build-type dialog. |
| `/trigger aom.menu` | Opens the menu dialog of the building whose anchor you are looking at. |
| `/trigger aom.town_info` | Prints the town book in chat, one page at a time. |
| `/trigger aom.build set N` | Dialog internal: build the Nth registry building type at the stored sign. |
| `/trigger aom.action set N` | Dialog internal: run the Nth action of the open building/context. |

## 5. UI

### Anchors (marker entities)

Every building has a marker entity at its anchor block:

```
{ Tags: ["aom_anchor"], data: { aom: { town: "<town>", building: <id> } } }
```

- **Lookup**: `aom.menu` raycasts to the anchor block and selects the marker at that position.
- **Iteration**: scans, rendering and generation run `as @e[type=minecraft:marker,tag=aom_anchor]`, which covers exactly the loaded chunks. This replaces iterating storage compounds, which is not possible without index arrays.
- Markers persist across chunk unload/reload and are removed with the building.

### Sign anchors (industrial buildings)

- Placement: the player places a sign (no text needed) and picks the type from the build dialog.
- The sign is **waxed** so players cannot edit it.
- Text is written by functions as plain strings (26.3 does not resolve dynamic components on new signs), e.g. line 1 `Lumbermill`, line 2 `Oak cutters 2`, line 3 `Oak 1024/1728`.
- **Breaking the sign removes the building.** A once-per-second scan checks each anchor marker's block and removes the building if it is gone.
- Text is refreshed by a periodic pass (see section 9).

### Townhouse (lectern + book)

- The town anchor is a **lectern with a written book**: multi-page town information (members, population, buildings, jobs, storage).
- The book is rewritten by the periodic refresh pass, not every tick.
- `/trigger aom.town_info` prints the same information in chat with `[<]` / `[>]` page buttons that set the page score and re-render (permission-free).

### Dialogs

Dialogs are JSON resources generated from the registry (section 7): `data/aom/dialog/<name>.json`.

| Dialog | Purpose |
| --- | --- |
| `aom:help` | Notice dialog with the game loop. |
| `aom:build` | Multi-action: one button per building type → `/trigger aom.build set N`. |
| `aom:townhouse` | Join, leave, add villager, remove villager, delete town (confirm), town info. |
| `aom:<building>` | One dialog per industrial type: one hire/one fire button per job, deposit, withdraw, delete building (confirm). |
| `aom:confirm` | Generic confirmation (yes runs `/trigger aom.action set N`). |

Because dialog buttons run commands at the player's permission level and non-operators can only run `/trigger`, **every button only sets a numeric trigger score**. The tick handler reads the score, looks up the pending context, and performs the action as the server.

Pending context stored per player when a dialog is opened:

- `players.<key>.pending.sign` — `{x, y, z, dimension}` captured by `aom.create_building`.
- `players.<key>.pending.building` — building id captured by `aom.menu`.

If a player closes a dialog without acting, the pending context is simply overwritten next time.

## 6. Data model

### `aom:data`

```
towns: {
  <town>: {
    members: { <playerKey>: {} },
    buildings: {
      <buildingId>: {
        type: "townhouse" | "lumbermill" | ...,
        villagers: int,                   // townhouse only, default 1
        jobs: { <jobId>: int },           // industrial only: worker count
        storage: { <resourceId>: int }    // industrial only: item count
      }
    }
  }
}
players: {
  <playerKey>: {
    town: <town>,                         // membership index (mirrored by a tag)
    pending: { sign: {x,y,z,dimension}, building: <id> },
    page: int                             // chat pagination
  }
}
```

- `<buildingId>` is a per-town incrementing integer (`aom.build_acc`).
- `<playerKey>` is `"<uuid0>_<uuid1>_<uuid2>_<uuid3>"` from the player's `UUID` int array (delimited so it cannot collide).
- Positions and dimensions are **not** stored: the anchor marker is the source of truth for where a building is.
- Storage for a resource exists only once something has been generated or deposited.
- **All keys are NBT-path-safe by construction**: town names match `[A-Za-z0-9_]{1,16}`, building ids are integers, and job/resource ids are alphanumeric registry ids (no namespaces, no slashes). No quoted path segments are ever needed.

### Scoreboards

| Objective | Holder | Meaning |
| --- | --- | --- |
| `aom.population` | town | Townhouse contributions + member count. |
| `aom.employed` | town | Total staffed jobs. |
| `aom.build_acc` | town | Next building id. |
| `aom.players.ray` | player | Raycast step counter for `aom:internal/ray`. |
| `aom.tmp` | fake players | Scratch scores (loop counters, intermediate maths). |
| `aom.help`, `aom.start_village`, `aom.create_building`, `aom.menu`, `aom.town_info`, `aom.build`, `aom.action` | player | Trigger objectives. |

`unemployed` is always computed as `population − employed`; never stored.

## 7. Registry (data-driven, compiled)

Buildings and jobs are declared once in TypeScript. The registry is a **compile-time code generator**, not runtime data: for every building type the build emits specialized functions (hire/fire per job, generation, storage capacity, sign rendering, dialog action mapping). Nothing interprets jobs at runtime, which keeps functions small, typed and fast.

```ts
interface Job {
  id: string;
  label: string;
  kind: "unlock" | "generation" | "storage";
  resource?: string;    // generation / storage (alphanumeric id, e.g. "oak_logs")
  rate?: number;        // items per minute per worker (generation)
  capacity?: number;    // capacity per worker (storage)
  unlock?: string;      // unlock id (unlock)
}

interface BuildingType {
  id: string;                          // "lumbermill"
  label: string;                       // "Lumbermill"
  category: "townhouse" | "industrial";
  jobs: Job[];
}
```

The registry generates:

- per-type dialogs and their action index mapping,
- per-type hire/fire/generation/render functions,
- sign text templates,
- the storage/generation table for the minute pass,
- the help and town-book descriptions.

## 8. Rules

- **Founding a town**: name comes from the sign's first line, validated against `^[A-Za-z0-9_]{1,16}$`. Duplicate names are rejected with a clear message. The sign becomes the townhouse lectern (with an anchor marker).
- **Joining**: leaves the previous town first; updates `population` and membership; adds the member tag; syncs unlocks.
- **Leaving**: removes membership and the tag, decrements `population`; jobs stay staffed (population may go negative).
- **Deleting a town**: only offered to a member when they are the last member; requires confirmation; removes all anchors and all town data.
- **Building**: type comes from the dialog; the targeted block must be a sign; building ids are unique per town.
- **Removing a building**: breaking its anchor removes it; employed workers are freed (`employed` decreases), its marker is killed and storage is dropped.
- **Hiring/firing**: only while `unemployed > 0`; unlock jobs stop at 1 worker; generation/storage jobs are unlimited.
- **Generation**: once per minute per worker, `count += rate`, clamped to `capacity`; no catch-up after downtime (see section 9 for the chunk rule).
- **Unlocks**: recomputed from staffing whenever a job changes; online members are re-synced via their tag.
- **Names/escaping**: because names are validated, raw insertion into storage paths and score holders is safe.

## 9. Implementation notes

**mcgen additions** (add typed helpers + models before writing the pack):

- `dialog()` builder and models (types, inputs, actions) plus a `Datapack.dialog()` writer.
- Sign helpers: `setSignText(pos, lines[])`, `waxSign(pos)`, and a reader for town naming.
- Anchor helpers: `summonAnchor(pos, {town, building})`, `findAnchorAt(pos)`, `anchors()` selector.
- Command helpers not yet present: `data`, `scoreboard players` (set/add/remove/operation), `return`, `return run`, `execute if loaded`, `schedule`, `trigger`, `give`, `clear`, `recipe give|take`, `summon`, `setblock`, `kill`, `title`.
- A reusable **raycast** function factory (step 0.1 blocks, max 50, callback function ref), like the legacy `aom:ray`.
- A **trigger dispatcher** helper: enable/dispatch/reset for a list of trigger objectives.

**Function layout** (namespace `aom`):

```
load, tick, second, minute, refresh
town/{create,join,leave,delete,info}
build/{create,remove,scan}
jobs/{hire,fire,generate,unlock}
storage/{deposit,withdraw}
ui/{menu,render_book,render_signs,chat_page}
internal/{ray,triggers}
```

**Scheduling**

- `tick` — trigger dispatch and pending UI handling.
- `second` — anchor scan (1/s) and the minute counter.
- `minute` — generation: iterates anchor markers and applies each building's generated resources.
- `refresh` — every 5 seconds: rewrite sign text and the town book.

**Chunk rule**

Generation, scans and rendering iterate anchor markers, so they only cover loaded chunks. A town therefore produces while its chunks are loaded; players who want continuous production can `/forceload add` the town area. There is no catch-up for time when chunks were unloaded. This is a deliberate simplification — it removes the need to maintain iterable index arrays in storage.

**Performance**

- Never rewrite books or signs every tick; the refresh pass handles presentation.
- Keep per-tick work to trigger dispatch; everything else is scheduled.
- Store derived values (population, employed) in scoreboards rather than recomputing by iteration.

**Verification**

- `bun run typecheck` and `bun run build aom` must pass.
- Validate every generated JSON file with `python3 -c "import json,sys; json.load(open(sys.argv[1]))"`.
- There is no automated game test; at minimum load the pack in 26.3 and walk the core loop.

## 10. Defaults (locked unless changed)

1. Population = townhouse contributions + 1 per member.
2. `unemployed` may be negative; hiring requires it to be positive.
3. Townhouses start at 1 villager; the menu can add/remove contributors (free and unbounded for now — tuning hook).
4. Unlock jobs hold exactly 1 worker; generation and storage jobs are unlimited.
5. Generation: 1 item per minute per worker (per registry), capped by capacity, overflow discarded. It advances while the building's chunk is loaded; use `/forceload` to keep a town running, and there is no catch-up after downtime.
6. Storage base capacity is 0; capacity comes from storage workers.
7. Player key is `uuid0_uuid1_uuid2_uuid3`.
8. Town names match `^[A-Za-z0-9_]{1,16}$`.
9. Deleting a town is only possible for the last member, with confirmation, and removes all anchors and data.
10. UI actions use `/trigger` + numeric context (no operator-only commands from dialogs).
11. Anchors are marker entities; storage remains the source of truth for building state.
12. **aom stays unreleased for now**: do not add `packs/aom/VERSION` until the first release is intended, since its presence is what makes the workflow publish a release.

## Appendix — legacy pack

The previous implementation lives in `aom/` and is built with FileCompiler (`${...}`, `$<...>`, `$[...]`, methods in `aom/globals/`). It is kept only for reference and is excluded from releases.

Useful context, not requirements:

- Legacy building ids were `townhouse`, `house`, `lumbercamp`; storage was oak-only; the book was rewritten every tick and the building anchor was a lectern.
- Known legacy pitfalls **do not repeat**: missing `$` macro prefixes making data edits no-ops, raw SNBT insertion of names, inverted `y_rotation` ranges, per-tick book/marker work, guards reading the wrong key (`rueslt`), and unlock flags written to one path but read from another.
