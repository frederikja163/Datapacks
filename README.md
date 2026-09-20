# Datapacks

Minecraft Java datapacks for **Minecraft 26.3** (data pack format **121.0**), authored in **TypeScript** on top of a shared generator library.

The goal of the TypeScript pipeline is that generated commands are typed: invalid ids, malformed text components, and dangling function references fail at `bun run typecheck` instead of shipping a broken datapack. Updating to a new Minecraft version is a matter of updating the internal models in `mcgen/` (see [Version updates](#version-updates)).

## Layout

| Path | Description |
| --- | --- |
| `mcgen/` | Shared TypeScript library: datapack builder, typed text components, command helpers, version and registry models. |
| `packs/<name>/src/` | Source of one datapack per folder. Currently `aom`, `dps`, `imsp`, `soulbound` and `unbreakable`. |
| `packs/<name>/build/<name>/` | Generated datapack output (gitignored). |
| `scripts/` | `build.ts` (build packs), `deploy.ts` (copy builds into a world), `build-docs.ts` (generate the documentation site) and `gen-models.ts` (regenerate version models). |

## Requirements

- [Bun](https://bun.sh) (the build runs TypeScript directly)

## Commands

```sh
bun install

bun run build            # build every TypeScript pack
bun run build dps        # build a single pack
bun run deploy           # build and copy packs into a Minecraft world
bun run docs             # generate the documentation site into site/
bun run typecheck        # tsc --noEmit
bun run gen              # regenerate version models from misode/mcmeta
```

Generated output ends up in `packs/<name>/build/<name>/`. Zip the **contents** of that directory (not the folder) to get a valid datapack archive.

## Deploying to a world

`bun run deploy` builds every pack and copies the output into `<world>/datapacks/`. It reads the target from `deploy.config.json` in the repo root (gitignored — copy `deploy.config.example.json` to get started):

```json
{
  "savesDir": "~/.minecraft/saves",
  "world": "Datapacks"
}
```

- `world` — the world folder name under `savesDir`, or an absolute path to a world.
- `savesDir` — optional, defaults to `~/.minecraft/saves`.
- `packs` — optional array to deploy only some packs (for example `["dps"]`).

The deploy copies real files rather than symlinks, because Minecraft rejects symlinked datapacks. Run `/reload` in game afterwards.

## Documentation

`bun run docs` renders a static site into the gitignored `site/`. It is generated from the pack sources, not hand-written HTML:

- each pack's prose lives in `packs/<name>/src/docs.ts` (summary, features, commands, notes);
- structural sections are derived from the code itself: AOM's buildings, resources and advancement tree come from `packs/aom/src/registry.ts` and `packs/aom/src/tree.ts`, and DPS's skill tables come from `packs/dps/src/actions.ts`.

`.github/workflows/pages.yml` builds the site on every push to `main` and deploys it to GitHub Pages. No generated HTML is committed; edit the TypeScript and the page follows.

One-time setup: in the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. After that the workflow publishes every push to `main`.

## Adding a datapack

1. Create `packs/<name>/src/index.ts` exporting `build(): Datapack`.
2. Register it in `scripts/packs.ts`.
3. Add `packs/<name>/src/docs.ts` exporting a `PackDocs` (the type comes from `mcgen/src/index.ts`).
4. Add `packs/<name>/VERSION` with a `MAJOR.MINOR` base — packs without a version file are not released.
5. Run `bun run build <name>` and `bun run docs`.

## Version updates

1. `bun run gen` — refreshes `mcgen/src/models/versions.generated.ts` with every stable release and its data pack format. `latestVersion()` picks the newest.
2. Update the registry models in `mcgen/src/models/index.ts` (items, blocks, effects, sounds, entity types, equipment slots) to match the new version.
3. Run `bun run typecheck`. Every place that references a removed or renamed id now fails to compile.
4. Rebuild and diff `packs/*/build` against the previous output before committing.

## Versioning

Each released project has a `VERSION` file at `packs/<name>/VERSION` containing its base version as `MAJOR.MINOR` (for example `1.0`). The release workflow only considers packs that have a version file, so this doubles as the "is this pack releasable?" switch. `aom` starts at `0.1`.

Releases are automatic and patch-incrementing. The workflow counts the existing git tags for the current base (`<pack>-<base>.*`) and uses that count as the patch:

- `VERSION` = `1.0`, no prior releases → `dps-1.0.0`
- After three releases of `1.0` → next is `dps-1.0.3`

To start a new minor or major line, edit the `VERSION` file (e.g. to `1.1`); the patch counter starts at `.0` again.

Pick the line by the size of the change:

| Change | Bump | How |
| --- | --- | --- |
| Small fix, balance tweak or wording | **Patch** (`1.1.0` → `1.1.1`) | Automatic — leave `VERSION` alone |
| New, backwards-compatible feature (skill, powerup, command) | **Minor** (`1.1` → `1.2`) | Edit `VERSION` to the new `MAJOR.MINOR` |
| Breaking change that needs an uninstall before upgrading | **Major** (`1.1` → `2.0`) | Edit `VERSION` and call it out in the release notes |

- A **patch** only fixes or tunes existing behaviour, so the release workflow bumps it for you.
- A **minor** adds content. It is installed over the previous version in place; leftover objectives or storage are tolerated.
- A **major** changes state or formats incompatibly. Players must run the pack's uninstall function and remove the old datapack before installing the new one, so mention it in the release notes.

## Releases

`.github/workflows/release.yml` runs on pushes to `main`. It detects which packs changed and publishes a GitHub release per pack. Only packs under `packs/*` that have a `VERSION` file are eligible.

- Packs are built with `bun run build <pack>` and zipped from `packs/<pack>/build/<pack>/`.
- Changes to `mcgen/`, `scripts/` or the root toolchain files rebuild every pack.

Each release is tagged `<pack>-<version>` (for example `dps-1.0.0`) using the `VERSION` file described above. Release assets always have `pack.mcmeta` at the root of the zip.
