# Age of Minecraft — Design Document

A village-building datapack. You found a town, raise its buildings, staff them
with villagers, and the town works for you: producing resources, storing them,
and unlocking recipes for every member.

## House types
Each craft should always consist of one plank that determines the type of sign. For example spruce plank = spruce sign.
And another item that is specified below. Only the Townhall Plan can be crafted
outside a town; every other plan needs the crafter to be in one.

A building can have a few different attributes:
 - Add villagers: Ability to add villagers
 - Unlock: As long as enough villagers are hired (default 1) this is unlocked for all people in the village
 - Storage: Can hire bankers for 8 stacks of storage and collectors that each produce one item at a configurable rate (default 1 / minute). Each stored resource must be discovered by picking up 1 of it yourself first.
 - Requires: The building can only be built while every listed building has its unlock job staffed.

## Building categories

| Category | Buildings |
| --- | --- |
| Civic | Townhall, Townhouse |
| Extraction | Lumbermill, Mine, Quarry, Docks, Ice House, Nether Outpost |
| Industry | Stone cutter, Blacksmith, Gold smith, Jeweller, Coppersmith, Kiln, Mason's Yard |
| Agriculture | Farm, Windmill |
| Husbandry | Barn, Leather tanner, Shepherd, Spinnery, Weaver, Apiary |
| Food | Baker, Butcher, Brewery, Fisher |
| Crafting | Weapon smith, Fletcher, Glass blower, Painter, Redstone Workshop, Bard, Armory |
| Knowledge | Library, School, University, Cartographer's Guild, End Observatory |
| Special | Custom |

### Recipe ownership

- Recipes listed under a building are granted to every member of the town
  while that building's unlock job is staffed.
- If the **same recipe is listed under more than one building**, it is only
  granted while **every** listed building has its unlock job staffed. The
  duplicate entries are marked with `(also <building>)`.
- Recipe ids below omit the `minecraft:` prefix, e.g. `wooden_axe` is
  `minecraft:wooden_axe`. Windmill plans use the `aom:` prefix.
- Every plan uses a unique anchor item, so two buildings never share a craft.

### Storage and generation

Storage belongs to one building and one resource, so two buildings never share
a stockpile. Each building can hire:
- **Collectors** (generation) — each worker produces its resource every
  `interval`. The interval is configured per job, so buildings produce at
  different speeds.
- **Bankers** (storage) — each worker adds capacity for its resource
  (default **576**, i.e. 8 stacks; also configurable per job).

Only buildings that generate a resource need bankers. Generation is capped by
capacity and anything over the cap is discarded.

Storage is only for **raw, gatherable resources** (logs, ores, crops, drops).
Anything crafted or smelted is never stored — players carry and process it
manually.

#### Discovery

