import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadDesign,
  recipeProviders,
  normalizeCraft,
  buildTree,
  type TreeNode,
  type Building,
} from "./design.ts";

// Renders a self-contained review page for packs/aom/DESIGN.md: totals,
// validation, a layered tech tree, building cards and reference tables.
//
// Run: bun tools/build-design-review.ts

const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(here, "aom-design-review.html");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function main(): void {
  const design = loadDesign();
  const { buildings, shared, storage, categories } = design;
  const providers = recipeProviders(buildings);

  // --- totals -------------------------------------------------------------
  const distinctRecipes = new Set(providers.keys());
  let totalGrants = 0;
  let sharedGrantCount = 0;
  for (const building of buildings) {
    for (const job of building.jobs) {
      if (job.kind !== "unlock") continue;
      totalGrants += job.recipes.length;
      sharedGrantCount += job.recipes.filter((recipe) => recipe.also.length).length;
    }
  }
  const unlockJobs = buildings.flatMap((b) => b.jobs.filter((j) => j.kind === "unlock"));
  const mechanicJobs = buildings.flatMap((b) => b.jobs.filter((j) => j.kind === "mechanic"));
  const unlockVillagers = unlockJobs.reduce((sum, job) => sum + job.villagers, 0);
  const mechanicVillagers = mechanicJobs.reduce((sum, job) => sum + job.villagers, 0);
  const storageJobs = buildings.reduce(
    (sum, building) =>
      sum +
      building.jobs
        .filter((job) => job.kind === "storage")
        .reduce((count, job) => count + job.resources.length, 0),
    0,
  );
  const minWorkers = unlockVillagers + mechanicVillagers + storageJobs;

  // --- validation ---------------------------------------------------------
  const warnings: { kind: string; message: string }[] = [];
  const seenWarnings = new Set<string>();
  const warn = (kind: string, message: string) => {
    if (seenWarnings.has(message)) return;
    seenWarnings.add(message);
    warnings.push({ kind, message });
  };
  const normalizeName = (value: string) =>
    value
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(all|the|any|recipes?|items?|building|plans?)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const recipeIndex = new Map<string, Set<string>>();
  for (const building of buildings) {
    for (const job of building.jobs) {
      if (job.kind !== "unlock") continue;
      for (const recipe of job.recipes) {
        const key = normalizeName(recipe.name);
        const set = recipeIndex.get(key) ?? new Set<string>();
        set.add(building.name);
        recipeIndex.set(key, set);
      }
    }
  }
  const grants = (building: string, recipe: string) =>
    recipeIndex.get(normalizeName(recipe))?.has(building) ?? false;
  for (const row of shared) {
    for (const building of row.buildings) {
      if (!grants(building, row.recipe)) {
        warn("appendix", `"${row.recipe}" lists ${building} in the shared table, but ${building} does not grant it.`);
      }
    }
  }
  for (const building of buildings) {
    for (const job of building.jobs) {
      if (job.kind !== "unlock") continue;
      for (const recipe of job.recipes) {
        for (const other of recipe.also) {
          if (!grants(other, recipe.name)) {
            warn("also", `${building.name} marks "${recipe.name}" as needing ${other}, but ${other} does not grant it.`);
          }
        }
      }
    }
  }
  for (const building of buildings) {
    const token = normalizeCraft(building.craft);
    if (!token) continue;
    const owners = providers.get(token);
    if (!owners) continue;
    const gated = building.jobs.some(
      (job) =>
        job.kind === "unlock" &&
        job.recipes.some((recipe) => normalizeCraft(recipe.name) === token && recipe.also.length > 0),
    );
    if (gated && owners.has(building.name) && owners.size === 1) {
      warn("circular", `${building.name}'s craft anchor "${building.craft}" is a shared recipe only granted by ${building.name} itself, so it cannot be built.`);
    }
  }

  for (const building of buildings) {
    for (const required of building.requires) {
      if (!buildings.some((candidate) => candidate.name === required)) {
        warn("requires", `${building.name} requires "${required}", which is not a building.`);
      }
    }
  }
  for (const building of buildings) {
    const seen = new Set<string>();
    let current: Building | undefined = building;
    while (current && current.requires.length) {
      if (seen.has(current.name)) {
        warn("requires", `Requires cycle detected through ${building.name}.`);
        break;
      }
      seen.add(current.name);
      current = buildings.find((candidate) => candidate.name === current!.requires[0]);
    }
  }

  // --- tech tree layout ---------------------------------------------------
  const { root, nodes } = buildTree(design);
  const palette = [
    "#f97316", "#22c55e", "#38bdf8", "#a855f7", "#facc15",
    "#ef4444", "#14b8a6", "#e879f9", "#94a3b8",
  ];
  const colorOf = (category: string | null) =>
    category ? palette[categories.indexOf(category) % palette.length]! : "#64748b";
  const catColor = new Map<string, string>();
  categories.forEach((category, index) => catColor.set(category, palette[index % palette.length]!));

  const nodeWidth = (node: TreeNode) =>
    node.category === null ? 180 : Math.max(120, node.title.length * 8 + 46);
  const boxHeight = (node: TreeNode) => (node.children.length || node.id.startsWith("cat_") ? 46 : 40);
  const rowHeight = 104;
  const gap = 22;
  const margin = 60;

  let cursor = margin;
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  const layout = (node: TreeNode): number => {
    const w = nodeWidth(node);
    const h = boxHeight(node);
    let x: number;
    if (!node.children.length) {
      x = cursor + w / 2;
      cursor += w + gap;
    } else {
      const childXs = node.children.map((child) => layout(child));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }
    positions.set(node.id, { x, y: margin + node.depth * rowHeight, w, h });
    return x;
  };
  layout(root);
  const treeWidth = cursor + margin;
  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const treeHeight = margin * 2 + maxDepth * rowHeight + 50;

  const edges = nodes
    .filter((node) => node.parent)
    .map((node) => {
      const from = positions.get(node.parent!)!;
      const to = positions.get(node.id)!;
      const x1 = from.x, y1 = from.y + from.h;
      const x2 = to.x, y2 = to.y;
      const mid = (y1 + y2) / 2;
      return `<path class="edge" d="M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}" />`;
    })
    .join("");

  const treeNodes = nodes
    .map((node) => {
      const p = positions.get(node.id)!;
      const color = node.id === "root" ? "#e2e8f0" : catColor.get(node.category ?? "") ?? "#64748b";
      const isCategory = node.id.startsWith("cat_") || node.id === "root";
      const fill = node.id === "root" ? "#1e293b" : `${color}22`;
      return `<g class="tn${isCategory ? " tn-cat" : ""}" data-id="${escapeHtml(node.id)}" data-parent="${escapeHtml(
        node.parent ?? "",
      )}" transform="translate(${p.x} ${p.y})">
        <rect x="${-p.w / 2}" y="0" width="${p.w}" height="${p.h}" rx="10" fill="${fill}" stroke="${color}" />
        <text x="${-p.w / 2 + 12}" y="${p.h / 2 + 6}">${node.emoji}</text>
        <text x="${-p.w / 2 + 38}" y="${p.h / 2 + 5}">${escapeHtml(node.title)}</text>
      </g>`;
    })
    .join("");

  const treeSvg = `<svg id="tree-svg" viewBox="0 0 ${treeWidth} ${treeHeight}" data-w="${treeWidth}" data-h="${treeHeight}" width="${treeWidth}" height="${treeHeight}">
    <g class="edges">${edges}</g>
    <g class="nodes">${treeNodes}</g>
  </svg>`;
  const parentMap = Object.fromEntries(nodes.filter((n) => n.parent).map((n) => [n.id, n.parent!]));

  // --- stats --------------------------------------------------------------
  const stats = [
    ["Buildings", String(buildings.length)],
    ["Categories", String(categories.length)],
    ["Unlock jobs", String(unlockJobs.length)],
    ["Distinct recipes", String(distinctRecipes.size)],
    ["Recipe grants", String(totalGrants)],
    ["Shared grants", String(sharedGrantCount)],
    ["Storage jobs", String(storageJobs)],
    ["Min. workers", String(minWorkers)],
    ["Warnings", String(warnings.length)],
  ];

  const buildingHtml = categories
    .map((category) => {
      const cards = buildings
        .filter((building) => building.category === category)
        .map((building) => {
          const jobs = building.jobs
            .map((job) => {
              if (job.kind === "storage") {
                const resources = job.resources
                  .map(
                    (resource) =>
                      `<li><code>${escapeHtml(resource.name)}</code>${
                        resource.rate ? ` <span class="rate">${escapeHtml(resource.rate)}</span>` : ""
                      }</li>`,
                  )
                  .join("");
                return `<div class="job"><div class="job-head"><span class="tag tag-storage">storage</span>${escapeHtml(
                  job.label,
                )}</div><ul>${resources}</ul></div>`;
              }
              if (job.kind === "mechanic") {
                return `<div class="job"><div class="job-head"><span class="tag tag-mech">mechanic</span>${escapeHtml(
                  job.label,
                )} · ${job.villagers} villager${job.villagers === 1 ? "" : "s"}</div><ul>${job.notes
                  .map((note) => `<li>${escapeHtml(note)}</li>`)
                  .join("")}</ul></div>`;
              }
              const recipes = job.recipes
                .map(
                  (recipe) =>
                    `<li><code>${escapeHtml(recipe.name)}</code>${
                      recipe.also.length
                        ? ` <span class="also">needs ${escapeHtml(recipe.also.join(", "))}</span>`
                        : ""
                    }</li>`,
                )
                .join("");
              return `<div class="job"><div class="job-head"><span class="tag tag-unlock">unlock</span>${escapeHtml(
                job.label,
              )} · ${job.villagers} villager${job.villagers === 1 ? "" : "s"}</div><ul>${recipes}</ul></div>`;
            })
            .join("");

          const recipeCount = building.jobs
            .filter((job) => job.kind === "unlock")
            .reduce((sum, job) => sum + job.recipes.length, 0);
          const storageCount = building.jobs
            .filter((job) => job.kind === "storage")
            .reduce((sum, job) => sum + job.resources.length, 0);

          return `
          <article class="card" data-category="${escapeHtml(category)}" data-name="${escapeHtml(
            building.name.toLowerCase(),
          )}">
            <header>
              <h3>${escapeHtml(building.name)}</h3>
              <div class="badges">
                <span class="badge" style="--c:${colorOf(category)}">${escapeHtml(category)}</span>
                <span class="badge">craft: ${escapeHtml(building.craft || "—")}</span>
                ${building.requires.length ? `<span class="badge">requires: ${escapeHtml(building.requires.join(", "))}</span>` : ""}
                ${recipeCount ? `<span class="badge">${recipeCount} unlocks</span>` : ""}
                ${storageCount ? `<span class="badge">${storageCount} storage</span>` : ""}
              </div>
            </header>
            <p class="desc">${escapeHtml(building.description)}</p>
            ${jobs || '<p class="muted">No jobs.</p>'}
            ${
              building.notes.length
                ? `<ul class="notes">${building.notes
                    .map((note) => `<li>${formatInline(note)}</li>`)
                    .join("")}</ul>`
                : ""
            }
            ${
              building.quotes.length
                ? `<div class="quotes">${building.quotes
                    .map((quote) => `<p>${formatInline(quote)}</p>`)
                    .join("")}</div>`
                : ""
            }
            ${building.tables
              .map(
                (table) =>
                  `<table class="mini"><thead><tr>${table.headers
                    .map((header) => `<th>${escapeHtml(header)}</th>`)
                    .join("")}</tr></thead><tbody>${table.rows
                    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                    .join("")}</tbody></table>`,
              )
              .join("")}
          </article>`;
        })
        .join("");
      return `<h2 class="cat" data-cat="${escapeHtml(category)}"><span style="background:${colorOf(
        category,
      )}"></span>${escapeHtml(category)}</h2>${cards}`;
    })
    .join("");

  const sharedHtml = shared
    .map(
      (row) =>
        `<tr><td><code>${escapeHtml(row.recipe)}</code></td><td>${escapeHtml(row.buildings.join(", "))}</td></tr>`,
    )
    .join("");

  const storageHtml = storage
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.building)}</td><td>${escapeHtml(row.resource)}</td><td>${escapeHtml(
          row.collector,
        )}</td><td>${escapeHtml(row.rate)}</td></tr>`,
    )
    .join("");

  const generated = new Date().toISOString().replace("T", " ").slice(0, 16);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Age of Minecraft — Design Review</title>
<style>
  :root { color-scheme: dark; --bg:#0b1120; --panel:#131c31; --panel2:#0f172a; --line:#24314d; --ink:#e2e8f0; --muted:#94a3b8; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1200px; margin:0 auto; padding:32px 20px 80px; }
  h1 { margin:0 0 4px; font-size:30px; }
  .sub { color:var(--muted); margin-bottom:24px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:32px; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; }
  .stat b { display:block; font-size:26px; }
  .stat span { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
  h2 { margin:36px 0 14px; font-size:20px; }
  h2.cat { display:flex; align-items:center; gap:10px; }
  h2.cat span { width:12px; height:12px; border-radius:3px; display:inline-block; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px 18px; margin:12px 0; }
  .card header { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
  .card h3 { margin:0; font-size:18px; }
  .badges { display:flex; flex-wrap:wrap; gap:6px; }
  .badge { font-size:11px; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:2px 8px; }
  .badge[style] { color:#fff; border-color:transparent; }
  .desc { margin:10px 0 12px; }
  .muted { color:var(--muted); }
  .job { border-top:1px dashed var(--line); padding-top:10px; margin-top:10px; }
  .job-head { font-weight:600; display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .tag { font-size:10px; text-transform:uppercase; letter-spacing:.05em; border-radius:5px; padding:2px 6px; }
  .tag-unlock { background:#1d4ed8; color:#fff; }
  .tag-storage { background:#047857; color:#fff; }
  .tag-mech { background:#7c3aed; color:#fff; }
  ul { margin:0; padding-left:18px; }
  li { margin:2px 0; }
  code { background:#0a0f1d; border:1px solid var(--line); border-radius:5px; padding:1px 5px; font-size:13px; }
  .also { color:#fca5a5; font-size:12px; }
  .rate { color:#6ee7b7; font-size:12px; }
  table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th,td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); font-size:14px; }
  th { color:var(--muted); text-transform:uppercase; font-size:11px; letter-spacing:.06em; }
  tr:last-child td { border-bottom:none; }
  .controls { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 4px; align-items:center; }
  input, select { background:var(--panel2); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px 10px; }
  footer { color:var(--muted); margin-top:40px; font-size:12px; }
  .hidden { display:none !important; }
  .warnings { list-style:none; padding:0; display:grid; gap:8px; }
  .warnings li { background:#2a1620; border:1px solid #7f1d1d; border-radius:10px; padding:10px 12px; }
  .wkind { display:inline-block; font-size:10px; text-transform:uppercase; letter-spacing:.06em; background:#b91c1c; color:#fff; border-radius:5px; padding:2px 6px; margin-right:8px; }
  .ok { color:#6ee7b7; }
  .tree-wrap { position:relative; background:var(--panel2); border:1px solid var(--line); border-radius:14px; overflow:auto; max-height:720px; }
  #tree-svg { display:block; }
  #tree-svg text { font:13px ui-sans-serif, system-ui, sans-serif; fill:var(--ink); dominant-baseline:middle; }
  #tree-svg .tn { cursor:pointer; }
  #tree-svg .tn rect { transition: opacity .1s; }
  #tree-svg .edge { fill:none; stroke:#334155; stroke-width:1.5; }
  #tree-svg .tn.dim { opacity:.18; }
  #tree-svg .tn.hl rect { stroke-width:2.5; }
  .tree-legend { position:sticky; top:0; display:flex; gap:10px; flex-wrap:wrap; background:rgba(11,17,32,.9); padding:6px 0; font-size:12px; color:var(--muted); z-index:2; }
  .tree-legend i { width:10px; height:10px; border-radius:3px; display:inline-block; margin-right:4px; }
  .notes { margin:10px 0 0; padding-left:18px; color:var(--ink); }
  .notes li { margin:2px 0; }
  .quotes { margin-top:10px; border-left:3px solid var(--line); padding-left:12px; color:var(--muted); }
  .quotes p { margin:6px 0; }
  table.mini { margin-top:12px; font-size:13px; }
  table.mini th, table.mini td { padding:5px 10px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Age of Minecraft — Design Review</h1>
  <p class="sub">Generated from <code>packs/aom/DESIGN.md</code> on ${generated} (UTC). Wildcard/group unlocks are counted as single entries.</p>

  <div class="stats">
    ${stats.map(([label, value]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("")}
  </div>

  <h2>Validation</h2>
  <p class="sub">Cross-checks the per-building unlock lists against the shared-recipe table and flags craft anchors that only the building itself grants (unbuildable).</p>
  ${
    warnings.length
      ? `<ul class="warnings">${warnings
          .map((warning) => `<li><span class="wkind">${escapeHtml(warning.kind)}</span>${escapeHtml(warning.message)}</li>`)
          .join("")}</ul>`
      : '<p class="ok">No inconsistencies found.</p>'
  }

  <h2>Tech tree</h2>
  <p class="sub">Category hubs hang off the root; a building drops under another building when its craft anchor is unlocked there. Hover a node to trace its lineage.</p>
  <div class="controls">
    <label class="muted">Zoom <input id="zoom" type="range" min="0.4" max="1.6" step="0.1" value="0.85"></label>
    <div class="tree-legend">
      ${categories.map((category) => `<span><i style="background:${colorOf(category)}"></i>${escapeHtml(category)}</span>`).join("")}
    </div>
  </div>
  <div class="tree-wrap">${treeSvg}</div>

  <h2>Buildings</h2>
  <div class="controls">
    <input id="search" type="search" placeholder="Search buildings...">
    <select id="filter">
      <option value="">All categories</option>
      ${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}
    </select>
  </div>
  ${buildingHtml}

  <h2>Shared recipes</h2>
  <p class="sub">Granted only while every listed building has its unlock job staffed.</p>
  <table><thead><tr><th>Recipe</th><th>Buildings</th></tr></thead><tbody>${sharedHtml}</tbody></table>

  <h2>Storage &amp; generation</h2>
  <p class="sub">${storage.length} storage resources across ${new Set(storage.map((row) => row.building)).size} generating buildings. Each needs at least one collector; bankers only add capacity.</p>
  <table><thead><tr><th>Building</th><th>Resource</th><th>Collector</th><th>Rate</th></tr></thead><tbody>${storageHtml}</tbody></table>

  <footer>Approximate fully-unlocked village: ${unlockVillagers} unlock workers + ${mechanicVillagers} mechanic workers + ${storageJobs} collectors = <strong>${minWorkers}</strong> employed villagers minimum (roughly ${minWorkers} townhouses plus members).<br>Regenerate with <code>bun tools/build-design-review.ts</code> after editing <code>packs/aom/DESIGN.md</code>.</footer>
</div>
<script>
  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const cards = [...document.querySelectorAll(".card")];
  const headings = [...document.querySelectorAll("h2.cat")];
  function apply() {
    const q = search.value.trim().toLowerCase();
    const cat = filter.value;
    for (const card of cards) {
      const ok = (!q || card.dataset.name.includes(q)) && (!cat || card.dataset.category === cat);
      card.classList.toggle("hidden", !ok);
    }
    for (const heading of headings) {
      const any = cards.some((card) => card.dataset.category === heading.dataset.cat && !card.classList.contains("hidden"));
      heading.classList.toggle("hidden", !any);
    }
  }
  search.addEventListener("input", apply);
  filter.addEventListener("change", apply);

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
</script>
</body>
</html>
`;

  writeFileSync(OUTPUT, html);
  console.log(`Wrote ${OUTPUT}`);
  console.log(
    `${buildings.length} buildings, ${distinctRecipes.size} distinct recipes, ${totalGrants} grants, ${storage.length} storage resources, ${minWorkers} min workers, ${warnings.length} warnings.`,
  );
}

main();
