import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { packs } from "./packs.ts";

interface DeployConfig {
  /** Directory containing worlds. Defaults to `~/.minecraft/saves`. */
  savesDir?: string;
  /** World folder name under `savesDir`, or an absolute path to the world. */
  world: string;
  /** Optional subset of packs to deploy. Defaults to every pack. */
  packs?: string[];
  /** Directory resource packs are installed to. Defaults to the sibling
   *  `resourcepacks` folder of `savesDir`. */
  resourcepacksDir?: string;
}

const CONFIG_FILE = "deploy.config.json";

function fail(message: string): never {
  console.error(`deploy: ${message}`);
  process.exit(1);
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function readConfig(): DeployConfig {
  const path = resolve(CONFIG_FILE);
  if (!existsSync(path)) {
    fail(
      `no ${CONFIG_FILE} found. Copy deploy.config.example.json to ${CONFIG_FILE} and set your world.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`could not parse ${CONFIG_FILE}: ${(error as Error).message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail(`${CONFIG_FILE} must contain a JSON object.`);
  }

  const config = parsed as Record<string, unknown>;
  if (typeof config.world !== "string" || config.world.length === 0) {
    fail(`${CONFIG_FILE} must contain a non-empty "world" string.`);
  }
  if (config.savesDir !== undefined && typeof config.savesDir !== "string") {
    fail(`${CONFIG_FILE} "savesDir" must be a string.`);
  }
  if (
    config.packs !== undefined &&
    (!Array.isArray(config.packs) ||
      config.packs.some((name) => typeof name !== "string"))
  ) {
    fail(`${CONFIG_FILE} "packs" must be an array of pack names.`);
  }
  if (
    config.resourcepacksDir !== undefined &&
    typeof config.resourcepacksDir !== "string"
  ) {
    fail(`${CONFIG_FILE} "resourcepacksDir" must be a string.`);
  }

  return config as unknown as DeployConfig;
}

function removePath(path: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) unlinkSync(path);
  else rmSync(path, { recursive: true, force: true });
}

const config = readConfig();

const savesDir = config.savesDir
  ? expandHome(config.savesDir)
  : join(homedir(), ".minecraft", "saves");
const expandedWorld = expandHome(config.world);
const world = isAbsolute(expandedWorld)
  ? expandedWorld
  : resolve(savesDir, expandedWorld);

if (!existsSync(world)) {
  fail(`world not found: ${world}`);
}
if (!existsSync(join(world, "level.dat"))) {
  fail(`not a Minecraft world (no level.dat): ${world}`);
}

const datapacksDir = join(world, "datapacks");
mkdirSync(datapacksDir, { recursive: true });

const resourcepacksDir = config.resourcepacksDir
  ? expandHome(config.resourcepacksDir)
  : join(dirname(savesDir), "resourcepacks");

const selected = config.packs
  ? config.packs.map((name) => {
      const entry = packs.find((pack) => pack.name === name);
      if (!entry) fail(`unknown pack in ${CONFIG_FILE}: ${name}`);
      return entry;
    })
  : packs;

const wantsResourcePack = selected.some((entry) => entry.resourcePack);
if (wantsResourcePack) mkdirSync(resourcepacksDir, { recursive: true });

console.log(`Deploying to ${world}`);
for (const { name, build, resourcePack } of selected) {
  const pack = build();
  const source = join("packs", name, "build", pack.namespace);
  pack.writeTo(source);

  const dest = join(datapacksDir, pack.namespace);
  removePath(dest);
  cpSync(source, dest, { recursive: true });
  console.log(`  ${pack.namespace} -> ${dest}`);

  if (resourcePack) {
    const rp = resourcePack();
    const rpSource = join("packs", name, "build", `${rp.namespace}-rp`);
    rp.writeTo(rpSource);
    const rpDest = join(resourcepacksDir, `${rp.namespace}-rp`);
    removePath(rpDest);
    cpSync(rpSource, rpDest, { recursive: true });
    console.log(`  ${rp.namespace}-rp -> ${rpDest}`);
  }
}
console.log(`Done. Run /reload in game to apply.`);
if (wantsResourcePack) {
  console.log(
    `Custom plan icons: enable the "aom-rp" resource pack in Options > Resource Packs.`,
  );
}
