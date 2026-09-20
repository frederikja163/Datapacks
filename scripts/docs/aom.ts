// AOM-specific documentation sections, derived from the pack's TypeScript
// registry and advancement tree so the page tracks the datapack itself.

import {
  BUILDINGS,
  CATEGORIES,
  RESOURCES,
  WOODS,
  gatedRecipes,
  planExtras,
  recipeRequirements,
  unlocks,
  type BuildingType,
  type Job,
} from "../../packs/aom/src/registry.ts";
import { GUIDE } from "../../packs/aom/src/guide.ts";
import {
  CATEGORY_TITLES,
  TREE,
  type TreeNode,
} from "../../packs/aom/src/tree.ts";
import { badge, code, details, esc, section, table } from "./render.ts";

const PALETTE = [
  "#f97316", "#22c55e", "#38bdf8", "#a855f7", "#facc15",
  "#ef4444", "#14b8a6", "#e879f9", "#94a3b8",
];

const MECHANICS: Record<string, string> = {
  leveller:
    "Each staffed Leveller raises the mining fatigue floor by 10 levels, from y=62 down to the world floor at y=-64.",
  portal:
    "Lets town members enter the Nether. Without a staffed Portal, a member entering the Nether is sent back.",
  noop: "Hires a villager that does nothing. Can be fired again, unlike every other job.",
};

function colorForCategory(title: string): string {
  const index = (CATEGORIES as readonly string[]).indexOf(title);
  return PALETTE[(index < 0 ? 0 : index) % PALETTE.length]!;
}

function categoryColor(catId: string): string {
  return colorForCategory(CATEGORY_TITLES[catId] ?? "");
}

function jobCount(kind: Job["kind"]): number {
  return BUILDINGS.flatMap((building) => building.jobs).filter((job) => job.kind === kind).length;
}

function shortItem(id: string): string {
  return id.replace(/^minecraft:/, "").replace(/_/g, " ");
}

