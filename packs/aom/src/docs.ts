import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Age of Minecraft",
  summary:
    "Turns a village into a town economy: place plans, staff jobs, unlock recipes and generate resources.",
  about: [
    "Age of Minecraft replaces villager trading with a town you build yourself. Craft a plan, place it on a sign and right-click to found the building; jobs and storage are managed through the building's menu.",
    "The pack turns on limited crafting: recipes are locked until a staffed unlock job grants them to every member of the town. Storage resources are discovered once, when any member first picks one up.",
    "Everything the pack emits is generated from the building registry in packs/aom/src/registry.ts and the advancement tree in packs/aom/src/tree.ts, so this page always matches the datapack.",
  ],
  features: [
    {
      title: "Plans and buildings",
      detail:
        "A plan is crafted from a wood plank plus the building's own item, so the plank's wood decides the sign. Place the sign, then right-click to build.",
    },
    {
      title: "Towns and members",
      detail:
        "A Townhall Plan founds a town; the town name is written on the sign's first line. Players can belong to one town at a time and join or leave from the townhall menu.",
    },
    {
      title: "Population and jobs",
      detail:
        "Townhouses add population. Hiring a worker moves one villager into the building; employed villagers can never outnumber the population.",
    },
    {
      title: "Limited crafting",
      detail:
        "Unlock jobs grant their recipes to the whole town while staffed. Recipes are re-synced on join and on every job change, and are taken back when a member leaves.",
    },
    {
      title: "Storage and generation",
      detail:
        "Capacity starts at zero. Collectors generate a resource at their own rate while the chunk is loaded; bankers add capacity (+576, 8 stacks, per worker unless noted).",
    },
    {
      title: "Discovery",
      detail:
        "A storage resource is locked until the town has obtained one of it. Pick the item up once and the whole town can hire its collectors and bankers and use deposit/withdraw.",
    },
    {
      title: "Special mechanics",
      detail:
        "Mine Levellers push the mining fatigue limit below y=62 down 10 levels each, to the world floor. The University Portal lets town members enter the Nether; without it they are sent back.",
    },
    {
      title: "Advancement tree",
      detail:
        "The Advancements screen mirrors the building tree: categories hang off the root and each building drops under the building whose job unlocks it.",
    },
  ],
  commands: [
    {
      command: "trigger aom.guide",
      description: "Prints the in-game guide, page by page.",
    },
    {
      command: "trigger aom.town_info",
      description: "Prints your town's page: members, population and employed workers.",
    },
    {
      command: "function aom:uninstall",
      description:
        "Removes every objective and storage key the pack created. Run before deleting the pack.",
    },
  ],
  notes: [
    "Generation only happens while the chunk is loaded; there is no catch-up for offline time.",
    "Jobs are permanent, except Custom's Hired help, which can be fired again.",
    "The town pays one villager per worker hired, and only a town's last member can delete it.",
    "Plans are the only way to build a new building; the sign is placed where you want the building.",
  ],
};
