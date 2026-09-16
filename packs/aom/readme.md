# Age of Minecraft (AOM) — Spec

> Status: specification for the planned TypeScript rebuild.
> The current implementation lives in `aom/` and is built with FileCompiler. It is excluded from the release workflow and will be replaced by a `packs/aom` TypeScript pack.

## What AOM is trying to do

A village-building and management datapack inspired by **Millénaire** and survival challenge packs. The player settles the world from nothing: name a sign, found a village, and grow a town that works for them. Buildings are created by looking at named signs, each building becomes an interactive lectern/book UI, and the settlement's population is spent on storage, resources and recipe unlocks.

Design pillars:

- **Build with signs.** No mods or custom GUIs — signs, `/trigger` commands and books/lecterns are the entire interface.
- **Population is the currency.** Houses produce unemployed villagers; every upgrade spends them.
- **The town works for you.** Once staffed, buildings should generate resources over time and expand storage.
- **Progress through unlocks.** Spending villagers unlocks crafting recipes and new capabilities.
- **The world grows visibly.** Every building leaves a physical lectern in the world that acts as its control panel.

## Player-facing loop

1. `/trigger aom.help` — tutorial message with a clickable start command.
2. Place a sign whose first line is the village name, look at it, run `/trigger aom.start_village` → village is created together with its first **townhouse** placement.
3. Open the townhouse book and press **Join** to become a member of the village.
4. Place signs whose first line is a building name (`townhouse`, `house`, `lumbercamp`), look at them and run `/trigger aom.create_building` to construct them (must be in a village).
5. Every placement turns into a **lectern with a written book**. Books carry a `[Move]` / `[Delete]` toolbar plus building-specific actions.
6. **Houses** add one unemployed villager per house. **Lumbercamps** let you spend villagers on the Tool Crafter (unlocks wooden tool recipes) and on Oak Clerks (each adds storage).
7. **Deposit/withdraw** oak logs through the lumbercamp book; storage is capped by the number of clerks.

## Features (implemented today)

### Triggers

| Trigger objective | Handler | Effect |
| --- | --- | --- |
| `aom.help` | `triggers/help/` | Prints `help.json` with a clickable `/trigger aom.start_village`. |
| `aom.start_village` | `triggers/start_village/` | Raycasts from the eyes to a sign, uses the sign's first message as the village name, calls `new_village`, then `new_building` (townhouse). |
| `aom.create_building` | `triggers/create_building/` | Raycasts to a sign, uses the first message as the building id, reads the player's village, calls `new_building`. |

Triggers are enabled every tick by the `func` FileCompiler helper, and are reset to 0 after handling. A miss shows `error.json` ("You must look at a sign for this command to work.").

### Interaction / raycasting

- `ray` steps 0.1 blocks along the view direction up to 50 times (`aom.players.ray`), calls `on_hit` at the first non-air block or returns 0.
- Used by both village and building triggers.

### Villages

- Created by `new_village`: duplicate names are rejected; otherwise `villages.<name>` is stored, the village's scoreboard counters are zeroed, a townhouse placement is created, and a broadcast announces the village.
- **Membership** lives in `players.<uuid0><uuid1><uuid2><uuid3>.village_name`; `player_in_village` returns 1/0 for the current target and village.
- **Join** happens through the townhouse book; joining another village leaves the current one first.
- **Leave** only exists as a function (`leave`), it has no button or trigger.
- Villages cannot be deleted at all.

### Placements (lecterns & books)

- Each building placement gets an incrementing id per village + building type (`aom.buildings.<type>_acc` / `_count` scoreboards) and a **marker entity** carrying `data.aom.{id,placement,building_name,village_name}`.
- The placement stores `village_name`, `building_name`, `placement` and a facing `direction` derived from player yaw.
- Every tick, `update_placement/` runs for every placement marker:
  - kills nearby dropped written books and lecterns if the block is no longer a lectern,
  - places a lectern facing `direction` if missing (`place_lectern`),
  - rewrites the book through the `lectern` FileCompiler method, and runs the building's `placement/update` hook.
- The book is regenerated from runtime macros each tick, so it always shows live data (player counts, storage, unlock state) and the buttons embed fully-resolved commands.
- **Delete** is a toolbar button: membership is checked, the building's `placement/delete` hook may veto (house refuses if there are no unemployed villagers), then the marker is killed and the placement NBT removed.
- **Move** is a stub: the button exists but `start_move` only prints "This is not implemented yet."

### Buildings

| Building id | Create hook | Placement hook | Delete hook | Purpose |
| --- | --- | --- | --- | --- |
| `townhouse` | no-op | no-op | no-op | Village overview, **Join** button. |
| `house` | no-op | `+1` unemployed villager | `-1` villager (refuses at 0) | Population source. |
| `lumbercamp` | initialises `oak.{clerks,max_items,items}` | no-op | no-op | Tool crafter + oak storage. |

**Townhouse** book page: player count score, `[Join]` button.

**House** book page: toolbar only.

**Lumbercamp** book pages:

