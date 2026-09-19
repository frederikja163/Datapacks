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
      "1. Craft a Townhall Plan (a plank + sapling) and place it on a sign.",
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
      "/trigger aom.guide - this guide.",
      "/trigger aom.town_info - your town's page.",
      "Founding a town needs no command: place a Townhall Plan.",
    ],
  },
  {
    heading: "Plans and house types",
    lines: [
      "A plan is crafted from one plank plus the building's own item,",
      "so the plank's wood decides the sign you get (oak planks -> oak sign).",
      "Townhouse plans are two planks of the same wood.",
      "Place the sign where you want the building, then right-click it.",
      "Every plan is listed in the build menu with its ingredients in mind.",
    ],
  },
  {
    heading: "Towns",
    lines: [
      "Found with a Townhall Plan: place it, write the town name on the first",
      "line (letters, numbers and underscores only, unique), then right-click.",
      "You can only belong to one town at a time.",
      "Population = every townhouse's villagers; members are not workers.",
      "Employed = every staffed job. Hiring needs Population above Employed.",
      "Only the last member can delete a town.",
    ],
  },
  {
    heading: "Jobs",
    lines: [
      "Jobs are permanent: a hired worker can never be fired.",
      "Unlock jobs stop at the number they need (1, or 2/5 for jewellers).",
      "Generation and storage jobs are unlimited.",
      "The town pays one villager per worker hired.",
      "Open a building's menu to see its jobs, workers and storage.",
    ],
  },
  {
    heading: "Unlocks and requirements",
    lines: [
      "This pack turns on limited crafting: you can only craft recipes you know.",
      "An unlock job grants its recipes to every member of the town.",
      "Some plans need another building's job staffed first",
      "(Blacksmith -> Coppersmith -> Gold smith -> Jeweller).",
      "Recipes are re-synced whenever a job changes or you join a town.",
      "Leave a town and its recipes are taken back.",
    ],
  },
  {
    heading: "Discovery",
    lines: [
      "A storage resource is locked until your town has obtained one of it.",
      "Pick the item up yourself once; the whole town discovers it.",
      "Until then you cannot hire its collectors or bankers, nor deposit.",
      "Grouped storages (the mine's ores, the fisher's fish) unlock one at a time.",
    ],
  },
  {
    heading: "Storage and generation",
    lines: [
      "Capacity starts at 0: hire storage workers (bankers) to hold anything.",
      "Deposit and Withdraw move 1, 16, 64 or all of the resource.",
      "Each collector produces at its own rate, from 1/minute up to 1/20 min.",
      "The mine rolls a weighted ore table; the quarry has one digger per stone.",
      "Generation happens only while the chunk is loaded; there is no catch-up.",
      "Bankers give +576 (8 stacks) per worker unless the building says otherwise.",
    ],
  },
  {
    heading: "Special mechanics",
    lines: [
      "Mine - Levellers lift the mining fatigue limit below y=62 by 10 levels",
      "each, down to the world floor at y=-64.",
      "University - Portal lets town members enter the Nether.",
      "Without a staffed Portal, a member entering the Nether is sent back.",
      "The pack remembers your last overworld position every second.",
    ],
  },
  {
    heading: "Troubleshooting",
    lines: [
      "Nothing happens - stand close and aim straight at a sign.",
      "No unemployed villagers - build townhouses; members are not workers.",
      "Cannot hire - the resource must be discovered first.",
      "Nothing generates - hire collectors and bankers, and load the chunk.",
      "Recipe missing - your town's unlock job must still be staffed.",
      "Blocked below y=62 - staff a Mine Leveller.",
      "Sent back from the Nether - staff the University Portal.",
    ],
  },
];
