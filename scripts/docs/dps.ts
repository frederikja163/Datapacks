// DPS-specific documentation sections, derived from the skill configuration
// and action tables in packs/dps/src.

import { ACTIONS, type Action } from "../../packs/dps/src/actions.ts";
import { SKILLS, type Powerup } from "../../packs/dps/src/index.ts";
import { code, details, esc, section, table } from "./render.ts";

const POWERUPS: Record<Powerup, { title: string; detail: string }> = {
  effect: {
    title: "Potion effect",
    detail:
      "Right-click while holding the skill's tool to gain its effect (Strength for combat, Haste for digging and mining) for 1s + level/10 seconds at level 1 + level/100, then wait out the fixed 300s cooldown.",
  },
  tree_cutter: {
    title: "Tree Cutter",
    detail:
      "Right-click a log while holding an axe to fell the whole tree, consuming one charge. You start with 1 + level/100 charges, and charges recharge faster as the skill grows.",
  },
  harvest: {
    title: "Harvest Moon",
    detail:
      "Use a hoe to harvest and replant every mature crop around you. The radius grows to 2 at level 200 and 3 at level 400.",
  },
  repair: {
    title: "Arcane Repair",
    detail:
      "Sneak + right-click an anvil to spend 3 XP levels and restore 5% + level/50 of the item's max durability (capped at 25%), with a 10s cooldown.",
  },
  effect_extend: {
    title: "Extended Potions",
    detail:
      "Drinking a positive potion extends its duration by level/400 x the base duration. Level II potions keep their strength.",
  },
  arrow_recovery: {
    title: "Arrow Recovery",
    detail:
      "An arrow that hits an entity has a min(75, level/7)% chance to be returned straight to your inventory.",
  },
  twins: {
    title: "Twins",
    detail:
      "Bred animals have a min(50, level/10)% chance to be born as a twin.",
  },
  fall_guard: {
    title: "Charged Fall Guard",
    detail:
      "You carry 1 + level/100 charges. A fall consumes one and reduces its damage by 2 hearts plus a bonus that grows with the skill, before the charge recharges.",
  },
  angler: {
    title: "Angler's Luck",
    detail:
      "Every max(1, 10 - level/50) catches grants a bonus roll on the vanilla fishing treasure table.",
  },
  none: {
    title: "No powerup",
    detail:
      "Trading has no active powerup; it levels from trades and counts toward your total level.",
  },
};

function actionLabel(action: Action): string {
  const [kind, target] = action.criteria.replace(/^minecraft\./, "").split(":");
  return `${kind} ${(target ?? "").replace(/^minecraft:/, "").replace(/_/g, " ")}`;
}

function requirement(level: number): number {
  if (level <= 15) return 2 * level + 7;
  if (level <= 30) return 5 * level - 38;
  return 9 * level - 158;
}

function skillsSection(): string {
  const rows = SKILLS.map((skill) => {
    const actions = ACTIONS[skill.name] as readonly Action[];
    const xp = actions.map((action) => action.xp);
    const low = Math.min(...xp);
    const high = Math.max(...xp);
    return [
      esc(skill.display),
      String(actions.length),
      low === high ? String(low) : `${low}-${high}`,
      esc(POWERUPS[skill.powerup].title),
    ];
  });
  return section(
    "skills",
    "Skills",
    table(["Skill", "Actions", "XP per action", "Powerup"], rows),
    `${SKILLS.length} skills, each with its own level, XP pool and percentage readout.`,
  );
}

function powerupsSection(): string {
  const cards = SKILLS.map((skill) => {
    const actions = ACTIONS[skill.name] as readonly Action[];
    const rows = actions.map((action) => [
      code(action.objective),
      esc(actionLabel(action)),
      String(action.xp),
      action.divisor ? `/ ${action.divisor}` : "-",
    ]);
    return `<article class="card">
      <h3>${esc(skill.display)}</h3>
      <p class="muted">${esc(POWERUPS[skill.powerup].detail)}</p>
      ${details(`Show ${actions.length} tracked actions`, table(["Objective", "Tracked action", "XP", "Divisor"], rows))}
    </article>`;
  }).join("");
  return section(
    "powerups",
    "Powerups and actions",
    `<div class="grid">${cards}</div>`,
    "Every action that grants XP, and what each skill's powerup does.",
  );
}

function curveSection(): string {
  const rows: string[][] = [];
  let cumulative = 0;
  for (let level = 1; level <= 30; level += 1) {
    cumulative += requirement(level);
    rows.push([String(level), String(requirement(level)), String(cumulative)]);
  }
  return section(
    "curve",
    "Level curve",
    `${table(["Level", "XP to reach it", "Total XP"], rows)}
    ${details(
      "Beyond level 30",
      `${table(
        ["Level", "XP to reach it"],
        [40, 50, 75, 100].map((level) => [String(level), String(requirement(level))]),
      )}
      <p class="muted">The same formula continues: 9 x level - 158.</p>`,
    )}`,
    "Requirement to reach a level L: 2L+7 up to level 15, 5L-38 for levels 16-30, 9L-158 from level 31.",
  );
}

export function derivedSections(): string {
  return [skillsSection(), powerupsSection(), curveSection()].join("\n");
}