function shortRecipe(id: string): string {
  return id.replace(/^minecraft:/, "");
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function statsSection(): string {
  const stats: Array<[string, number]> = [
    ["Buildings", BUILDINGS.length],
    ["Categories", CATEGORIES.length],
    ["Unlock jobs", jobCount("unlock")],
    ["Generation jobs", jobCount("generation")],
    ["Storage jobs", jobCount("storage")],
    ["Mechanics", jobCount("mechanic")],
    ["Resources", RESOURCES.length],
    ["Gated recipes", gatedRecipes().length],
    ["Wood types", WOODS.length],
  ];
  return section(
    "stats",
    "At a glance",
    `<div class="stats">${stats
      .map(([label, value]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`)
      .join("")}</div>`,
  );
}

// ---------------------------------------------------------------------------
// In-game guide
// ---------------------------------------------------------------------------

function guideSection(): string {
  const pages = GUIDE.map(
    (page) =>
      `<article class="card"><h3>${esc(page.heading)}</h3>${page.lines
        .map((line) => `<p>${esc(line)}</p>`)
        .join("")}</article>`,
  ).join("");
  return section(
    "guide",
    "In-game guide",
    `<div class="grid">${pages}</div>`,
    `The same ${GUIDE.length} pages <code>/trigger aom.guide</code> prints in chat.`,
  );
}

// ---------------------------------------------------------------------------
// Advancement tree
// ---------------------------------------------------------------------------

function nodeTitle(node: TreeNode): string {
  if (node.id === "root") return "Age of Minecraft";
  if (node.id.startsWith("cat_")) return CATEGORY_TITLES[node.id] ?? node.id;
  return BUILDINGS.find((building) => building.id === node.id)?.label ?? node.id;
}

function treeSection(): string {
  const byId = new Map(TREE.map((node) => [node.id, node]));
  const children = new Map<string, TreeNode[]>();
  for (const node of TREE) {
    if (!node.parent) continue;
    const list = children.get(node.parent) ?? [];
    list.push(node);
    children.set(node.parent, list);
  }
  const categoryOf = (node: TreeNode): string => {
    let current: TreeNode | undefined = node;
    while (current) {
      if (current.id.startsWith("cat_")) return current.id;
      current = current.parent ? byId.get(current.parent) : undefined;
    }
    return "";
  };
  const colorOf = (node: TreeNode): string => {
    if (node.id === "root") return "#e2e8f0";
    return categoryColor(categoryOf(node)) || "#64748b";
  };

  const gap = 22;
  const margin = 60;
  const rowHeight = 104;
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  let cursor = margin;
  let maxDepth = 0;
  const layout = (node: TreeNode, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const title = nodeTitle(node);
    const w = node.id === "root" ? 200 : Math.max(130, title.length * 8 + 46);
    const kids = children.get(node.id) ?? [];
    const h = kids.length || node.id.startsWith("cat_") ? 46 : 40;
    let x: number;
    if (!kids.length) {
      x = cursor + w / 2;
      cursor += w + gap;
    } else {
      const xs = kids.map((kid) => layout(kid, depth + 1));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
    positions.set(node.id, { x, y: margin + depth * rowHeight, w, h });
    return x;
  };
  const root = byId.get("root")!;
  layout(root, 0);

  const width = cursor + margin;
  const height = margin * 2 + maxDepth * rowHeight + 40;

  const edges = TREE.filter((node) => node.parent)
    .map((node) => {
      const from = positions.get(node.parent!)!;
      const to = positions.get(node.id)!;
      const x1 = from.x;
      const y1 = from.y + from.h;
      const x2 = to.x;
      const y2 = to.y;
      const mid = (y1 + y2) / 2;
      return `<path class="edge" d="M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}" />`;
    })
    .join("");

  const nodes = TREE.map((node) => {
    const p = positions.get(node.id)!;
    const color = colorOf(node);
    const isCategory = node.id.startsWith("cat_") || node.id === "root";
    const fill = node.id === "root" ? "#1e293b" : `${color}22`;
    return `<g class="tn${isCategory ? " tn-cat" : ""}" data-id="${esc(node.id)}" transform="translate(${p.x} ${p.y})">
        <rect x="${-p.w / 2}" y="0" width="${p.w}" height="${p.h}" rx="10" fill="${fill}" stroke="${color}" />
        <text x="${-p.w / 2 + 14}" y="${p.h / 2 + 5}">${esc(nodeTitle(node))}</text>
      </g>`;
  }).join("");

  const parentMap = Object.fromEntries(
    TREE.filter((node) => node.parent).map((node) => [node.id, node.parent!]),
  );
  const legend = TREE.filter((node) => node.id.startsWith("cat_"))
    .map(
      (node) =>
        `<span><i style="background:${categoryColor(node.id)}"></i>${esc(
          CATEGORY_TITLES[node.id] ?? node.id,
        )}</span>`,
    )
    .join("");

  const script = `
const parentMap = ${JSON.stringify(parentMap)};
const treeNodes = [...document.querySelectorAll("#tree-svg .tn")];
const svg = document.getElementById("tree-svg");
const baseW = Number(svg.dataset.w);
const baseH = Number(svg.dataset.h);
function highlight(id) {
  const line = new Set();
  let cur = id;
  while (cur) { line.add(cur); cur = parentMap[cur]; }
  for (const node of treeNodes) node.classList.toggle("hl", line.has(node.dataset.id));
  for (const node of treeNodes) node.classList.toggle("dim", !line.has(node.dataset.id));
}
function clear() {
  for (const node of treeNodes) node.classList.remove("hl", "dim");
}
for (const node of treeNodes) {
  node.addEventListener("mouseenter", () => highlight(node.dataset.id));
  node.addEventListener("mouseleave", clear);
}
const zoom = document.getElementById("zoom");
function applyZoom() {
  const factor = Number(zoom.value);
  svg.setAttribute("width", String(baseW * factor));
  svg.setAttribute("height", String(baseH * factor));
}
zoom.addEventListener("input", applyZoom);
applyZoom();
`;

  const svg = `<svg id="tree-svg" viewBox="0 0 ${width} ${height}" data-w="${width}" data-h="${height}" width="${width}" height="${height}">
    <g class="edges">${edges}</g>
    <g class="nodes">${nodes}</g>
  </svg>`;

  return `${section(
    "tree",
    "Advancement tree",
    `<div class="controls">
      <label class="muted">Zoom <input id="zoom" type="range" min="0.4" max="1.6" step="0.1" value="0.85"></label>
      <div class="tree-legend">${legend}</div>
    </div>
    <div class="tree-wrap">${svg}</div>`,
    `${TREE.filter((node) => node.kind === "building").length} building nodes under ${TREE.filter((node) => node.kind === "category").length} categories. Hover a node to trace its lineage.`,
  )}<script>${script}</script>`;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

function jobHtml(job: Job): string {
  if (job.kind === "unlock") {
    const recipes = job.recipes ?? [];
    const list = table(
      ["Recipe"],
      recipes.map((recipe) => [code(recipe.startsWith("aom:") ? recipe : shortRecipe(recipe))]),
    );
    return `<div class="job">
      <div class="job-head"><span class="tag tag-unlock">unlock</span>${esc(job.label)} · ${
        job.required ?? 1
      } worker${(job.required ?? 1) === 1 ? "" : "s"}</div>
      <p class="muted">${recipes.length} recipe${recipes.length === 1 ? "" : "s"} granted while staffed.</p>
      ${details(`Show ${recipes.length} recipes`, list)}
    </div>`;
  }
  if (job.kind === "generation") {
    const interval = job.interval ?? 1;
    if (job.table) {
      const total = job.table.reduce((sum, entry) => sum + entry.weight, 0);
      const rows = job.table.map((entry) => [
        entry.resource
          ? code(RESOURCES.find((resource) => resource.id === entry.resource)?.label ?? entry.resource)
          : '<span class="muted">nothing</span>',
        String(entry.weight),
        `${Math.round((entry.weight / total) * 1000) / 10}%`,
      ]);
      return `<div class="job">
        <div class="job-head"><span class="tag tag-generation">generation</span>${esc(job.label)} · 1 roll / ${interval} min</div>
        <p class="muted">Weighted table over ${job.table.length} outcomes.</p>
        ${details("Show the roll table", table(["Outcome", "Weight", "Chance"], rows))}
      </div>`;
    }
    const resource = RESOURCES.find((entry) => entry.id === job.resource);
    return `<div class="job">
      <div class="job-head"><span class="tag tag-generation">generation</span>${esc(job.label)}</div>
      <p class="muted">${resource ? code(resource.label) : code(job.resource ?? "?")} · 1 per ${interval} min</p>
    </div>`;
  }
  if (job.kind === "storage") {
    const resource = RESOURCES.find((entry) => entry.id === job.resource);
    return `<div class="job">
      <div class="job-head"><span class="tag tag-storage">storage</span>${esc(job.label)}</div>
      <p class="muted">${resource ? code(resource.label) : code(job.resource ?? "?")} · +${job.capacity ?? 576} capacity per worker</p>
    </div>`;
  }
  return `<div class="job">
    <div class="job-head"><span class="tag tag-mechanic">mechanic</span>${esc(job.label)}</div>
    <p class="muted">${esc(MECHANICS[job.mechanic ?? ""] ?? "Special behaviour.")}</p>
  </div>`;
}

function buildingCard(building: BuildingType): string {
  const unlockMap = unlocks();
  const requires = (building.requires ?? [])
    .map((id) => unlockMap.get(id)?.label ?? id)
    .join(", ");
  const extras = planExtras(building).map(shortItem).join(" + ");
  const badges = [
    badge(building.category),
    building.townhall ? badge("townhall", "hot") : "",
    building.population ? badge("population") : "",
    building.fire ? badge("fireable jobs") : "",
    requires ? badge(`requires ${requires}`) : "",
  ].filter(Boolean).join("");
  return `<article class="card building-card" data-category="${esc(building.category)}" data-name="${esc(
    building.label.toLowerCase(),
  )}">
    <header><h3>${esc(building.label)}</h3><div class="badges">${badges}</div></header>
    <p class="muted">${esc(building.description)}</p>
    <p><strong>Plan:</strong> 1 wood plank${extras ? ` + ${esc(extras)}` : ""}</p>
    ${building.jobs.length ? building.jobs.map(jobHtml).join("") : '<p class="muted">No jobs.</p>'}
  </article>`;
}

function buildingsSection(): string {
  const groups = CATEGORIES.map(
    (category) =>
      `<h2 class="cat" data-cat="${esc(category)}"><span style="background:${colorForCategory(
        category,
      )}"></span>${esc(category)}</h2>${BUILDINGS.filter(
        (building) => building.category === category,
      ).map(buildingCard).join("")}`,
  ).join("");

  const script = `
