import type { EntityId, ItemId } from "./models/index.ts";
import type { FunctionRef } from "./pack.ts";
import { snbt, type TextComponent } from "./text.ts";

export type Target = "@a" | "@e" | "@p" | "@r" | "@s";

export interface SelectorOptions {
  type?: EntityId;
  tag?: string;
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
