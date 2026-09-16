// Trigger objective dispatch.
//
// `/trigger` lets non-operators set a score on themselves. Every tick the
// dispatcher runs each handler as the players whose score matches, then resets
// and re-enables the objectives so they can be used again.

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
      `execute as @a[scores={${trigger.objective}=${trigger.match ?? "1.."}}] run function ${trigger.handler.name}`,
    );
    if (!objectives.includes(trigger.objective)) {
      objectives.push(trigger.objective);
    }
  }
  if (dispatch.length === 0) return [];

  return [
    ...dispatch,
    "",
    ...objectives.map((objective) => `scoreboard players reset @a ${objective}`),
    "",
    ...objectives.map((objective) => `scoreboard players enable @a ${objective}`),
  ];
}
