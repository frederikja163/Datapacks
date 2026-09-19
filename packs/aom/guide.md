# Age of Minecraft — Player Guide

AOM is a village-building datapack. You name a town, build its townhall, grow it with buildings, staff jobs, and the town works for you: producing resources, storing them, and unlocking recipes for every member.

Everything is driven by **`/trigger` commands** and clickable chat menus, so you never need operator permissions. There is no custom mod — signs are the world UI.

The same guide is available in game: `/trigger aom.guide` opens this guide page by page in chat with `[<]` and `[>]` buttons.

## Quick start

1. Craft a **Townhall Plan** (2 oak planks + dirt) and place it. A message tells you what to do.
2. Write your **town name** on the sign's first line.
3. **Right-click the sign** to found the town. The sign becomes your **townhall**, you join automatically, and its menu opens in chat. (Left-click or break the sign to cancel.)
4. Place another **sign** (leave it blank or write a label), look at it and run `/trigger aom.menu`. Pick **Lumbermill** from the menu.
5. Stand at the lumbermill's sign and run `/trigger aom.menu`. Hire an **Oak cutter** (generates wood), an **Oak banker** (adds storage), and a **Tool crafter** (unlocks wooden tool recipes).
6. Deposit and withdraw oak logs from the lumbermill menu. While the chunk stays loaded, oak logs accumulate once per minute per Oak cutter.

## Commands

Every command is a trigger, usable by any player.

| Command | What it does |
| --- | --- |
| `/trigger aom.guide` | Prints this guide in chat, one page at a time, with `[<]` and `[>]` page buttons. |
| `/trigger aom.town_info` | Prints your town's information in chat, one page at a time, with `[<]` and `[>]` page buttons. |
| `/trigger aom.menu` | Raycasts to the sign you are looking at. Opens that building's menu, or the build menu if the sign has no building yet. |

Chat menu buttons run through `/trigger aom.menu` for you; you never type those hidden values yourself.

## The world UI

### Signs (industrial buildings)

A town has exactly one **townhall**. If its sign or block is destroyed, place a new sign, look at it and run `/trigger aom.menu`, then pick **Townhall** to rebuild it.

A building anchor is a **waxed sign** that you cannot edit. Its text updates itself every few seconds and always shows the building's live state:

```
Lumbermill
Oak cutters 2
Oak 1024/1728
MyTown
```

- **Line 1** — the building type.
- **Line 2** — the first generation job and how many workers it has.
- **Line 3** — the first resource and its stored / capacity amount.
- **Line 4** — the town that owns the building.

### Townhall sign

The townhall is a **waxed sign** that shows the town's population and member count. It is the town's anchor and menu: look at it and run `/trigger aom.menu` for Join/Leave/Delete town/Town info. (The townhall itself provides no villagers.)

For the full town report (population, members, buildings, jobs and storage), open the townhall menu and click **Town info** to print it in chat page by page.

## Towns

### Founding a town

- Craft a **Townhall Plan** (2 oak planks + dirt) and place it. A chat message walks you through founding.
- Type the town name on the **first line** of the sign, then **right-click the sign** to found the town.
- Names must be unique and may only use letters, numbers and underscores; keep them to 16 characters or fewer.
- The sign is kept (waxed) as the townhall, and the founding is announced to the server.
- You become the town's first member automatically, and its townhall menu opens so you can manage it.
- **Cancel** a founding by left-clicking the sign, or by breaking it; the Townhall Plan is returned.

### Joining and leaving

- Stand at the townhall sign, run `/trigger aom.menu` and click **Join town**.
- You belong to **one town at a time**: joining a new town leaves your old one first.
- Click **Leave town** in the same menu to leave without joining another.
- Members are tagged so the town can find them. Members are **not** workers.

### Town population

| Value | Meaning |
| --- | --- |
| **Population** | Sum of every townhouse's villagers in the town. |
| **Employed** | Sum of all staffed jobs across the town's buildings. |
| **Unemployed** | `Population − Employed`. It can be negative, and it is never stored anywhere. |

