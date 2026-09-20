import {
  Datapack,
  defineInstall,
  defineUninstall,
  latestVersion,
} from "../../../mcgen/src/index.ts";

const ENCHANTMENT = "unbreakable:unbreakable";

export function build(): Datapack {
  const d = new Datapack(
    "unbreakable",
    latestVersion(),
    "Adds the Unbreakable treasure enchantment.",
    "Unbreakable",
  );

  d.enchantment("unbreakable", {
    description: {
      translate: "enchantment.unbreakable.unbreakable",
      fallback: "Unbreakable",
    },
    // Mutually exclusive with the durability enchants it replaces, and with
    // binding_curse: an unbreakable + binding item could never be taken off
    // except by dying, which is a trap.
    exclusive_set: [
      "minecraft:unbreaking",
      "minecraft:mending",
      "minecraft:binding_curse",
      "minecraft:infinity",
    ],
    supported_items: "#minecraft:enchantable/durability",
    weight: 2,
    max_level: 1,
    min_cost: { base: 25, per_level_above_first: 25 },
    max_cost: { base: 75, per_level_above_first: 25 },
    anvil_cost: 4,
    slots: ["any"],
    // Every point of incoming durability damage becomes 0, so the item never
    // wears out and never breaks.
    effects: {
      "minecraft:item_damage": [
        { effect: { type: "minecraft:set", value: 0 } },
      ],
    },
  });

  // Obtainable from loot only (chests/fishing use #on_random_loot). It is not
  // in in_enchanting_table and not in tradeable, so tables and villagers never
  // offer it. Marked as a treasure enchantment for parity with mending.
  d.vanillaTag("enchantment", "on_random_loot", [
    { id: ENCHANTMENT, required: false },
  ]);
  d.vanillaTag("enchantment", "treasure", [
    { id: ENCHANTMENT, required: false },
  ]);

  defineInstall(d);

  // v2 is pure content; the only removable state is the objectives left behind
  // by the old item-component version.
  defineUninstall(d, {
    objectives: [
      "unbreakable",
      "unbreakable.toggle",
      "unbreakable_toggle",
      "unbreakable_setup",
      "unbreakable_initialized",
    ],
  });

  return d;
}
