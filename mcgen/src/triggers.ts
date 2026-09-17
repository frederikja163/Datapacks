// Trigger objective dispatch.
//
// `/trigger` lets non-operators set a score on themselves. Every tick the
// dispatcher runs each handler as the players whose score matches, then zeroes
// and re-enables the objectives. Zeroing with `set ... 0` (rather than a reset)
// matters: `/trigger` fails for players who are not on the objective, so every
// player must keep a score entry in it.
//
// `at @s` matters just as much: `as` changes only the executor, so without it
// handlers would run at the tick function's default location, rotation and
// dimension instead of the player's, breaking every raycast and `~ ~ ~` use.

import type { FunctionRef, Lines } from "./pack.ts";

export interface TriggerConfig {
  /** Trigger objective, e.g. `aom.help`. */
  readonly objective: string;
  /** Function run as each triggering player. */
  readonly handler: FunctionRef;
  /** Score range that triggers dispatch. Defaults to `1..`. */
  readonly match?: string;
}

export function triggerDispatch(
  triggers: readonly TriggerConfig[],
): Lines {
  const dispatch: string[] = [];
  const objectives: string[] = [];
  for (const trigger of triggers) {
    dispatch.push(
      `execute as @a[scores={${trigger.objective}=${trigger.match ?? "1.."}}] at @s run function ${trigger.handler.name}`,
    );
    if (!objectives.includes(trigger.objective)) {
      objectives.push(trigger.objective);
    }
  }
  if (dispatch.length === 0) return [];

  return [
    ...dispatch,
    "",
    ...objectives.map(
      (objective) => `scoreboard players set @a ${objective} 0`,
    ),
    "",
    ...objectives.map((objective) => `scoreboard players enable @a ${objective}`),
  ];
}
