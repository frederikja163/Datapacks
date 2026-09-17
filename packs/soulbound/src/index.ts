import {
  Datapack,
  defineUninstall,
  latestVersion,
  nbt,
  score,
  snbt,
  text,
  tellraw,
} from "../../../mcgen/src/index.ts";

const ENCHANTMENT = "soulbound:soulbound";

// Player inventory slots: the `item`/`if items` slot name and the matching
// NBT `Slot` number inside the player's `Inventory` list.
const SLOTS: ReadonlyArray<{ item: string; slot: number }> = [
  ...Array.from({ length: 36 }, (_, i) => ({
    item: `container.${i}`,
    slot: i,
  })),
  { item: "armor.feet", slot: 100 },
  { item: "armor.legs", slot: 101 },
  { item: "armor.chest", slot: 102 },
  { item: "armor.head", slot: 103 },
  { item: "weapon.offhand", slot: -106 },
];

// References the enchantment through our own tag so every predicate still
// parses before the enchantment registry has loaded it (a /reload must not
// fail; custom enchantments only register at world start).
const HAS_SOULBOUND =
  '*[minecraft:enchantments~[{"enchantments":"#soulbound:soulbound"}]]';

export function build(): Datapack {
  const d = new Datapack(
    "soulbound",
    latestVersion(),
    "Adds the Soulbound enchantment: keep enchanted items through death.",
  );

  d.enchantment("soulbound", {
    description: {
      translate: "enchantment.soulbound.soulbound",
      fallback: "Soulbound",
    },
    // Directly conflicts with Curse of Vanishing.
    exclusive_set: ["minecraft:vanishing_curse"],
    supported_items: "#minecraft:enchantable/durability",
    weight: 1,
    max_level: 1,
    min_cost: { base: 25, per_level_above_first: 0 },
    max_cost: { base: 50, per_level_above_first: 0 },
    anvil_cost: 8,
    slots: ["any"],
  });

  d.tag("enchantment", "soulbound", [
    { id: ENCHANTMENT, required: false },
  ]);

  const load = d.defineFunction("load", [
    "scoreboard objectives add sb.deaths deathCount",
    "scoreboard objectives add sb.pending dummy",
    "scoreboard objectives add sb.id dummy",
    "scoreboard objectives add sb.seen dummy",
    "scoreboard objectives add sb.setup dummy",
    "scoreboard objectives add sb.tmp dummy",
    "scoreboard objectives add sb.dragon minecraft.killed:minecraft.ender_dragon",
  ]);

  const initPlayer = d.defineFunction("init_player", [
    "scoreboard players add #next sb.id 1",
    "scoreboard players operation @s sb.id = #next sb.id",
    "scoreboard players operation @s sb.seen = @s sb.deaths",
    "scoreboard players set @s sb.pending 0",
    "scoreboard players set @s sb.setup 1",
  ]);

  // ---------------------------------------------------------------------------
  // Snapshot: every tick, record the player's soulbound items (and last
  // position/dimension) into storage, keyed by the player's id. While
  // `sb.pending` is set the snapshot is left untouched, so the copy taken on
  // the tick before death is the one restored.
  // ---------------------------------------------------------------------------
  const snapshotPrepare = d.defineFunction("snapshot/prepare", [
    "execute store result storage soulbound:tmp id int 1 run scoreboard players get @s sb.id",
    "function soulbound:snapshot with storage soulbound:tmp",
  ]);

  const snapshot = d.defineFunction("snapshot", [
    "execute unless data storage soulbound:data players run data modify storage soulbound:data players set value []",
    "$execute unless data storage soulbound:data players[{ID:$(id)}] run data modify storage soulbound:data players append {ID:$(id)}",
    '$data modify storage soulbound:data players[{ID:$(id)}].items set value []',
    ...SLOTS.map(
      ({ item, slot }) =>
        `$execute if items entity @s ${item} ${HAS_SOULBOUND} run data modify storage soulbound:data players[{ID:$(id)}].items append from entity @s Inventory[{Slot:${slot}b}]`,
    ),
    '$execute store result storage soulbound:data players[{ID:$(id)}].x double 1 run data get entity @s Pos[0]',
    '$execute store result storage soulbound:data players[{ID:$(id)}].y double 1 run data get entity @s Pos[1]',
    '$execute store result storage soulbound:data players[{ID:$(id)}].z double 1 run data get entity @s Pos[2]',
    '$data modify storage soulbound:data players[{ID:$(id)}].dim set from entity @s Dimension',
  ]);

  // ---------------------------------------------------------------------------
  // Death: mark pending and remove the just-dropped soulbound items so the
  // restore cannot be duplicated. (The restore itself comes from the snapshot,
  // so items lost to lava/void are still recovered.)
  // ---------------------------------------------------------------------------
  const deathMark = d.defineFunction("death/mark", [
    "scoreboard players operation @s sb.seen = @s sb.deaths",
    "execute if entity @s[gamemode=creative] run return 0",
    // With keepInventory the player keeps everything, so there is nothing to
    // restore (and restoring would duplicate the items).
    "execute store result score #keepinv sb.tmp run gamerule keepInventory",
    "execute if score #keepinv sb.tmp matches 1 run return 0",
    "scoreboard players set @s sb.pending 1",
    "execute store result storage soulbound:tmp id int 1 run scoreboard players get @s sb.id",
    "function soulbound:death/step with storage soulbound:tmp",
  ]);

  const deathStep = d.defineFunction("death/step", [
    "$execute unless data storage soulbound:data players[{ID:$(id)}].x run return 0",
    "$function soulbound:death/kill with storage soulbound:data players[{ID:$(id)}]",
  ]);

  const deathKill = d.defineFunction("death/kill", [
    `$execute in $(dim) positioned $(x) $(y) $(z) run kill @e[type=minecraft:item,distance=..12,nbt={Item:{components:{"minecraft:enchantments":{"soulbound:soulbound":1}}}}]`,
  ]);

  // ---------------------------------------------------------------------------
  // Respawn: give the snapshotted items back the moment the player is alive.
  // Items are summoned at the player, so slots are not preserved (armor comes
  // back to the inventory).
  // ---------------------------------------------------------------------------
  const restoreSetup = d.defineFunction("restore/setup", [
    "scoreboard players set @s sb.pending 0",
    "execute store result storage soulbound:tmp id int 1 run scoreboard players get @s sb.id",
    "function soulbound:restore/step with storage soulbound:tmp",
  ]);

  const restoreStep = d.defineFunction("restore/step", [
    "$data remove storage soulbound:tmp item",
    "$execute if data storage soulbound:data players[{ID:$(id)}].items[0] run data modify storage soulbound:tmp item set from storage soulbound:data players[{ID:$(id)}].items[0]",
    "$execute if data storage soulbound:data players[{ID:$(id)}].items[0] run data remove storage soulbound:data players[{ID:$(id)}].items[0]",
    "data remove storage soulbound:tmp.item.Slot",
    "execute if data storage soulbound:tmp.item run function soulbound:restore/summon with storage soulbound:tmp",
    "$execute if data storage soulbound:data players[{ID:$(id)}].items[0] run function soulbound:restore/step with storage soulbound:tmp",
  ]);

  const restoreSummon = d.defineFunction("restore/summon", [
    "$summon minecraft:item ~ ~ ~ {Item:$(item),PickupDelay:0s}",
  ]);

  // ---------------------------------------------------------------------------
  // Self-test: `/function soulbound:debug`. Hold an enchanted item and watch
  // chat after `/function soulbound:snapshot/prepare` runs once.
  // ---------------------------------------------------------------------------
  const debug = d.defineFunction("debug", [
    `tellraw @s ${snbt([text("=== soulbound debug ===", { color: "gold" })])}`,
    `tellraw @s ${snbt([
      text("id: ", { color: "gray" }),
      score("@s", "sb.id", { color: "aqua" }),
      text("  deaths: ", { color: "gray" }),
      score("@s", "sb.deaths", { color: "aqua" }),
      text("  seen: ", { color: "gray" }),
      score("@s", "sb.seen", { color: "aqua" }),
      text("  pending: ", { color: "gray" }),
      score("@s", "sb.pending", { color: "aqua" }),
    ])}`,
    "",
    ...SLOTS.map(({ item }) => [
      `execute store success score #hit sb.tmp run execute if items entity @s ${item} ${HAS_SOULBOUND}`,
      `$execute if score #hit sb.tmp matches 1 run tellraw @s ${snbt([
        text(`${item} matches soulbound`, { color: "green" }),
      ])}`,
    ]).flat(),
    `tellraw @s ${snbt([
      text("snapshot pos: ", { color: "gray" }),
      nbt("players[0].x", { storage: "soulbound:data" }, { color: "aqua" }),
      text(", ", { color: "gray" }),
      nbt("players[0].y", { storage: "soulbound:data" }, { color: "aqua" }),
      text(", ", { color: "gray" }),
      nbt("players[0].z", { storage: "soulbound:data" }, { color: "aqua" }),
    ])}`,
    `tellraw @s ${snbt([
      text("dim: ", { color: "gray" }),
      nbt("players[0].dim", { storage: "soulbound:data" }, { color: "aqua" }),
      text("  keepInv: ", { color: "gray" }),
      score("#keepinv", "sb.tmp", { color: "aqua" }),
    ])}`,
    `execute store result score #keepinv sb.tmp run gamerule keepInventory`,
    `execute store result score #n sb.tmp run data get storage soulbound:data players[0].items`,
    `tellraw @s ${snbt([
      text("snapshotted items: ", { color: "gray" }),
      score("#n", "sb.tmp", { color: "aqua" }),
    ])}`,
  ]);

  // ---------------------------------------------------------------------------
  // Obtaining it: one drop for whoever lands the killing blow on the dragon.
  // ---------------------------------------------------------------------------
  const dragonReward = d.defineFunction("dragon/reward", [
    'give @s minecraft:enchanted_book[stored_enchantments={"soulbound:soulbound":1}]',
    tellraw("@s", [
      text("[Soulbound] ", { color: "gray" }),
      text("The dragon's soul clings to a book.", { color: "light_purple" }),
    ]),
    "scoreboard players set @s sb.dragon 0",
  ]);

  const tick = d.defineFunction("tick", [
    `execute as @a[scores={sb.setup=0..0}] run function ${initPlayer.name}`,
    "",
    `execute as @a at @s if score @s sb.deaths > @s sb.seen run function ${deathMark.name}`,
    "",
    `execute as @a[scores={sb.pending=0..0}] at @s run function ${snapshotPrepare.name}`,
    `execute as @a[scores={sb.pending=1..1}] at @s unless entity @s[nbt={Health:0.0f}] run function ${restoreSetup.name}`,
    "",
    `execute as @a[scores={sb.dragon=1..}] run function ${dragonReward.name}`,
  ]);

  d.onLoad(load);
  d.onTick(tick);

  defineUninstall(d, {
    objectives: [
      "sb.deaths",
      "sb.pending",
      "sb.id",
      "sb.seen",
      "sb.setup",
      "sb.tmp",
      "sb.dragon",
    ],
    storage: ["soulbound:data players", "soulbound:tmp id", "soulbound:tmp item"],
  });

  return d;
}
