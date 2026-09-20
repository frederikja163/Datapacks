# Age of Minecraft — Player Guide

AOM is a village-building datapack. You name a town, build its townhall, grow it
with buildings, staff jobs, and the town works for you: producing resources,
storing them, and unlocking recipes for every member.

Everything is driven by **`/trigger` commands** and clickable chat menus, so you
never need operator permissions. There is no custom mod — signs are the world UI.

The same guide is available in game: `/trigger aom.guide` opens it page by page
with `[<]` and `[>]` buttons.

## Quick start

1. Craft a **Townhall Plan** (a plank + sapling) and place it on a sign.
2. Write your **town name** on the sign's first line (letters, numbers and
   underscores only, unique).
3. **Right-click the sign** to found the town. You join automatically and the
   townhall menu opens. (Left-click or break the sign to cancel.)
4. Craft a **plan** for any other building (one plank plus the building's item)
   and place it where you want it. The plank's wood decides the sign you get,
   e.g. spruce planks make a spruce sign.
5. **Right-click a building's sign** to open its menu and staff its jobs.
6. Hire **collectors** to generate resources and **bankers** to store them.
   Unlock jobs grant recipe knowledge to every town member.

## Commands

| Command | What it does |
| --- | --- |
| `/trigger aom.guide` | Prints this guide in chat with page buttons. |
| `/trigger aom.town_info` | Prints your town's information in chat. |

Menus are opened by **right-clicking a building's sign**; there is no menu
command.

## Crafting is gated

The pack enables the `limited_crafting` gamerule. You can only craft recipes
your character knows:

- **Plans** are recipes too. If a plan is gated, you cannot craft it until the
  town's prerequisite job is staffed.
- **Unlocks** grant their recipes to every member of the town while staffed.
- Recipes listed under more than one building need **all** of those jobs
  staffed (for example `shears` needs Blacksmith and Shepherd).
- Recipes are re-synced when jobs change, when you join, and when a town is
  packed or deleted. Leaving a town takes its recipes back.

Building **requirements** use this same mechanism: some plans are locked until
another building's unlock job is staffed (see the map below).

```
Blacksmith -> Coppersmith -> Gold smith -> Jeweller
Library -> School -> University
Farm unlocks the windmill plan
```

## Towns

- **Found** with a Townhall Plan: place it, write the name on the first line,
  then right-click. You can cancel by breaking the sign (the plan is returned).
- You belong to **one town at a time**; joining another leaves the first.
- **Population** is the sum of every townhouse's villagers.
- **Employed** is every staffed job. Hiring needs Population above Employed.
- Only the **last member** can delete a town, after a confirmation.
- Members are tagged so the town can find them; members are not workers.

## Jobs

Jobs are **permanent**, except the Custom building's **Hired help**, which can
be fired.

| Kind | Limit | Effect |
| --- | --- | --- |
| **Unlock** | its requirement (1, 2 or 5) | Grants recipes to the whole town. |
| **Generation** | Unlimited | Adds the resource at the collector's rate. |
| **Storage** | Unlimited | Adds capacity for its resource. |
| **Mechanic** | varies | Levellers, the University Portal, or hired help. |

## Storage and generation

- Each building keeps its own storage, per resource. Capacity starts at **0**;
  hire storage workers (bankers) to hold anything. Bankers give **+576**
  (8 stacks) per worker.
- Generation is capped by capacity; anything over the cap is discarded.
- Deposit and Withdraw move **1**, **16**, **64** or **all**.
- Generation rates run from **1 / minute** (bulk materials) through
  **1 / 2**, **1 / 5** up to **1 / 20 minutes** (rare finds).
- The mine rolls a weighted ore table; the quarry has a digger per stone; the
  butcher and fisher have their own tables.
- Only loaded chunks produce, and there is no catch-up for time away.

### Discovery

A storage resource is **locked** until your town has obtained at least one of
it. Pick the item up yourself once and the whole town discovers it. Until then
you cannot hire its collectors or bankers, nor deposit into it. Grouped
storages (the mine's ores, the fisher's fish) unlock one item at a time.

## House types

Every plan uses **one plank** that decides the sign type — oak planks give an
oak sign, spruce planks a spruce sign, and so on. Townhouses use a plank plus a
stick, and Custom uses a plank plus a sign.
Place the sign first, then use the plan on it. Plans are the only way to build a
new building, and only the **Townhall Plan** can be crafted outside a town — the
rest need you to be in one. The Townhall accepts any sapling and the Lumbermill
any log; Custom accepts any sign.

## Special mechanics

### Mine depth

Players have **mining fatigue** below y=62. Each staffed Mine **Leveller**
lifts the limit by 10 levels, down to the world floor at y=-64.

### University Portal

Portals can always be lit, but until a **Portal** is staffed at the University,
a town member who enters the Nether is immediately returned to their last
overworld position. The pack records that position once a second, so the return
point is always valid. When the job is staffed, travel works normally.

## Buildings

Each building can have unlock, generation, storage and mechanic jobs. The table
below lists what each building provides; exact recipes and rates are in
`DESIGN.md`.

The **advancements page** tracks your progress: every building your town has
made is granted, and it is revoked again if the building is packed or deleted.

| Category | Buildings |
| --- | --- |
| Civic | Townhall, Townhouse |
| Extraction | Lumbermill, Mine, Quarry, Docks, Ice House |
| Industry | Stone cutter, Blacksmith, Gold smith, Jeweller, Coppersmith, Kiln, Mason's Yard |
| Agriculture | Farm, Windmill |
| Husbandry | Barn, Leather tanner, Shepherd, Spinnery, Weaver, Apiary |
| Food | Baker, Butcher, Brewery, Fisher |
| Crafting | Weapon smith, Fletcher, Glass blower, Painter, Redstone Workshop, Bard, Armory |
| Knowledge | Library, School, University, Cartographer's Guild, End Observatory |
| Special | Custom |

## Removing buildings

Open a building's menu and choose **Delete building**. Its plan is dropped at
the sign, and placing it rebuilds the building elsewhere with the same workers,
villagers and storage. Packed buildings stack per type, newest first. If a sign
is broken some other way, the once-per-second scan packs it the same way.

## How the town ticks

- **Every tick** — triggers are read, buildings whose sign vanished are packed,
  and players without the starter recipes are set up.
- **Every second** — mine depth and the Portal are enforced, overworld return
  points are recorded, and a minute counter advances.
- **Every minute** — generation runs for the jobs whose interval is due.
- **Every 2 seconds** — sign text is rewritten.

## Tips and troubleshooting

- **Nothing happens** — stand close and right-click the building's sign.
- **"No unemployed villagers"** — population must exceed staffed jobs; build
  townhouses.
- **"You have not discovered this resource yet"** — pick the item up once.
- **Recipe missing** — the unlock job must still be staffed, or a multi-building
  requirement is unmet.
- **Blocked below y=62** — staff a Mine Leveller.
- **Sent back from the Nether** — staff the University Portal.
- **A building vanished** — its anchor block was broken; the plan is dropped.
