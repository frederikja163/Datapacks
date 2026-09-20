import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Soulbound",
  summary:
    "A treasure enchantment that keeps enchanted items through death, wherever you die.",
  about: [
    "Soulbound adds an enchantment that snapshots every soulbound item in your inventory each tick. On death the items you drop are removed so they cannot be duplicated, and the snapshot is restored the moment you respawn.",
    "It works like a personal keepInventory for enchanted gear only: one item has to carry the enchantment for it to survive, and everything else drops as usual.",
    "The enchantment is treasure-only. It cannot be obtained from an enchanting table or a librarian, and is not tradeable, so the intended source is a rare drop from the Ender Dragon.",
  ],
  features: [
    {
      title: "Survives any death",
      detail:
        "Items are restored from a snapshot taken the tick before death, so lava, void and ordinary deaths all recover the same way.",
    },
    {
      title: "Per-item enchantment",
      detail:
        "Only items actually enchanted with Soulbound are kept; the rest of your inventory drops normally, so it pairs naturally with the rest of the game's risk.",
    },
    {
      title: "No duplication",
      detail:
        "The dropped soulbound items are removed before the restore runs, so a death cannot be milked for extra copies.",
    },
    {
      title: "Respects keepInventory",
      detail:
        "With the keepInventory gamerule on, or in creative mode, the restore is skipped because the player never lost the items.",
    },
    {
      title: "Dragon reward",
      detail:
        "The player who lands the killing blow on the Ender Dragon receives an enchanted book with Soulbound.",
    },
    {
      title: "Conflicts by design",
      detail:
        "Soulbound is mutually exclusive with Curse of Vanishing; an item cannot both vanish and come back.",
    },
  ],
  commands: [
    {
      command: "function soulbound:debug",
      description:
        "Prints your id, death counters, pending state, snapshot position and how many items are snapshotted.",
    },
    {
      command: "function soulbound:debug",
      description:
        "Also lists each inventory slot and whether it matches the Soulbound enchantment.",
    },
    {
      command: "function soulbound:uninstall",
      description:
        "Removes the objectives and storage the pack created, and stops restoring items.",
    },
  ],
  notes: [
    "Only the 36 inventory slots, armor and offhand are scanned; items in chests or shulker boxes are not covered.",
    "Restored items return to your inventory rather than their original armor slots.",
    "You can enchant items yourself in creative with /enchant, but survival obtains Soulbound only from the dragon.",
  ],
};
