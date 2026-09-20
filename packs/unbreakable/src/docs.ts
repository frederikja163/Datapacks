import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Unbreakable",
  summary:
    "Adds the Unbreakable treasure enchantment: enchanted gear never wears out.",
  about: [
    "Unbreakable is a custom enchantment that sets every point of incoming durability damage to zero. An enchanted tool, weapon or piece of armor simply never breaks.",
    "It is a treasure enchantment, marked the same way as mending: obtainable from chests and fishing (the #minecraft:on_random_loot tag) but never offered by an enchanting table or a librarian.",
    "Because it replaces the enchantments that already govern durability, it is mutually exclusive with Unbreaking, Mending, Curse of Binding and Infinity.",
  ],
  features: [
    {
      title: "Never breaks",
      detail:
        "A level-1 enchantment that cancels durability damage outright, on any item in the durability enchantable tag.",
    },
    {
      title: "Treasure only",
      detail:
        "Added to the random-loot and treasure tags, so it appears in dungeon chests, fishing and other chest loot but not in trades or the enchanting table.",
    },
    {
      title: "Sensible conflicts",
      detail:
        "Exclusive with Unbreaking, Mending, Curse of Binding and Infinity, which would be redundant or a trap alongside it.",
    },
    {
      title: "Pure content",
      detail:
        "No scoreboards or tick loops: the enchantment, the loot tags and an uninstall function are all the pack ships.",
    },
  ],
  commands: [
    {
      command: "function unbreakable:uninstall",
      description:
        "Removes the leftover objectives from older versions of the pack. The enchantment itself disappears with the pack.",
    },
  ],
  notes: [
    "Enchanting an item in creative: /enchant @s unbreakable:unbreakable 1.",
    "It applies to everything under #minecraft:enchantable/durability, including elytra and shields.",
    "An Unbreakable item can still be destroyed by lava, fire or the void, and can still be lost on death.",
  ],
};
