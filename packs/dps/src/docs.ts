import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Data Pack Skills",
  summary:
    "An MCMMO-style skill and leveling system built entirely from vanilla stats and advancements.",
  about: [
    "Data Pack Skills tracks twelve skills from vanilla statistics: kills, blocks mined, fish caught, distances and more. Each skill has its own XP pool, level and percentage readout.",
    "Skills level up automatically as you play. Leveling is announced in chat and on the action bar, with a bigger celebration every 10 levels and a firework twinkle every 100.",
    "Every skill also has a powerup that scales with its level, from temporary potion effects to tree felling and crop harvesting. See the skill tables below.",
  ],
  features: [
    {
      title: "Twelve skills",
      detail:
        "Combat, digging, mining, woodcutting, farming, enchanting, fishing, archery, taming, alchemy, acrobatics and trading each level independently from their own actions.",
    },
    {
      title: "Vanilla-stat XP",
      detail:
        "Actions are read from scoreboard statistics, so no custom items or commands are needed. Higher-risk actions (deepslate ores, elder guardians) grant more XP.",
    },
    {
      title: "Scaling powerups",
      detail:
        "Combat, digging and mining activate a potion effect with a 300s cooldown; the rest range from Tree Cutter charges to Arcane Repair and Angler's Luck.",
    },
    {
      title: "Level curve",
      detail:
        "Requirement to next level is 2L+7 up to level 15, 5L-38 for levels 16-30 and 9L-158 from level 31, where L is the current level.",
    },
    {
      title: "Readouts",
      detail:
        "The action bar shows the held skill's level and progress while its tool is equipped. /trigger dps prints every skill and your total level.",
    },
    {
      title: "No item bloat",
      detail:
        "Powerups hook into vanilla items (anvils, hoes, axes, potions); the pack adds no custom items or recipes of its own.",
    },
  ],
  commands: [
    {
      command: "trigger dps",
      description: "Prints every skill's level, progress and your total level.",
    },
    {
      command: "trigger dps.info",
      description: "The same skill summary, for use in command blocks or macros.",
    },
    {
      command: "trigger combat",
      description:
        "Per-skill triggers: trigger digging, mining, woodcutting, farming, enchanting, fishing, archery, taming, alchemy, acrobatics and trading all work the same way.",
    },
    {
      command: "function dps:uninstall",
      description:
        "Removes every objective, storage key and item modifier the pack created.",
    },
  ],
  notes: [
    "Effects last 1s + level/10 seconds and are level 1 + level/100; the cooldown is fixed at 300s.",
    "Arcane Repair costs 3 XP levels and restores 5% + level/50 of max durability (capped at 25%, 10s cooldown).",
    "Tree Cutter charges cap at 1 + level/100 and recharge faster at higher levels.",
    "Charged Fall Guard spends one charge per whole heart of fall damage; charges cap at 1 + level/100 and recharge every 300s at level 0, down to instant at level 600.",
    "Harvest Moon grows to radius 2 at level 200 and radius 3 at level 400.",
    "Items made unbreakable by the Unbreakable datapack are never damaged by DPS powerups.",
  ],
};