Hiring is only allowed while **Unemployed is positive**. Jobs are permanent, so if you over-hire, unemployed goes negative until more townhouses raise the population.

### Townhouses (villagers)

You can build **townhouses** with `/trigger aom.menu`. Each one:

- adds **+1 villager** to the town by default,
- has its own **Add villager** / **Remove villager** buttons in its menu (free and unlimited for now),
- is a waxed sign with its own menu: **Add villager** / **Remove villager** / **Delete building**.

Packing a townhouse keeps its villagers in the town's population until it is rebuilt.

### Deleting a town

- Only possible for the **last remaining member**, and it asks for confirmation.
- Deleting removes every building sign and all town data.

## Buildings

There are two ways to build:

- **Craft a plan** (a cheap block + 1 stick; it comes out as a sign) and **place it** where you want the building — floor or wall. That sign becomes the building's anchor and the building is created there. While not in a town, plans tell you to join one first.
- Or place a sign, look at it and run `/trigger aom.menu`, then pick a type. (The Townhall entry rebuilds the townhall; founding a *new* town needs a Townhall Plan placed outside a town.)

Either way the sign is waxed, labelled and becomes the building's anchor. The same position can only hold one building, and the sign must still be there.

| Building | Category | What it is for |
| --- | --- | --- |
| **Townhall** | Townhall | Anchors the town and manages membership. Provides no villagers. |
| **Townhouse** | Townhouse | Provides villagers to the town (adjustable). |
| **Lumbermill** | Industrial | Jobs that unlock recipes, generate oak logs and store them. |

### Removing a building

- **Right-click the building's sign** to open its menu, then choose **Delete building** (with a confirmation). Its **plan** is dropped at the sign, and placing it rebuilds that building elsewhere with the same workers/villagers and storage.
- Packing does **not** change the town's population or employment: a packed building keeps its staff (and storage) for when it is rebuilt.
- Packed buildings **stack per type**. Each plan you place rebuilds the most recently packed building of its type, so you can tear down several and rebuild them one by one.
- If its sign is destroyed some other way (explosion, piston), the once-per-second scan packs it the same way and drops its plan at the sign.

## Jobs

A building's menu lists its jobs. Jobs are hired with a button and are **permanent** — a worker can never be fired.

| Kind | Max workers | Effect while staffed |
| --- | --- | --- |
| **Unlock** | 1 | Grants a named unlock to the whole town (recipes, permissions). |
| **Generation** | Unlimited | Each worker adds its rate to the building's storage every minute. |
| **Storage** | Unlimited | Each worker adds capacity for its resource. |

A building can mix all three. The lumbermill is the reference example:

| Job | Kind | Limit | Resource | Amount |
| --- | --- | --- | --- | --- |
| Tool crafter | Unlock | 1 | — | Unlocks the wooden tool recipes |
| Oak cutter | Generation | Unlimited | Oak logs | 1 per minute per worker |
| Oak banker | Storage | Unlimited | Oak logs | +576 capacity per worker |

### Hiring

- **Hire** spends one unemployed villager; if there are none, nothing happens and you are told.
- Unlock jobs stop at one worker. Generation and storage jobs have no limit.
- Hiring is permanent — there is no way to unassign a worker.

## Storage

Each building keeps its own storage, per resource.

- `capacity = base + per_worker × workers`, and the base is **0** — a building with no storage workers cannot hold anything.
- **Generation is capped by capacity**; anything over the cap is discarded.
- **Deposit** takes items out of your inventory, up to the free space and what you are carrying.
- **Withdraw** gives you items up to what is stored.
- Buttons are available for **1**, **16**, **64** and **all**.

Storage only exists per building: two lumbermills do not share logs, and deleting a building drops its contents.

## Unlocks

An unlock is active while its unlock job is staffed — it is simply on or off because those jobs hold exactly one worker.