A storage resource is locked until you have obtained at least one of that item
yourself. To unlock the birch chopper's storage you must first pick up a birch
log; to store diamonds from the mine you must first mine a diamond, and so on.
Discovery is tracked per resource, so grouped storages (the quarry's stones, the
fisher's fish) unlock one item at a time. Until a resource is discovered you
cannot hire its collectors or bankers.

#### Generation rates

| Rate | Used for | Examples |
| --- | --- | --- |
| 1 / minute | bulk raw materials | logs, cobblestone, gravel, sand, crops, ice, snow |
| 1 / 2 minutes | animal and farm products | fish, raw meat, wool, nether quartz |
| 1 / 5 minutes | slow animal products | honeycomb, glowstone dust |
| 1 / 20 minutes | precious finds | ancient debris |

Multi-resource collectors (the mine, the butcher, the fisher) roll a weighted
table for which resource is produced.

---

## Civic

### Townhall
Will run `/trigger town_info` when clicked and makes it possible to join towns
 - Created by placing a sign with a name and running `/trigger aom.create_town`
 - Craft: Sapling
When creating a new town the player should automatically join said town.
 - Unlocks: none.

### Townhouse
Used to add villagers
 - Craft: Stick
 - Add villagers
 - Unlocks: none.

---

## Extraction

### Lumbermill
Used to store and farm wood
 - Craft: Log
 - Unlock (Tool crafter): grants the wood recipes below
 - Storage (oak chopper): oak logs — 1 / minute
 - Storage (spruce chopper): spruce logs — 1 / minute
 - Storage (birch chopper): birch logs — 1 / minute
 - Storage (jungle chopper): jungle logs — 1 / minute
 - Storage (acacia chopper): acacia logs — 1 / minute
 - Storage (dark oak chopper): dark oak logs — 1 / minute
 - Storage (mangrove chopper): mangrove logs — 1 / minute
 - Storage (cherry chopper): cherry logs — 1 / minute
 - Storage (pale oak chopper): pale oak logs — 1 / minute
 - Storage (poplar chopper): poplar logs — 1 / minute

Unlocks (Tool crafter, 1 villager):
 - `crafting_table`
 - `wooden_axe`
 - `wooden_pickaxe`
 - `wooden_shovel`
 - `wooden_sword` (also Weapon smith)
 - `wooden_spear` (also Weapon smith)

### Mine
Used to unlock deeper mining
 - Craft: Wooden pickaxe
 - Unlock* (leveller): 10 y-levels per worker
 - Storage** (miner): raw ores — 1 / minute per collector

> (*) By default players should have mining fatigue when below layer 62 (water level). Each leveller lowers the limit by 10 y-levels, down to y = -64 (the bottom of the world); it can never go below the world floor.

> (**) The mine storage works differently. Every minute each collector rolls once on the ore table below and stores the result; if there is no storage space for the item it is lost.

| Drop | Chance | Per day (1 miner) |
| --- | --- | --- |
| coal | 30% | 6 |
| raw copper | 25% | 5 |
| raw iron | 20% | 4 |
| redstone dust | 10% | 2 |
| lapis lazuli | 7% | 1.4 |
| raw gold | 5% | 1 |
| diamond | 0.5% | 0.1 |
| emerald | 0.2% | 0.04 |
| nothing | 2.3% | 0.46 |

> One miner rolls once per minute, and a Minecraft day is 20 minutes, so the "per day" column is `chance × 20` (e.g. a diamond roughly every 10 in-game days from a single miner).

> Scaling: the table is weighted so a lone miner only finds the occasional gem, while a big crew mostly scales up the common ores. Twenty miners average about 6 diamonds and 2 emeralds an hour, so rare ore stays rare without any hard caps.

 - Unlocks: no recipes. The leveller unlocks depth instead.

### Quarry
Used to mine minerals in mass quantities
 - Craft: Gravel
 - Storage (gravel digger): gravel
 - Storage (sand digger): sand
 - Storage (dirt digger): dirt
 - Storage (cobblestone digger): cobblestone
 - Storage (granite digger): granite
 - Storage (andesite digger): andesite
 - Storage (diorite digger): diorite
 - All quarry diggers collect 1 / minute.
 - Unlocks: none.

### Docks
The harbour. Builds boats and rafts.
 - Craft: Shovel
 - Unlock (Shipwright): the boat and harbour recipes below

Unlocks (Shipwright, 1 villager):
 - boats: `oak_boat`, `spruce_boat`, `birch_boat`, `jungle_boat`, `acacia_boat`,
   `dark_oak_boat`, `mangrove_boat`, `cherry_boat`, `pale_oak_boat`,
   `poplar_boat`, `bamboo_raft`
 - chest boats: `oak_chest_boat`, `spruce_chest_boat`, `birch_chest_boat`,
   `jungle_chest_boat`, `acacia_chest_boat`, `dark_oak_chest_boat`,
   `mangrove_chest_boat`, `cherry_chest_boat`, `pale_oak_chest_boat`,
   `poplar_chest_boat`, `bamboo_chest_raft`
 - `conduit`

### Ice House
Keeps the town's ice and snow, and packs it for storage.
 - Craft: Snowball
 - Unlock (Icer): the frozen recipes below
 - Storage (ice harvester): snow — 1 / minute; ice — 1 / minute

Unlocks (Icer, 1 villager):
 - `snow_block`, `snow`
 - `packed_ice`, `blue_ice`
 - `powder_snow_bucket`

### Nether Outpost
The town's foothold in the Nether. Requires a working portal.
 - Craft: Netherrack
 - Unlock (Nether miner): the nether recipes below

Unlocks (Nether miner, 1 villager):
 - `nether_bricks`, `red_nether_bricks`, `chiseled_nether_bricks`,
   `cracked_nether_bricks`, `nether_brick_fence`, `nether_brick_stairs`,
   `nether_brick_slab`, `nether_brick_wall`
 - `quartz_block`, `quartz_bricks`, `quartz_pillar`, `quartz_stairs`,
   `quartz_slab`, `smooth_quartz`, `smooth_quartz_stairs`, `smooth_quartz_slab`
 - `glowstone`
 - `soul_torch`, `soul_lantern`, `soul_campfire`
 - `blackstone`, `polished_blackstone`, `polished_blackstone_bricks`,
   `blackstone_stairs`, `blackstone_slab`, `blackstone_wall`
 - `basalt`, `polished_basalt`, `smooth_basalt`
 - crimson and warped wood set (`crimson_planks`, `warped_planks`, signs, doors,
   trapdoors, fences, gates, stairs, slabs, buttons, pressure plates)
 - `respawn_anchor`
 - `netherite_upgrade_smithing_template` (also Jeweller)
 - `eye_of_ender` (also End Observatory)
 - Storage (nether miner): netherrack — 1 / minute; nether quartz — 1 / 2 minutes
 - Storage (glow harvester): glowstone dust — 1 / 5 minutes
 - Storage (debris miner): ancient debris — 1 / 20 minutes

---

## Industry

### Stone cutter
Used to craft stone recipes
 - Craft: Cobblestone
 - Unlock (stone cutter): the cobblestone/stone recipes below

Unlocks (Stone cutter, 1 villager):
 - `cobblestone_stairs`, `cobblestone_slab`, `cobblestone_wall`
 - `stone_stairs`, `stone_slab`
 - `stone_bricks`, `stone_brick_stairs`, `stone_brick_slab`, `stone_brick_wall`
 - `chiseled_stone_bricks`, `cracked_stone_bricks`, `mossy_stone_bricks`
 - `mossy_cobblestone`
 - `smooth_stone`, `smooth_stone_slab`
 - `furnace` (also Blacksmith)
 - `stonecutter`
 - `stone_axe`, `stone_pickaxe`, `stone_shovel`
 - `stone_hoe` (also Farm)
 - `stone_sword` (also Weapon smith)
 - `stone_spear` (also Weapon smith)

### Blacksmith
Used to craft with iron
 - Craft: Raw Iron
 - Unlock (blacksmith): the iron recipes below

Unlocks (Blacksmith, 1 villager):
 - `iron_ingot` (smelting raw iron)
 - `iron_block`, `iron_bars`, `iron_door`, `iron_trapdoor`, `chain`, `lantern`
 - `anvil` (also Armory), `cauldron` (also Brewery), `hopper`
 - `compass`
 - `rail`, `minecart`, `chest_minecart`, `hopper_minecart`
 - `bucket` (also Farm)
 - `shears` (also Shepherd)
 - `saddle` (also Leather tanner, Barn)
 - `flint_and_steel` (also School)
 - `shield`
 - `iron_helmet` (also Armory), `iron_chestplate` (also Armory),
   `iron_leggings` (also Armory), `iron_boots` (also Armory)
 - `iron_axe`, `iron_pickaxe`, `iron_shovel`
 - `iron_hoe` (also Farm)
 - `iron_sword` (also Weapon smith)
 - `iron_spear` (also Weapon smith)
 - `furnace` (also Stone cutter)

### Gold smith
Used to craft with gold
 - Craft: Raw gold
 - Requires: Coppersmith
 - Unlock (gold smith): the gold recipes below

Unlocks (Gold smith, 1 villager):
 - `gold_ingot` (smelting raw gold), `gold_block`, `gold_nugget`
 - `golden_apple`
 - `golden_carrot` (also Baker)
 - `glistering_melon_slice` (also Brewery)
 - `golden_helmet`, `golden_chestplate`, `golden_leggings`, `golden_boots`
 - `golden_axe`, `golden_pickaxe`, `golden_shovel`
 - `golden_hoe` (also Farm)
 - `golden_sword` (also Weapon smith)
 - `golden_spear` (also Weapon smith)
 - `clock`, `powered_rail`, `light_weighted_pressure_plate`
 - `bell` (also Bard)
 - `blast_furnace`

### Jeweller
Used to craft with diamonds
 - Craft: Diamond
 - Requires: Gold smith
 - Unlock (2 jewellers): the diamond recipes below
 - Unlock (5 jewellers): the netherite recipes below

Unlocks (2 Jewellers):
 - `diamond_block`
 - `diamond_helmet`, `diamond_chestplate`, `diamond_leggings`, `diamond_boots`
 - `diamond_axe`, `diamond_pickaxe`, `diamond_shovel`
 - `diamond_hoe` (also Farm)
 - `diamond_sword` (also Weapon smith)
 - `diamond_spear` (also Weapon smith)
 - `enchanting_table` (also Library)
 - `jukebox` (also Bard)
 - `lodestone` (also Cartographer's Guild)
 - `recovery_compass` (also Cartographer's Guild)

Unlocks (5 Jewellers):
 - `netherite_ingot` (smithing upgrade)
 - `netherite_block`
 - `netherite_helmet`, `netherite_chestplate`, `netherite_leggings`, `netherite_boots`
 - `netherite_axe`, `netherite_pickaxe`, `netherite_shovel`
 - `netherite_hoe` (also Farm)
 - `netherite_sword` (also Weapon smith)
 - `netherite_spear_smithing` (also Weapon smith)
 - `netherite_upgrade_smithing_template` (also Nether Outpost)

### Coppersmith
Used to work copper into blocks, bulbs and lenses.
 - Craft: Raw copper
 - Requires: Blacksmith
 - Unlock (Coppersmith): the copper recipes below

Unlocks (Coppersmith, 1 villager):
 - `copper_block`, `cut_copper`, `cut_copper_stairs`, `cut_copper_slab`
 - `chiseled_copper`, `copper_grate`, `copper_bulb`
 - `copper_door`, `copper_trapdoor`
 - `lightning_rod`, `spyglass` (also Cartographer's Guild)
 - `copper_spear` (also Weapon smith)
 - all waxed copper recipes (also Apiary)

### Kiln
Bakes clay and dyes into bricks, pots and concrete.
 - Craft: Clay ball
 - Unlock (Potter): the clay recipes below

Unlocks (Potter, 1 villager):
 - `bricks`, `brick_stairs`, `brick_slab`, `brick_wall`
 - `terracotta`, all 16 `*_glazed_terracotta`
 - `flower_pot`, `decorated_pot`
 - `concrete_powder` and all 16 `concrete` recipes

### Mason's Yard
Cuts the deep rock: deepslate, tuff, calcite and mud.
 - Craft: Deepslate
 - Unlock (Mason): the deep rock recipes below

Unlocks (Mason, 1 villager):
 - `cobbled_deepslate`, `cobbled_deepslate_stairs`, `cobbled_deepslate_slab`,
   `cobbled_deepslate_wall`
 - `polished_deepslate`, `polished_deepslate_stairs`, `polished_deepslate_slab`,
   `polished_deepslate_wall`
 - `deepslate_bricks`, `deepslate_brick_stairs`, `deepslate_brick_slab`,
   `deepslate_brick_wall`
 - `deepslate_tiles`, `deepslate_tile_stairs`, `deepslate_tile_slab`,
   `deepslate_tile_wall`, `chiseled_deepslate`
 - `cracked_deepslate_bricks`, `cracked_deepslate_tiles`
 - `tuff`, `polished_tuff`, `tuff_bricks`, `chiseled_tuff`,
   `tuff_stairs`, `tuff_slab`, `tuff_wall`
 - `calcite`, `dripstone_block`, `pointed_dripstone`
 - `packed_mud`, `mud_bricks`, `mud_brick_stairs`, `mud_brick_slab`,
   `mud_brick_wall`

---

## Agriculture

### Farm
Used to unlock simple farming recipes
 - Craft: Dirt
 - Unlock (farmer): bucket, hoes, windmill

Unlocks (Farmer, 1 villager):
 - `bucket` (also Blacksmith)
 - hoes: `wooden_hoe`, `stone_hoe` (also Stone cutter),
   `iron_hoe` (also Blacksmith), `golden_hoe` (also Gold smith),
   `diamond_hoe` (also Jeweller), `netherite_hoe` (also Jeweller)
 - windmill building plan: `aom:plan/windmill`

### Windmill
Farms and stores every crop. No recipe unlocks.
 - Craft: Wheat
 - Requires: Farm
 - Storage (wheat farmer): wheat — 1 / minute
 - Storage (carrot farmer): carrot — 1 / minute
 - Storage (potato farmer): potato — 1 / minute
 - Storage (beetroot farmer): beetroot — 1 / minute
 - Storage (melon farmer): melon slice — 1 / minute
 - Storage (pumpkin farmer): pumpkin — 1 / minute
 - Storage (sugar cane farmer): sugar cane — 1 / minute

---

## Husbandry

### Barn
Feeds the town's animals
 - Craft: Hay Block
 - Unlock (Herder): the animal-keeping recipes below

Unlocks (Herder, 1 villager):
 - `lead` (also Shepherd, Spinnery)
 - `saddle` (also Blacksmith, Leather tanner)

### Leather tanner
Used to craft leather items
 - Craft: Leather
 - Unlock (Tanner): the leather recipes below

Unlocks (Tanner, 1 villager):
 - `leather_helmet`, `leather_chestplate`, `leather_leggings`, `leather_boots`
 - `leather_horse_armor`
 - `item_frame` (also Cartographer's Guild),
   `glow_item_frame` (also Cartographer's Guild)
 - `book` (also Library)
 - `bundle` (also Spinnery)
 - `saddle` (also Blacksmith, Barn)

### Shepherd
Used to keep track of sheep
 - Craft: Mutton
 - Unlock (Shepherd): the animal-handling recipes below

Unlocks (Shepherd, 1 villager):
 - `shears` (also Blacksmith)
 - `lead` (also Spinnery, Barn)
 - Storage (shearer): white wool — 1 / 2 minutes

### Spinnery
Used to spin wool and string into other materials
 - Craft: String
 - Unlock (Spinner): string -> wool recipe, wool coloring, carpets

Unlocks (Spinner, 1 villager):
 - `white_wool` (from 4 string), `string` (from 1 wool)
 - all 16 `*_wool` dyeing recipes
 - `white_carpet` and all 16 `*_carpet` recipes
 - `lead` (also Shepherd, Barn)
 - `bundle` (also Leather tanner)

### Weaver
Weaves banners and patterns.
 - Craft: Wool
 - Unlock (Weaver): the banner recipes below

Unlocks (Weaver, 1 villager):
 - `loom`
 - all `*_banner` recipes and `*_banner_duplicate`
 - banner pattern duplication recipes: `bordure_indented_banner_pattern`,
   `creeper_banner_pattern`, `field_masoned_banner_pattern`,
   `flower_banner_pattern`, `mojang_banner_pattern`, `skull_banner_pattern`
   (the pattern items themselves are found, not crafted, so they cannot be gated)

### Apiary
Keeps bees and harvests honey and wax.
 - Craft: Honeycomb
 - Unlock (Beekeeper): the bee recipes below

Unlocks (Beekeeper, 1 villager):
 - `beehive`, `honeycomb_block`, `honey_block`
 - `candle` and all 16 `*_candle` recipes
 - all waxed copper recipes (also Coppersmith)
 - Storage (beekeeper): honeycomb — 1 / 5 minutes

---

## Food

### Baker
Used for food crafting
 - Craft: Furnace
 - Unlock (baker): the baked recipes below

Unlocks (Baker, 1 villager):
 - `baked_potato`
 - `golden_carrot` (also Gold smith)
 - `cake`, `cookie`

### Butcher
Used to kill animals and butcher them for meat
 - Craft: Wooden sword
 - Unlock (Butcher): Smoker

Unlocks (Butcher, 1 villager):
 - `smoker`
 - Storage (butcher): raw beef / porkchop / chicken / mutton / rabbit,
   weighted — 1 / 2 minutes

### Brewery
Used to brew potions
 - Craft: Nether wart
 - Unlock (Brewer): the brewing recipes below

Unlocks (Brewer, 1 villager):
 - `glass_bottle`, `brewing_stand`
 - `blaze_powder`, `fermented_spider_eye`, `magma_cream`
 - `glistering_melon_slice` (also Gold smith)
 - `cauldron` (also Blacksmith)

### Fisher
Fishes for the city
 - Craft: Any fish
 - Unlock (Fisher): the fishing recipes below
 - Storage (fisher): one weighted catch per collector every 2 minutes

Unlocks (Fisher, 1 villager):
 - `fishing_rod`
 - `carrot_on_a_stick`, `warped_fungus_on_a_stick`

| Catch | Chance | Per day (1 fisher) |
| --- | --- | --- |
| cod | 55% | 5.5 |
| salmon | 32% | 3.2 |
| pufferfish | 8% | 0.8 |
| tropical fish | 4% | 0.4 |
| nothing | 1% | 0.1 |

> Each collector rolls once every 2 minutes and stores the catch; if there is no storage space for it, it is lost. A fisher rolls 10 times per Minecraft day, so "per day" is `chance × 10`. Every catch must be discovered (pick up 1 of that fish) before it can be stored.

---

## Crafting

### Weapon smith
Used to craft swords
 - Craft: Wooden axe
 - Unlock (weapon smith): All sword/spear recipes

Unlocks (Weapon smith, 1 villager):
 - `wooden_sword` (also Lumbermill), `wooden_spear` (also Lumbermill)
 - `stone_sword` (also Stone cutter), `stone_spear` (also Stone cutter)
 - `iron_sword` (also Blacksmith), `iron_spear` (also Blacksmith)
 - `golden_sword` (also Gold smith), `golden_spear` (also Gold smith)
 - `copper_spear` (also Coppersmith)
 - `diamond_sword` (also Jeweller), `diamond_spear` (also Jeweller)
 - `netherite_sword` (also Jeweller), `netherite_spear_smithing` (also Jeweller)

### Fletcher
Used to craft ranged weapons
 - Craft: Feather
 - Unlock (fletcher): the ranged recipes below

Unlocks (Fletcher, 1 villager):
 - `bow`, `crossbow`
 - `arrow`, `spectral_arrow`, `tipped_arrow`
 - `fletching_table`
 - `target` (also Redstone Workshop)

### Glass blower
Used for glass crafting
 - Craft: Sand
 - Unlock (Glass blower): smelting glass, glass panes

Unlocks (Glass blower, 1 villager):
 - `glass` (smelting sand)
 - `glass_pane`
 - all 16 `*_stained_glass` recipes
 - all 16 `*_stained_glass_pane` recipes
 - `daylight_detector` (also Redstone Workshop)
 - `beacon`
 - `end_crystal` (also End Observatory)

### Painter
Used for painting paintings
 - Craft: Ink Sac
 - Unlock (Painter): paintings

Unlocks (Painter, 1 villager):
 - `painting`

### Redstone Workshop
The tinkerer's shop. Powers the town's machines.
 - Craft: Redstone dust
 - Unlock (Tinkerer): the redstone recipes below

Unlocks (Tinkerer, 1 villager):
 - `piston`, `sticky_piston`, `observer`
 - `repeater`, `comparator`, `redstone_torch`
 - `dispenser`, `dropper`, `hopper` (also Blacksmith)
 - `redstone_lamp`, `note_block` (also Bard), `target` (also Fletcher)
 - `lever`, all `*_button` recipes, all `*_pressure_plate` recipes
 - `tripwire_hook`, `daylight_detector` (also Glass blower)
 - `tnt`

### Bard
The town's music hall. Plays records and rings for the town.
 - Craft: Goat horn
 - Unlock (Bard): the music recipes below

Unlocks (Bard, 1 villager):
 - `jukebox` (also Jeweller)
 - `note_block` (also Redstone Workshop)
 - `bell` (also Gold smith)

### Armory
Fits the town's guards with armor and smithing gear.
 - Craft: Iron ingot
 - Unlock (Armorer): the armor recipes below

Unlocks (Armorer, 1 villager):
 - `smithing_table`
 - `grindstone`
 - `armor_stand`
 - `anvil` (also Blacksmith)
 - all armor-trim smithing recipes (`*_armor_trim_smithing_template_smithing_trim`)
 - `iron_helmet` (also Blacksmith), `iron_chestplate` (also Blacksmith),
   `iron_leggings` (also Blacksmith), `iron_boots` (also Blacksmith)

---

## Knowledge

### Library
Stores books
 - Craft: Paper
 - Unlock (Librarian): the book recipes below
 - Unlock (Enchanter): the enchanting recipe below

Unlocks (Librarian, 1 villager):
 - `book` (also Leather tanner), `writable_book`
 - `bookshelf`, `chiseled_bookshelf`, `lectern`

Unlocks (Enchanter, 1 villager):
 - `enchanting_table` (also Jeweller)

### School
Teaches the town's basics
 - Craft: Bookshelf
 - Requires: Library
 - Unlock (Teacher): unlocks the University plan
 - Unlock (Firekeeper): the fire recipes below

Unlocks (Teacher, 1 villager):
 - `aom:plan/university`

Unlocks (Firekeeper, 1 villager):
 - `flint_and_steel` (also Blacksmith)
 - `fire_charge`

### University
Research different technologies
 - Craft: Obsidian
 - Requires: School
 - Unlock (Ender crafter): the end recipes below
 - Unlock (Portal): lets town members travel through Nether portals

Unlocks (Ender crafter, 1 villager):
 - `eye_of_ender`

Portal (1 villager, mechanic — not a recipe):
 - Portals can always be lit and entered, but while Portal is unstaffed a town
   member who enters the Nether is immediately returned to their last overworld
   position, with a message that the Nether is not researched yet.
 - The pack records each player's overworld coordinates once a second, so the
   return point is always valid. When the job is staffed, travel works normally.

### Cartographer's Guild
Maps the land, tracks treasure and places lodestones.
 - Craft: Compass
 - Unlock (Cartographer): the navigation recipes below

Unlocks (Cartographer, 1 villager):
 - `cartography_table`
 - `map`, `map_cloning`, `map_extending`
 - `recovery_compass` (also Jeweller)
 - `lodestone` (also Jeweller)
 - `spyglass` (also Coppersmith)
 - `item_frame` (also Leather tanner),
   `glow_item_frame` (also Leather tanner)

### End Observatory
Studies the End and stores its exotic materials.
 - Craft: End stone
 - Requires: University
 - Unlock (Astronomer): the end recipes below

Unlocks (Astronomer, 1 villager):
 - `purpur_block`, `purpur_pillar`, `purpur_stairs`, `purpur_slab`
 - `end_stone_bricks`, `end_stone_brick_stairs`, `end_stone_brick_slab`,
   `end_stone_brick_wall`
 - `end_rod`, `ender_chest`
 - `shulker_box` and all 16 coloured shulker boxes
 - `end_crystal` (also Glass blower)
 - `beacon` (also Glass blower)

---

## Special

### Custom
Used for custom things that are not in this modpack yet
 - Craft: Sign
 - Add villagers
 - Hire villagers (no benefit)
 - Fire workers (no benefit)
 - Unlocks: none.

---

## Future features

Ideas that are fun but out of scope for the first pass:
 - **Animal fence** — Craft: Oak Fence. A staffed Rancher auto-breeds animals in
   the pen and stops them despawning, drawing feed (wheat) from a Barn. The pen
   would also report its animal count on its sign.
 - **Barn upgrades** — feed storage and breeding tiers once Animal fences land.

---

## Appendix — recipes unlocked by multiple buildings

These recipes are only granted while **every** listed building has its unlock
job staffed.

| Recipe | Buildings |
| --- | --- |
| `furnace` | Stone cutter, Blacksmith |
| `bucket` | Blacksmith, Farm |
| `flint_and_steel` | Blacksmith, School |
| `shears` | Blacksmith, Shepherd |
| `cauldron` | Blacksmith, Brewery |
| `saddle` | Blacksmith, Leather tanner, Barn |
| `anvil` | Blacksmith, Armory |
| `iron_helmet` | Blacksmith, Armory |
| `iron_chestplate` | Blacksmith, Armory |
| `iron_leggings` | Blacksmith, Armory |
| `iron_boots` | Blacksmith, Armory |
| `hopper` | Blacksmith, Redstone Workshop |
| `bell` | Gold smith, Bard |
| `golden_carrot` | Gold smith, Baker |
| `glistering_melon_slice` | Gold smith, Brewery |
| `jukebox` | Jeweller, Bard |
| `lodestone` | Jeweller, Cartographer's Guild |
| `recovery_compass` | Jeweller, Cartographer's Guild |
| `enchanting_table` | Jeweller, Library |
| `beacon` | Glass blower, End Observatory |
| `end_crystal` | Glass blower, End Observatory |
| `spyglass` | Coppersmith, Cartographer's Guild |
| `waxed copper` | Coppersmith, Apiary |
| `book` | Leather tanner, Library |
| `item_frame` | Leather tanner, Cartographer's Guild |
| `glow_item_frame` | Leather tanner, Cartographer's Guild |
| `bundle` | Leather tanner, Spinnery |
| `lead` | Shepherd, Spinnery, Barn |
| `note_block` | Redstone Workshop, Bard |
| `target` | Redstone Workshop, Fletcher |
| `daylight_detector` | Redstone Workshop, Glass blower |
| `eye_of_ender` | Nether Outpost, End Observatory |
| `netherite_upgrade_smithing_template` | Jeweller, Nether Outpost |
| `stone_hoe` | Stone cutter, Farm |
| `stone_sword` | Stone cutter, Weapon smith |
| `iron_hoe` | Blacksmith, Farm |
| `iron_sword` | Blacksmith, Weapon smith |
| `golden_hoe` | Gold smith, Farm |
| `golden_sword` | Gold smith, Weapon smith |
| `diamond_hoe` | Jeweller, Farm |
| `diamond_sword` | Jeweller, Weapon smith |
| `netherite_hoe` | Jeweller, Farm |
| `netherite_sword` | Jeweller, Weapon smith |
| `wooden_spear` | Lumbermill, Weapon smith |
| `stone_spear` | Stone cutter, Weapon smith |
| `iron_spear` | Blacksmith, Weapon smith |
| `golden_spear` | Gold smith, Weapon smith |
| `copper_spear` | Coppersmith, Weapon smith |
| `diamond_spear` | Jeweller, Weapon smith |
| `netherite_spear_smithing` | Jeweller, Weapon smith |

---

## Appendix — storage & generation

Each row is one storage resource. **Rate** is per collector, per worker.
Multi-resource rows (marked *weighted*) roll a table for which resource is
produced. Banker capacity defaults to 576 (8 stacks) per worker unless noted.
Every resource must be discovered (pick up 1 of it yourself) before its storage
can be hired.

| Building | Resource | Collector | Rate |
| --- | --- | --- | --- |
| Lumbermill | oak logs | oak chopper | 1 / minute |
| Lumbermill | spruce logs | spruce chopper | 1 / minute |
| Lumbermill | birch logs | birch chopper | 1 / minute |
| Lumbermill | jungle logs | jungle chopper | 1 / minute |
| Lumbermill | acacia logs | acacia chopper | 1 / minute |
| Lumbermill | dark oak logs | dark oak chopper | 1 / minute |
| Lumbermill | mangrove logs | mangrove chopper | 1 / minute |
| Lumbermill | cherry logs | cherry chopper | 1 / minute |
| Lumbermill | pale oak logs | pale oak chopper | 1 / minute |
| Mine | ores (weighted roll) | miner | 1 / minute |
| Quarry | gravel, sand, dirt, cobblestone, granite, andesite, diorite | digger | 1 / minute |
| Ice House | snow | ice harvester | 1 / minute |
| Ice House | ice | ice harvester | 1 / minute |
| Nether Outpost | netherrack | nether miner | 1 / minute |
| Nether Outpost | nether quartz | nether miner | 1 / 2 minutes |
| Nether Outpost | glowstone dust | glow harvester | 1 / 5 minutes |
| Nether Outpost | ancient debris | debris miner | 1 / 20 minutes |
| Windmill | wheat | wheat farmer | 1 / minute |
| Windmill | carrot | carrot farmer | 1 / minute |
| Windmill | potato | potato farmer | 1 / minute |
| Windmill | beetroot | beetroot farmer | 1 / minute |
| Windmill | melon slice | melon farmer | 1 / minute |
| Windmill | pumpkin | pumpkin farmer | 1 / minute |
| Windmill | sugar cane | sugar cane farmer | 1 / minute |
| Shepherd | white wool | shearer | 1 / 2 minutes |
| Apiary | honeycomb | beekeeper | 1 / 5 minutes |
| Butcher | raw meats (weighted) | butcher | 1 / 2 minutes |
| Fisher | fish (weighted roll) | fisher | 1 / 2 minutes |

Only these buildings generate: they all extract or harvest something that grows
or drops in the world. Every other building (Docks, Stone cutter, Coppersmith,
Kiln, Mason's Yard, Spinnery, Leather tanner, Brewery, Glass blower, Redstone
Workshop, Library, End Observatory, Barn) never stores or generates.
