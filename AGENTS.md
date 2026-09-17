# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this repo is

Minecraft Java datapacks generated from TypeScript. One shared library (`mcgen/`) plus one entry point per datapack (`packs/<name>/src/index.ts`). Output is plain `.mcfunction` files and JSON resources — there is no runtime dependency on TypeScript.

## Commands

```sh
bun install
bun run typecheck        # must pass before committing
bun run build            # build all TypeScript packs
bun run build <name>     # build one pack (aom, dps, imsp, unbreakable)
bun run deploy           # build and copy packs into the world in deploy.config.json (needs that file)
bun run gen              # regenerate mcgen/src/models/versions.generated.ts
```

Generated output lives in `packs/<name>/build/<name>/` and is gitignored. Never edit it by hand.

## Conventions

- **Author packs in TypeScript.** Do not add hand-written `.mcfunction` files to `packs/*`; generate them from `src/index.ts`. If a command has no helper yet, add one to `mcgen/src/commands.ts` or use a plain string in the generator.
- **Use the typed text components** from `mcgen/src/text.ts` (`text`, `score`, `selector`, `nbt`, `snbt`). They model the post-1.21.5 format: `hover_event` / `click_event`, `hover_event.show_text.value`, `click_event.run_command.command`. Never emit the legacy `hoverEvent` / `clickEvent` / `contents` fields.
- **Reference functions through `FunctionRef`s.** `d.defineFunction()` returns a handle; build call lines from `ref.name`. This catches typos and dangling references. Raw `dps:foo/bar` strings are only acceptable inside macro bodies where a runtime macro is required.
- **Registry ids are typed.** If you need a new item/block/effect/sound/entity id, add it to `mcgen/src/models/index.ts` first. This is the "internal model" that gets updated for new Minecraft versions.
- **One pack per folder** under `packs/`, registered in `scripts/packs.ts`. The pack namespace must match the folder name.
- **Deploy when it is set up.** If `deploy.config.json` exists, run `bun run deploy` after a successful build so your changes reach the configured test world (the script rebuilds and copies; it does not run `/reload`). Deploy before telling the user a change is ready to try.
- **Versions come from `VERSION` files** (`packs/<name>/VERSION`) containing a `MAJOR.MINOR` base. The release workflow appends the existing tag count as the patch; never rename or hand-edit release tags. Bump the base file to start a new minor/major line.
- `mcgen/` is shared: changes there rebuild and can affect every pack, so run `bun run typecheck` and `bun run build` after editing it.

## Verifying changes

- `bun run typecheck` and `bun run build` must both succeed.
- If `deploy.config.json` exists, finish with `bun run deploy` so the test world is updated, and tell the user to `/reload` in game.
- For ports/migrations, compare generated output against the previous datapack semantically (normalize whitespace and JSON key order) rather than trusting a visual diff.
- Validate generated JSON: `python3 -c "import json,sys; json.load(open(sys.argv[1]))" <file>` for every emitted `.json`.
- Watch for the classic mistakes seen in this repo's history: function names ending in `/` are real (`.mcfunction` files inside a directory), macro functions must be called with all their arguments, and slot names differ (`armor.*` vs `weapon.*`).

## Adding a pack

1. `packs/<name>/src/index.ts` exporting `build(): Datapack`.
2. Import helpers from `../../../mcgen/src/index.ts`.
3. Register in `scripts/packs.ts`.
4. `bun run typecheck && bun run build <name>`.

## Version updates

1. `bun run gen` to refresh `versions.generated.ts`.
2. Update `mcgen/src/models/index.ts` for registry changes.
3. `bun run typecheck` — compiler errors point at every call site that needs updating.
4. Rebuild all packs and review the diff.