- Effects are defined in the registry. Today the only effect is **recipes**, granted with `recipe give` and removed with `recipe take`.
- Every member of the town gets the recipes, and they are re-synced whenever a job changes, when someone joins, and when a town is left.
- The lumbermill's **Tool crafter** unlocks the wooden axe, hoe, pickaxe, shovel and sword recipes for the whole town.

## How the town ticks

- **Every tick** — your `/trigger` inputs are read and handled.
- **Every second** — each building's anchor block is checked; if it was broken, the building is removed. A minute counter advances.
- **Every minute** — generation jobs add `rate × workers` to storage, clamped to capacity.
- **Every second** — sign text is rewritten.

### The chunk rule

Generation, anchor checks and rendering only visit **loaded chunks**. A building produces only while its chunk is loaded, and there is **no catch-up** for time you were away.

If you want a town to keep producing while nobody is nearby, `/forceload add` the area around it.

## The menus

### Townhall menu

Look at the townhall sign and run `/trigger aom.menu`.

| Button | Effect |
| --- | --- |
| Join town | Joins the town (leaving any previous town first). |
| Leave town | Leaves the town. Jobs stay staffed. |
| Delete town | Asks for confirmation, then removes all anchors and town data (last member only). |
| Town info | Prints the town pages in chat. |

### Townhouse menu

Look at a townhouse sign and run `/trigger aom.menu`. You must be a member of the town that owns it.

| Button | Effect |
| --- | --- |
| Add villager | This townhouse contributes one more villager. |
| Remove villager | This townhouse contributes one fewer villager. |
| Delete building | Asks for confirmation, then removes the townhouse (and its villagers). |

### Lumbermill menu

Open by looking at the lumbermill sign and running `/trigger aom.menu`. You must be a member of the town that owns it.

| Button | Effect |
| --- | --- |
| Hire Tool crafter | Unlocks the wooden tool recipes (max one worker, permanent). |
| Hire Oak cutters | Adds oak log generation (permanent). |
| Hire Oak bankers | Adds oak log storage capacity (permanent). |
| Deposit 1 / 16 / 64 / all Oak | Moves oak logs from your inventory into the building. |
| Withdraw 1 / 16 / 64 / all Oak | Moves oak logs from the building into your inventory. |
| Delete building | Asks for confirmation, then removes the building. |

Destructive buttons open a generic **Are you sure?** dialog with Yes / Cancel.

## Tips and troubleshooting

- **"You must look at a sign"** — stand close and aim directly at the sign before running the trigger. (`/trigger aom.menu` only needs you to stand next to the building.)
- **Town name rejected** — only letters, numbers and underscores are allowed, and the name must not already exist.
- **"Found a town first"** — build on a sign with `/trigger aom.menu` only after you have founded or joined a town.
- **"You have no unemployed villagers"** — your population must be larger than the number of staffed jobs. Build townhouses to raise population.
- **Nothing generates** — the generation job must have workers, the resource needs capacity from storage workers, and the chunk must be loaded. Generation is one batch per minute.
- **"Nothing can be deposited"** — the building is at capacity (hire storage workers) or you are not carrying the resource.
- **Recipes are missing** — the unlock job must still be staffed. Recipes are re-synced when jobs change and when you rejoin the town.
- **A building vanished** — its anchor block was broken or replaced with a different block.
- **"This building belongs to another town"** — you can only open the menu of a building owned by your own town.

## Reference

### Buildings and jobs

| Building | Job | Kind | Resource | Amount |
| --- | --- | --- | --- | --- |
| Townhouse | — | — | — | +1 villager (adjustable) |
| Lumbermill | Tool crafter | Unlock | — | Wooden tool recipes |
| Lumbermill | Oak cutter | Generation | Oak logs | 1 per minute per worker |
| Lumbermill | Oak banker | Storage | Oak logs | +576 capacity per worker |
| Lumbermill | — | Storage base | — | 0 |

### Unlocked recipes

The Tool crafter grants all members:

- Wooden axe
- Wooden hoe
- Wooden pickaxe
- Wooden shovel
- Wooden sword
