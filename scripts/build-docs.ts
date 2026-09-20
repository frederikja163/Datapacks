// Static documentation site generator.
//
// Reads each pack's TypeScript (docs modules plus the structural registries
// and action tables) and writes a self-contained site to site/, which the
// Pages workflow publishes. Run: bun run docs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { latestVersion } from "../mcgen/src/index.ts";
import { derivedSections as aomSections } from "./docs/aom.ts";
import { derivedSections as dpsSections } from "./docs/dps.ts";
import {
  PAGE_CSS,
  badge,
  commandTable,
  esc,
  featureGrid,
  layout,
  noteList,
  paragraphList,
  section,
  type NavPack,
} from "./docs/render.ts";
import { packs, type PackEntry } from "./packs.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "site");
const FALLBACK_REPO = "https://github.com/frederikja163/Datapacks";

function repoUrl(): string {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const match = /^(?:git@([^:]+):|https?:\/\/([^/]+)\/)(.+?)(?:\.git)?$/.exec(remote);
    if (!match) return FALLBACK_REPO;
    return `https://${match[1] ?? match[2]}/${match[3]}`;
  } catch {
    return FALLBACK_REPO;
  }
}

const REPO = repoUrl();

function versionOf(pack: string): string | null {
  const file = join(root, "packs", pack, "VERSION");
  if (!existsSync(file)) return null;
  const value = readFileSync(file, "utf8").trim();
  return value.length ? value : null;
}

/** Highest release tag for a pack, e.g. `aom-1.0.2` -> `1.0.2`. */
function latestRelease(pack: string, base: string): string | null {
  try {
    const out = execFileSync("git", ["tag", "-l", `${pack}-${base}.*`], {
      cwd: root,
      encoding: "utf8",
    });
    const versions = out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((tag) => tag.slice(pack.length + 1).split(".").map(Number))
      .filter((parts) => parts.length === 3 && parts.every(Number.isFinite));
    versions.sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!);
    const last = versions.at(-1);
    return last ? last.join(".") : null;
  } catch {
    return null;
  }
}

function releaseBadge(pack: PackEntry): string {
  const base = versionOf(pack.name);
  if (!base) return badge("unreleased preview", "preview");
  const release = latestRelease(pack.name, base);
  return release ? badge(`v${release}`, "hot") : badge(`v${base}`);
}

function releaseLink(pack: PackEntry): string {
  return `${REPO}/releases?q=${encodeURIComponent(pack.name)}`;
}

function derivedFor(pack: string): string {
  if (pack === "aom") return aomSections();
  if (pack === "dps") return dpsSections();
  return "";
}

function packBody(pack: PackEntry, generatedAt: string): string {
  const { docs } = pack;
  const parts: string[] = [];
  parts.push(`<div class="hero">
  <h1>${esc(docs.title)}</h1>
  <p class="lead">${esc(docs.summary)}</p>
  <div class="badges">
    ${releaseBadge(pack)}
    ${badge(pack.name)}
    ${docs.preview ? badge("temporary preview pack", "preview") : ""}
    ${docs.preview ? "" : `<a href="${esc(releaseLink(pack))}">Releases</a>`}
    <a href="${REPO}/tree/main/packs/${esc(pack.name)}/src">Source</a>
  </div>
</div>`);

  if (docs.about?.length) {
    parts.push(section("about", "About", paragraphList(docs.about)));
  }
  if (docs.features?.length) {
    parts.push(section("features", "What it does", featureGrid(docs.features)));
  }
  if (docs.commands?.length) {
    parts.push(section("commands", "Commands", commandTable(docs.commands)));
  }
  parts.push(derivedFor(pack.name));
  if (docs.notes?.length) {
    parts.push(section("notes", "Good to know", noteList(docs.notes)));
  }
  parts.push(
    `<p class="muted">This page was generated from the pack's TypeScript on ${esc(
      generatedAt,
    )}; the code is the source of truth.</p>`,
  );
  return parts.join("\n");
}

function indexBody(nav: readonly NavPack[], generatedAt: string): string {
  const cards = nav
    .map((entry) => {
      const pack = packs.find((candidate) => candidate.name === entry.name)!;
      return `<article class="card packcard">
        <div>
          <h3>${esc(entry.title)}</h3>
          <p class="namespace">${esc(pack.name)} · data pack namespace</p>
        </div>
        <p>${esc(pack.docs.summary)}</p>
        <div class="badges">${releaseBadge(pack)}${pack.docs.preview ? badge("preview", "preview") : ""}</div>
        <div class="links">
          <a href="${esc(pack.name)}.html">Read the docs</a>
          ${pack.docs.preview ? "" : `<a href="${esc(releaseLink(pack))}">Download releases</a>`}
        </div>
      </article>`;
    })
    .join("");
  return `<div class="hero">
  <h1>Datapacks</h1>
  <p class="lead">Minecraft Java datapacks for Minecraft ${esc(
    latestVersion().id,
  )}, authored in TypeScript. Every page here is generated from the same sources that build the datapacks.</p>
</div>
${section("packs", "Datapacks", `<div class="grid">${cards}</div>`)}
<p class="muted">Generated on ${esc(generatedAt)}.</p>`;
}

function main(): void {
  const version = latestVersion();
  const generatedAt = `${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC`;
  const released = packs.filter((pack) => !pack.docs.preview);
  const preview = packs.filter((pack) => pack.docs.preview);
  const ordered = [...released, ...preview];
  const nav: NavPack[] = ordered.map((pack) => ({
    name: pack.name,
    title: pack.docs.title,
    preview: pack.docs.preview,
  }));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "style.css"), PAGE_CSS);

  const common = {
    nav,
    mcVersion: version.id,
    packFormat: `${version.packFormat[0]}.${version.packFormat[1]}`,
    generatedAt,
  };

  writeFileSync(
    join(outDir, "index.html"),
    layout({
      title: "Datapacks - documentation",
      description: "Documentation for the datapacks in this repository.",
      current: "index",
      body: indexBody(nav, generatedAt),
      ...common,
    }),
  );

  for (const pack of ordered) {
    writeFileSync(
      join(outDir, `${pack.name}.html`),
      layout({
        title: `${pack.docs.title} - Datapacks`,
        description: pack.docs.summary,
        current: pack.name,
        body: packBody(pack, generatedAt),
        ...common,
      }),
    );
  }

  console.log(`Wrote ${outDir} (${ordered.length + 1} pages)`);
}

main();