const search = document.getElementById("building-search");
const filter = document.getElementById("building-filter");
const cards = [...document.querySelectorAll(".building-card")];
function apply() {
  const q = search.value.trim().toLowerCase();
  const cat = filter.value;
  for (const card of cards) {
    const ok = (!q || card.dataset.name.includes(q)) && (!cat || card.dataset.category === cat);
    card.classList.toggle("hidden", !ok);
  }
  for (const heading of document.querySelectorAll("h2.cat")) {
    const any = cards.some((card) => card.dataset.category === heading.dataset.cat && !card.classList.contains("hidden"));
    heading.classList.toggle("hidden", !any);
  }
}
search.addEventListener("input", apply);
filter.addEventListener("change", apply);
`;

  return `${section(
    "buildings",
    "Buildings",
    `<div class="controls">
      <input id="building-search" type="search" placeholder="Search buildings...">
      <select id="building-filter">
        <option value="">All categories</option>
        ${CATEGORIES.map((category) => `<option>${esc(category)}</option>`).join("")}
      </select>
    </div>
    ${groups}`,
    `${BUILDINGS.length} buildings across ${CATEGORIES.length} categories, each generated from the registry.`,
  )}<script>${script}</script>`;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

function resourcesSection(): string {
  const rows = RESOURCES.map((resource) => {
    const generators: string[] = [];
    const storages: string[] = [];
    for (const building of BUILDINGS) {
      for (const job of building.jobs) {
        if (job.kind === "generation") {
          if (job.resource === resource.id) {
            generators.push(`${building.label} (1 / ${job.interval ?? 1} min)`);
          } else if (job.table?.some((entry) => entry.resource === resource.id)) {
            generators.push(`${building.label} (weighted)`);
          }
        }
        if (job.kind === "storage" && job.resource === resource.id) {
          storages.push(`${building.label} (+${job.capacity ?? 576})`);
        }
      }
    }
    return [
      `${esc(resource.label)} ${code(resource.item.replace(/^minecraft:/, ""))}`,
      generators.length ? generators.map(esc).join("<br>") : '<span class="muted">drops/loot only</span>',
      storages.length ? storages.map(esc).join("<br>") : '<span class="muted">-</span>',
    ];
  });
  return section(
    "resources",
    "Resources",
    table(["Resource", "Generated by", "Stored by"], rows),
    "Generation only runs while the building's chunk is loaded; storage capacity starts at zero.",
  );
}

// ---------------------------------------------------------------------------
// Shared recipes
// ---------------------------------------------------------------------------

function sharedRecipesSection(): string {
  const unlockMap = unlocks();
  const buildingOfUnlock = new Map<string, string[]>();
  for (const building of BUILDINGS) {
    for (const job of building.jobs) {
      if (job.kind !== "unlock" || !job.unlock) continue;
      const list = buildingOfUnlock.get(job.unlock) ?? [];
      if (!list.includes(building.label)) list.push(building.label);
      buildingOfUnlock.set(job.unlock, list);
    }
  }
  const shared = [...recipeRequirements()]
    .filter(([recipe, ids]) => recipe.startsWith("minecraft:") && new Set(ids).size > 1)
    .map(([recipe, ids]) => [
      code(shortRecipe(recipe)),
      ids.map((id) => esc(unlockMap.get(id)?.label ?? id)).join(" + "),
      ids.map((id) => (buildingOfUnlock.get(id) ?? []).map(esc).join("/")).join(" + "),
    ])
    .sort((a, b) => a[0]!.localeCompare(b[0]!));
  if (!shared.length) return "";
  return section(
    "shared",
    "Recipes that need several jobs",
    table(["Recipe", "Unlocks required", "Buildings"], shared),
    `${shared.length} recipes are only granted while two or more unlock jobs are staffed at once.`,
  );
}

export function derivedSections(): string {
  return [
    statsSection(),
    guideSection(),
    treeSection(),
    buildingsSection(),
    resourcesSection(),
    sharedRecipesSection(),
  ].join("\n");
}
