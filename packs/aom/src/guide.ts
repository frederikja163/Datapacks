// In-game player guide, rendered in chat by `/trigger aom.guide`.
//
// Keep pages short enough to read comfortably in chat; each line becomes its
// own line in the printed page.

export interface GuidePage {
  readonly heading: string;
  readonly lines: readonly string[];
}

export const GUIDE: readonly GuidePage[] = [
  {
    heading: "Getting started",
    lines: [
      "1. Craft a Townhall Plan (2 oak planks + dirt) and place it.",
      "2. Write your town's name on the sign's first line.",
      "3. Right-click the sign to found the town and join it.",
      "The townhall menu opens; build more with plans or /trigger aom.menu.",
      "4. Stand at a building and run /trigger aom.menu to staff jobs.",
      "Staffed jobs produce resources and unlock recipes for the whole town.",
    ],
  },
  {
    heading: "Commands",
    lines: [
      "/trigger aom.menu - build on a sign, or manage a building.",
      "Founding a town needs no command: place a Townhall Plan.",
      "/trigger aom.guide - this guide.",
      "/trigger aom.town_info - your town's page (same as the townhall menu).",
    ],
  },
  {
    heading: "Reading the world",
    lines: [
      "Every building is a waxed sign. Right-click a sign to open its menu,",
      "or look at one and run /trigger aom.menu.",
      "The townhall shows population and members; lumbermills show their workers.",
      "Remove a building with Delete building in its menu.",
    ],
  },
  {
    heading: "Towns",
    lines: [
      "Found with a Townhall Plan: place it, write the town name on the first",
      "line (letters, numbers and underscores only, unique), then right-click.",
      "Founding joins you automatically and opens the townhall menu.",
      "Left-click or break the sign to cancel a founding; the plan is returned.",
      "You can only belong to one town at a time.",
      "Population = every townhouse's villagers; members are not workers.",
      "Employed = every staffed job. Hiring needs Population above Employed.",
    ],
  },
  {
    heading: "More townhouses and deleting",
    lines: [
      "Build townhouses to raise the town's population.",
      "Each townhouse menu can Add villager or Remove villager for free.",
      "Only the last member can delete a town. It asks for confirmation and",
      "removes every sign and all of the town's data.",
      "Remove a building with Delete building in its menu.",
      "Deleting a building drops its plan and keeps its workers;",
      "place the plan to rebuild it elsewhere. Packed buildings stack",
      "per type, newest first. If a sign is broken it is packed the same way.",
    ],
  },
  {
    heading: "Buildings and jobs",
    lines: [
      "Build on a sign, or craft a plan (a block + a stick) and place it.",
      "Each spot holds one building, and its sign must remain.",
      "Jobs are permanent: a hired worker can never be fired.",
      "Unlock jobs stop at one worker. Generation and storage jobs are unlimited.",
      "Townhall: manages the town (join, leave, delete, info), no villagers.",
      "A town has one townhall. If it is destroyed, place a Townhall Plan to rebuild it.",
      "Townhouse: +1 villager for the town (adjustable).",
      "Townhouses provide villagers; lumbermills provide jobs and storage.",
      "Lumbermill - Tool crafter: unlocks the wooden tool recipes (1 worker).",
      "Lumbermill - Oak cutters: 1 oak log per minute each.",
      "Lumbermill - Oak bankers: +576 oak log storage each.",
    ],
  },
  {
    heading: "Storage",
    lines: [
      "Capacity starts at 0, so a building needs storage workers to hold anything.",
      "Deposit and Withdraw move 1, 16, 64 or all of the resource.",
      "Generation is capped by capacity; anything over the cap is lost.",
      "Every building keeps its own storage, and packing it keeps the contents.",
    ],
  },
  {
    heading: "Unlocks",
    lines: [
      "An unlock is active while its job is staffed, because those jobs hold one.",
      "Its recipes are granted to every member of the town.",
      "Recipes are re-synced on join, on leave and whenever a job changes.",
      "Tool crafter grants the wooden axe, hoe, pickaxe, shovel and sword.",
    ],
  },
  {
    heading: "Ticks and chunks",
    lines: [
      "Generation runs once per minute per worker.",
      "Only loaded chunks produce, and there is no catch-up for time away.",
      "Run /forceload add around a town to keep it producing.",
      "Signs refresh every second automatically.",
    ],
  },
  {
    heading: "Troubleshooting",
    lines: [
      "Nothing happens - stand close and aim straight at a sign.",
      "No unemployed villagers - build townhouses; members are not workers.",
      "Nothing generates - hire workers, hire storage workers, load the chunks.",
      "Cannot deposit - storage is full or you are not carrying the resource.",
      "Recipes missing - the unlock job must still be staffed.",
      "Building gone - its anchor block was broken or replaced.",
    ],
  },
];
