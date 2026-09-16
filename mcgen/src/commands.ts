import type { EntityId, ItemId } from "./models/index.ts";
import type { FunctionRef } from "./pack.ts";
import { snbt, type TextComponent } from "./text.ts";

export type Target = "@a" | "@e" | "@p" | "@r" | "@s";

export interface SelectorOptions {
  type?: EntityId;
  tag?: string;
  nbt?: string;
  scores?: Record<string, string | number>;
  distance?: string;
  limit?: number;
  sort?: "nearest" | "furthest" | "random" | "arbitrary";
  gamemode?: string;
}

export function sel(base: Target, options: SelectorOptions = {}): string {
  const args: string[] = [];
  if (options.type) args.push(`type=${options.type}`);
  if (options.tag) args.push(`tag=${options.tag}`);
  if (options.nbt) args.push(`nbt=${options.nbt}`);
  if (options.scores) {
    const scores = Object.entries(options.scores)
      .map(([objective, value]) => `${objective}=${value}`)
      .join(",");
    args.push(`scores={${scores}}`);
  }
  if (options.distance) args.push(`distance=${options.distance}`);
  if (options.limit !== undefined) args.push(`limit=${options.limit}`);
  if (options.sort) args.push(`sort=${options.sort}`);
  if (options.gamemode) args.push(`gamemode=${options.gamemode}`);
  return args.length ? `${base}[${args.join(",")}]` : base;
}

export function call(ref: FunctionRef, withClause?: string): string {
  return `function ${ref.name}${withClause ? ` with ${withClause}` : ""}`;
}

/** Calls a macro function with an inline arguments compound. */
export function callWith(
  ref: FunctionRef,
  args: Record<string, string | number>,
): string {
  return `function ${ref.name} ${JSON.stringify(args)}`;
}

export function tellraw(target: string, message: TextComponent): string {
  return `tellraw ${target} ${snbt(message)}`;
}

export function actionbar(target: string, message: TextComponent): string {
  return `title ${target} actionbar ${snbt(message)}`;
}

export function giveEffect(
  target: string,
  effect: string,
  duration: string | number,
  amplifier: string | number,
): string {
  return `effect give ${target} ${effect} ${duration} ${amplifier}`;
}

export function playsound(
  sound: string,
  source: string,
  target: string,
  coords: string,
  volume = 1,
  pitch = 1,
  minVolume = 0,
): string {
  return `playsound ${sound} ${source} ${target} ${coords} ${volume} ${pitch} ${minVolume}`;
}

export function itemModify(
  target: string,
  slot: string,
  modifier: string,
): string {
  return `item modify entity ${target} ${slot} ${modifier}`;
}

export function summonItem(
  coords: string,
  item: ItemId,
  count = 1,
): string {
  return `summon minecraft:item ${coords} {Item: {id: "${item}", count: ${count}}}`;
}

export function objectiveAdd(objective: string, criteria: string): string {
  return `scoreboard objectives add ${objective} ${criteria}`;
}

export function enableTrigger(target: string, objective: string): string {
  return `scoreboard players enable ${target} ${objective}`;
}

// ---------------------------------------------------------------------------
// Scoreboard players
// ---------------------------------------------------------------------------

export function scoreSet(
  holder: string,
  objective: string,
  value: string | number,
): string {
  return `scoreboard players set ${holder} ${objective} ${value}`;
}

export function scoreAdd(
  holder: string,
  objective: string,
  value: string | number,
): string {
  return `scoreboard players add ${holder} ${objective} ${value}`;
}

export function scoreRemove(
  holder: string,
  objective: string,
  value: string | number,
): string {
  return `scoreboard players remove ${holder} ${objective} ${value}`;
}

export function scoreReset(holder: string, objective: string): string {
  return `scoreboard players reset ${holder} ${objective}`;
}

export function scoreGet(holder: string, objective: string): string {
  return `scoreboard players get ${holder} ${objective}`;
}

export type ScoreOperator = "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<" | ">";

export function scoreOperation(
  holder: string,
  objective: string,
  operator: ScoreOperator,
  sourceHolder: string,
  sourceObjective: string,
): string {
  return `scoreboard players operation ${holder} ${objective} ${operator} ${sourceHolder} ${sourceObjective}`;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export type DataTarget =
  | `storage ${string}`
  | `entity ${string}`
  | `block ${string}`;

export function dataGet(
  target: DataTarget,
  path: string,
  scale?: number,
): string {
  return `data get ${target} ${path}${scale !== undefined ? ` ${scale}` : ""}`;
}

export function dataRemove(target: DataTarget, path: string): string {
  return `data remove ${target} ${path}`;
}

export function dataSetValue(
  target: DataTarget,
  path: string,
  value: string | number | boolean | unknown[] | Record<string, unknown>,
): string {
  return `data modify ${target} ${path} set value ${literal(value)}`;
}

export function dataSetFrom(
  target: DataTarget,
  path: string,
  source: string,
): string {
  return `data modify ${target} ${path} set from ${source}`;
}

export function dataAppendValue(
  target: DataTarget,
  path: string,
  value: string | number | boolean | unknown[] | Record<string, unknown>,
): string {
  return `data modify ${target} ${path} append value ${literal(value)}`;
}

export function dataMerge(target: DataTarget, value: unknown): string {
  return `data merge ${target} ${literal(value)}`;
}

function literal(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Flow control
// ---------------------------------------------------------------------------

export function returnFail(): string {
  return "return fail";
}

export function returnValue(value: number): string {
  return `return ${value}`;
}

export function returnRun(command: string): string {
  return `return run ${command}`;
}

export function scheduleFunction(
  ref: FunctionRef,
  time: string,
  mode: "replace" | "append" = "replace",
): string {
  return `schedule function ${ref.name} ${time} ${mode}`;
}

// ---------------------------------------------------------------------------
// Inventory / recipes
// ---------------------------------------------------------------------------

export function give(target: string, item: ItemId, count = 1): string {
  return `give ${target} ${item} ${count}`;
}

export function clear(target: string, item: ItemId, count = 1): string {
  return `clear ${target} ${item} ${count}`;
}

export function recipeGive(target: string, recipe: string): string {
  return `recipe give ${target} ${recipe}`;
}

export function recipeTake(target: string, recipe: string): string {
  return `recipe take ${target} ${recipe}`;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export function summon(
  type: EntityId,
  pos: string,
  nbt?: string,
): string {
  return `summon ${type} ${pos}${nbt ? ` ${nbt}` : ""}`;
}

export function setblock(
  pos: string,
  block: string,
  mode: "destroy" | "keep" | "replace" = "replace",
): string {
  return `setblock ${pos} ${block} ${mode}`;
}

export function kill(target: string): string {
  return `kill ${target}`;
}

export function trigger(
  target: string,
  objective: string,
  mode?: "add" | "set",
  value?: number,
): string {
  const tail = mode ? ` ${mode}${value !== undefined ? ` ${value}` : ""}` : "";
  return `trigger ${target} ${objective}${tail}`;
}

export function ifLoaded(pos: string, command: string): string {
  return `execute if loaded ${pos} run ${command}`;
}
