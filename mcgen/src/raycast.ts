// A reusable raycast pair generated per use.
//
// `start` is called as the caster (typically `execute anchored eyes run
// function ...`) with `on_hit` and `on_miss` macro arguments. It steps `step`
// blocks along the view vector up to `maxSteps` times and calls `on_hit` at the
// first position where the block predicate matches, or `on_miss` when the steps
// are exhausted. `start` returns fail when no hit was found.
//
// Note: `execute if/unless function` cannot pass macro arguments, so the miss
// callback is wired through the ray itself rather than checked by the caller.

import type { Datapack, FunctionRef } from "./pack.ts";

export interface RaycastOptions {
  /** Function path prefix, e.g. `internal/ray/signs`. */
  readonly path: string;
  /** Block predicate tested at every step, e.g. `#aom:signs`. */
  readonly test: string;
  /** Objective holding the per-caster remaining-step counter. */
  readonly objective: string;
  readonly maxSteps?: number;
  readonly step?: number;
}

export interface Raycast {
  readonly start: FunctionRef;
  readonly step: FunctionRef;
  /** No-op used when a caller does not want a miss message. */
  readonly miss: FunctionRef;
}

export function raycast(d: Datapack, options: RaycastOptions): Raycast {
  const maxSteps = options.maxSteps ?? 50;
  const step = options.step ?? 0.1;
  const stepRef = d.ref(`${options.path}/step`);
  const recurse = `function ${stepRef.name} {on_hit: "$(on_hit)", on_miss: "$(on_miss)"}`;

  const miss = d.defineFunction(`${options.path}/miss`, []);

  const start = d.defineFunction(`${options.path}/start`, [
    `$scoreboard players set @s ${options.objective} ${maxSteps}`,
    `$return run ${recurse}`,
  ]);

  const stepFn = d.defineFunction(`${options.path}/step`, [
    `$scoreboard players remove @s ${options.objective} 1`,
    `$execute if score @s ${options.objective} matches ..0 run function $(on_miss)`,
    `$execute if score @s ${options.objective} matches ..0 run return fail`,
    `$execute if block ~ ~ ~ ${options.test} run function $(on_hit)`,
    `$execute if block ~ ~ ~ ${options.test} run return 1`,
    `$execute unless block ~ ~ ~ ${options.test} positioned ^ ^ ^${step} run ${recurse}`,
  ]);

  return { start, step: stepFn, miss };
}

/**
 * Calls a ray from the executor's eyes with `onHit` (and optional `onMiss`) as
 * callbacks. The caller is responsible for having the caster's position,
 * rotation and dimension in context (`at @s`); `as` alone is not enough.
 */
export function castRay(
  ray: Raycast,
  onHit: FunctionRef,
  onMiss?: FunctionRef,
): string {
  const miss = (onMiss ?? ray.miss).name;
  return `execute anchored eyes run function ${ray.start.name} {on_hit: "${onHit.name}", on_miss: "${miss}"}`;
}
