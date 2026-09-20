// HTML helpers for the generated documentation site. Everything is emitted as
// plain strings so the site stays a set of static files with no runtime
// dependencies.

import type { DocCommand, DocFeature } from "../../mcgen/src/index.ts";

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function code(value: string): string {
  return `<code>${esc(value)}</code>`;
}

export function badge(value: string, cls = ""): string {
  return `<span class="badge${cls ? ` ${cls}` : ""}">${esc(value)}</span>`;
}

export function section(
  id: string,
  title: string,
  body: string,
  subtitle?: string,
): string {
  return `<section id="${esc(id)}">
  <h2>${esc(title)}</h2>
  ${subtitle ? `<p class="sub">${subtitle}</p>` : ""}
  ${body}
</section>`;
}

export function featureGrid(features: readonly DocFeature[]): string {
  return `<div class="grid">${features
    .map(
      (feature) =>
        `<article class="card"><h3>${esc(feature.title)}</h3><p>${esc(
          feature.detail,
        )}</p></article>`,
    )
    .join("")}</div>`;
}

export function commandTable(commands: readonly DocCommand[]): string {
  return `<table><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>${commands
    .map(
      (entry) =>
        `<tr><td>${code(entry.command)}</td><td>${esc(entry.description)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

export function noteList(notes: readonly string[]): string {
  return `<ul class="notes">${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>`;
}

export function paragraphList(paragraphs: readonly string[]): string {
  return paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
}

export function table(headers: readonly string[], rows: readonly string[][]): string {
  return `<table><thead><tr>${headers
    .map((header) => `<th>${esc(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function details(summary: string, body: string, open = false): string {
  return `<details${open ? " open" : ""}><summary>${esc(summary)}</summary>${body}</details>`;
}

export interface NavPack {
  readonly name: string;
  readonly title: string;
  readonly preview?: boolean;
}

export interface LayoutOptions {
  readonly title: string;
  readonly description: string;
  readonly nav: readonly NavPack[];
  readonly current: string;
  readonly body: string;
  readonly script?: string;
  readonly mcVersion: string;
  readonly packFormat: string;
  readonly generatedAt: string;
}

export function layout(options: LayoutOptions): string {
  const nav = options.nav
    .map(
      (entry) =>
        `<a class="${entry.name === options.current ? "on" : ""}" href="${esc(
          entry.name,
        )}.html">${esc(entry.title)}${
          entry.preview ? '<span class="dot" title="Unreleased preview"></span>' : ""
        }</a>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(options.description)}">
<title>${esc(options.title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="top">
  <div class="bar">
    <a class="brand" href="index.html">Datapacks<span>Minecraft data pack documentation</span></a>
    <nav>${nav}</nav>
  </div>
</header>
<main class="wrap">${options.body}</main>
<footer class="wrap">
  Generated from the TypeScript sources on ${esc(options.generatedAt)} · Minecraft ${esc(
    options.mcVersion,
  )} (data pack format ${esc(options.packFormat)}) · Regenerate with <code>bun run docs</code>.
</footer>
${options.script ? `<script>${options.script}</script>` : ""}
</body>
</html>
`;
}

export const PAGE_CSS = `:root {
  color-scheme: dark;
  --bg: #0b1120;
  --panel: #131c31;
  --panel2: #0f172a;
  --line: #24314d;
  --ink: #e2e8f0;
  --muted: #94a3b8;
  --accent: #38bdf8;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(11, 17, 32, .92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.bar {
  max-width: 1150px;
  margin: 0 auto;
  padding: 10px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
}
.brand { color: var(--ink); font-weight: 700; font-size: 16px; display: flex; align-items: baseline; gap: 10px; }
.brand span { color: var(--muted); font-weight: 400; font-size: 12px; }
nav { display: flex; flex-wrap: wrap; gap: 4px; }
nav a { color: var(--muted); padding: 4px 9px; border-radius: 8px; font-size: 14px; }
nav a:hover { color: var(--ink); background: var(--panel); text-decoration: none; }
nav a.on { color: #0b1120; background: var(--accent); }
nav .dot { display: inline-block; width: 6px; height: 6px; margin-left: 5px; border-radius: 50%; background: #f97316; vertical-align: middle; }
.wrap { max-width: 1150px; margin: 0 auto; padding: 26px 20px 70px; }
footer.wrap { border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; padding-top: 18px; }
h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.2; }
h2 { margin: 0 0 4px; font-size: 21px; }
h3 { margin: 0 0 6px; font-size: 16px; }
section { margin-top: 38px; }
.sub { color: var(--muted); margin: 0 0 14px; }
.lead { font-size: 17px; margin: 8px 0 0; max-width: 72ch; }
.hero { padding: 6px 0 2px; }
.cta { display: inline-flex; align-items: baseline; gap: 8px; margin-top: 14px; background: var(--accent); color: #0b1120; font-weight: 600; padding: 9px 16px; border-radius: 10px; }
.cta:hover { text-decoration: none; filter: brightness(1.08); }
.cta small { font-weight: 400; opacity: .7; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.badge { font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px; }
.badge.hot { background: #1d4ed8; border-color: transparent; color: #fff; }
.badge.preview { background: #7c3aed; border-color: transparent; color: #fff; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 15px 17px; }
.card h3 { margin: 0 0 6px; }
.card p { margin: 0; color: var(--muted); }
.card p + p { margin-top: 8px; }
.packcard { display: flex; flex-direction: column; gap: 10px; }
.packcard .links { display: flex; gap: 14px; margin-top: auto; font-size: 14px; }
.packcard .namespace { color: var(--muted); font-size: 12px; }
code { background: #0a0f1d; border: 1px solid var(--line); border-radius: 5px; padding: 1px 5px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); font-size: 14px; vertical-align: top; }
th { color: var(--muted); text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
tr:last-child td { border-bottom: none; }
.notes { margin: 0; padding-left: 18px; color: var(--ink); }
.notes li { margin: 3px 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px; }
.stat b { display: block; font-size: 24px; line-height: 1.2; }
.stat span { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
details { background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; margin-top: 10px; }
details summary { cursor: pointer; color: var(--muted); }
details[open] summary { margin-bottom: 8px; }
details table { background: transparent; border: none; }
.job { border-top: 1px dashed var(--line); padding-top: 10px; margin-top: 12px; }
.job:first-child { border-top: none; margin-top: 6px; padding-top: 0; }
.job-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 4px; }
.tag { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; border-radius: 5px; padding: 2px 6px; color: #fff; }
.tag-unlock { background: #1d4ed8; }
.tag-generation { background: #047857; }
.tag-storage { background: #b45309; }
.tag-mechanic { background: #7c3aed; }
.muted { color: var(--muted); }
.tree-wrap { position: relative; background: var(--panel2); border: 1px solid var(--line); border-radius: 14px; overflow: auto; max-height: 720px; }
#tree-svg { display: block; }
#tree-svg text { font: 13px ui-sans-serif, system-ui, sans-serif; fill: var(--ink); dominant-baseline: middle; }
#tree-svg .tn { cursor: pointer; }
#tree-svg .tn rect { transition: opacity .1s; }
#tree-svg .edge { fill: none; stroke: #334155; stroke-width: 1.5; }
#tree-svg .tn.dim { opacity: .18; }
#tree-svg .tn.hl rect { stroke-width: 2.5; }
.controls { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 12px; align-items: center; }
.tree-legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
.tree-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 4px; }
input, select { background: var(--panel2); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
.hidden { display: none !important; }
h2.cat { display: flex; align-items: center; gap: 10px; margin-top: 26px; }
h2.cat span { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
@media (max-width: 640px) {
  .brand span { display: none; }
  h1 { font-size: 24px; }
}
`;