- Page 1 — **Tool crafter**: shows `unlocks.wooden_tools`, `[Hire]` spends 1 villager to unlock wooden tool recipes (`unlock_tools`).
- Page 2 — **Oak logs**: clerk count, storage `items/max_items`, `[Hire]` spends 1 villager for +1 clerk and +576 capacity (`hire_clerk`), plus seven **Withdraw** and seven **Deposit** buttons (1/8/16/32/64/576/all).

### Resources & logistics

- Deposit/withdraw operate on `villages.<village>.<building>.oak.{items,max_items}` with `id: minecraft:oak_log`.
- `deposit/` checks membership, capacity, then clears up to the requested count from the player's inventory and stores it.
- `withdraw/` checks membership, then gives up to the requested count (or everything available).
- Capacity = 576 per clerk (code value; the UI hover and comments say both 576 and 1000).
- `aom.globals` is a scratch scoreboard for `items`, `max_items`, `deposit`, `withdraw`, `tmp`.

### Recipe sync

- `update_player/` runs on join, on `unlock_tools`, and on rejoin (`aom.left`, the `minecraft.custom:minecraft.leave_game` objective).
- `update_player/town` gives/takes `wooden_axe`, `wooden_hoe`, `wooden_pickaxe`, `wooden_shovel`, `wooden_sword` based on the unlock flag.

### UI / text

- Help, error and announcement messages are plain text components; the help command is clickable (`suggest_command`).
- Book toolbar: `[Move]` (blue, coming soon) and `[Delete]` (red), footer `village/building`.
- Deposit/withdraw buttons in green/red with hover descriptions.

## Data model

### `aom:data`

```
villages: {
  <village_name>: {
    village_name: string,
    unlocks: { wooden_tools: "true" },
    <building_name>: {
      village_name: string,
      building_name: string,
      <placement:int>: {
        placement: int,
        building_name: string,
        village_name: string,
        direction: "north" | "east" | "south" | "west"
      },
      oak: { clerks: int, max_items: int, items: int }   // lumbercamp
    }
  }
},
players: {
  "<uuid0><uuid1><uuid2><uuid3>": {
    uuid0: int, uuid1: int, uuid2: int, uuid3: int,
    village_name: string
  }
}
```

### `aom:tmp` (transient staging for macro calls)

`new_village`, `start_village`, `create_building`, `new_placement`, `delete_placement`, `update_player`, `join`, `deposit`, `withdraw`, and the shared `result` flag.

### Scoreboards

| Objective | Criteria | Meaning |
| --- | --- | --- |
| `aom.globals` | dummy | scratch scores (`items`, `max_items`, `deposit`, `withdraw`, `tmp`). |
| `aom.players.ray` | dummy | per-player raycast step counter (0–50). |
| `aom.villages.villager_count` | dummy "Population" | unemployed villagers, per village. |
| `aom.villages.player_count` | dummy | village members, per village. |
| `aom.buildings.<type>_acc` | dummy | next placement id per village + building type. |
| `aom.buildings.<type>_count` | dummy | placement count per village + building type. |
| `aom.help` / `aom.start_village` / `aom.create_building` | trigger | player commands. |
| `aom.left` | `minecraft.custom:minecraft.leave_game` | rejoin detector for recipe sync. |

## Intended but not implemented

Things the README or UI promise that the code does not do:

- **Move building** — button exists, prints "not implemented".
- **Leave village** — no button or trigger; README says the townhouse lets you leave.
- **Delete village** — impossible, though the duplicate-name error tells the player to remove the old village.
- **Nine wood types** (spruce, birch, jungle, acacia, dark oak, mangrove, cherry, crimson, warped) — only `oak` exists.
- **Foragers** — README promises 1 log/minute per forager; no timed generation exists.
- **Employed villager tracking** — jobs are just counters/flags; deleting a house does not consider employment.
- **Tool crafter** — unlocks tool recipes only; no other unlocks.

## Known bugs & inconsistencies (to fix in the rebuild)

High-confidence issues found while reading the source:

1. `leave.mcfunction:5` — missing `$` macro prefix, so the membership key is never removed (currently masked because join overwrites it).
2. `new_building.mcfunction:6` — same missing `$` prefix; failed buildings are not cleaned up.
3. `deposit/.mcfunction:2` — typo `rueslt` means the membership guard never fires; non-members can deposit.
4. `update_player/town.mcfunction` — reads `villages.<village>.lumbercamp.wooden_tools`, but the flag is written to `villages.<village>.unlocks.wooden_tools`, so recipes are never granted and are removed on every sync.
5. `new_placement/place_marker.mcfunction:7` — `y_rotation=135..-135` is an inverted range; a placement made facing north gets no `direction`, and the lectern macro call then fails entirely.
6. `hire_clerk.mcfunction:12` — adds 576 capacity while the comment says 1000; the page hover text contradicts itself (576 vs 1000).
7. Stale `aom:tmp.result` can leak between building creations/deletions and cause false failures.
8. `new_village` duplicate-name path uses `return run tellraw` (returns success) and targets `@p` instead of `@s`.
9. `leave` announces errors with `tellraw @a` instead of the caller.
10. Lumbercamp storage lives at building scope, so multiple lumbercamps share one inventory and deleting a placement leaves the data behind.
11. `aom.villages.player_count` drifts because leaving is not reachable through the UI.
12. `village_name` is inserted as raw SNBT in some places; names containing quotes/backslashes break.

## Technical notes on the current implementation

- Built with **FileCompiler**: `${method args}` includes, `$<file>` inline includes, `$[n]` parameters, methods in `aom/globals/`.
- Generated output must start with `$` for macro lines; `$${lectern "$<book.json>"}` relies on FileCompiler consuming only the second `$` so the emitted line stays a runtime macro.
- Function IDs ending in `/` are real (`aom:update_player/`, `aom:triggers/help/`) — they are `.mcfunction` files literally named `.mcfunction`.
- Books use `minecraft:written_book_content` with `resolved:false` and post-1.21.5 `hover_event`/`click_event` text components.

## UI redesign (direction)

The current UI is built around lecterns whose book is rewritten every tick. The rebuild moves to **signs as the building anchor** and **dialogs as the menu**.

### Findings (Minecraft 26.3)

- **Dialogs** (`data/<ns>/dialog/<name>.json`, opened with `/dialog show @s <id>`) support buttons plus `minecraft:text`, `boolean`, `single_option` and `number_range` inputs (1.21.6+). Inputs are referenced from a `dynamic/run_command` action template with `$(key)`, and a button can open another dialog with `show_dialog`.
- **Sign click events no longer run by default** (26.3). Restoring them requires the sign's `allow_op_features` field (default `false`, intended as an op-feature escape hatch). Newly placed signs also no longer resolve dynamic text components, so live sign text must be written as plain text by functions.
- **There is no reliable vanilla way to detect an arbitrary empty-hand right-click on a sign.** `any_block_use`/`default_block_use` only fire when the interaction is consumed (editing an unwaxed sign, dyeing, waxing), and `item_used_on_block` needs an item that actually does something.
- Click events and dialog buttons run commands at the player's permission level. Non-ops can only run `/trigger`, so interactive buttons should set trigger scores that a ticking function consumes. Free-text dialog input submitted with `dynamic/run_command` has the same limitation.
- Because of that, **signs remain the only permission-free free-text input** in survival (place a sign and type). Dialog text inputs are practical for operator/singleplayer menus or where the value can be a `single_option`/`number_range`.

### Design decisions

**Interaction model**

- Dialog menus are opened with `/trigger` commands (raycast while looking at a block), not by clicking signs. Sign click events are off by default in 26.3, so the design does not rely on `allow_op_features`.
- Free-text input stays on signs; everything else is a dialog choice, button or slider.

**Commands**

| Command | Opens / does |
| --- | --- |
| `/trigger aom.help` | Help dialog or chat message. |
| `/trigger aom.start_village` | Reads the sign you are looking at as the town name and founds the village. |
| `/trigger aom.create_building` | Opens the **build dialog** for the sign you are looking at to choose the building type (townhouse, house, lumbercamp, ...). The sign does not need text. |
| `/trigger aom.menu` | Opens the dialog of the building whose sign you are looking at (hire, deposit/withdraw, unlock, rename, delete, ...). |
| `/trigger aom.town_info` | Prints the town book in chat with `[<]` / `[>]` page buttons. |

**Town block (townhouse)**

- Stays a **lectern with a multi-page book** showing all town information.
- `/trigger aom.town_info` shows the same information in chat. Page navigation uses clickable buttons that set a trigger score and re-render the page (permission-free).

**Buildings**

- Each building is anchored to a **sign** showing its type and live status (for example `House`, `Villagers 2/4`). The sign text is written by functions as plain text and the sign is waxed.
- **Breaking the sign removes the building.** A scheduled scan (not every tick) verifies each placement's sign still exists, guarded with `execute if loaded` so unloaded chunks do not cause false deletes.
- Creating a building: place a sign, look at it, run `/trigger aom.create_building`, pick the type in the dialog. The sign then becomes the building's anchor.

**Villagers**

- A townhouse contributes villagers to the village pool, starting at 1.
- Houses can house villagers; a villager from a house can be added to a townhouse to raise that townhouse's contribution (for example to 2).
- Removing a townhouse removes the villagers it contributed.

## Open questions for the TypeScript rebuild

1. **Scope**: faithful port first, or port + fix the bugs above in one pass?
2. **Building system**: data-driven registry (id, sign template, dialog, resource types) so a new building or wood type is configuration, not code?
3. **Resources**: generalise storage/foragers to a wood-type table instead of oak-only.
4. **Identity**: keep the concatenated-UUID player keys, or store the UUID array and match on it?
5. **Village lifecycle**: how should leave and delete-village work? What happens to buildings, players and storage?
6. **Townhouse villagers**: when a house is removed, what happens to villagers it contributed to a townhouse?
7. **Village names**: how should names be sanitised/escaped so they are safe as storage keys, score holders and macro arguments?
