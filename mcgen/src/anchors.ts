// Anchor marker helpers.
//
// Every building has a marker entity at its anchor block carrying
// `{Tags:["aom_anchor"], data:{aom:{town, building}}}`. Markers are positioned
// at the block center (`x.5 y.5 z.5`) so block-volume lookups from an aligned
// position select them.

import type { EntityId } from "./models/index.ts";

export const MARKER: EntityId = "minecraft:marker";
export const DEFAULT_ANCHOR_TAG = "aom_anchor";

export interface AnchorData {
  readonly town: string;
  /** Numeric building id, or a macro reference such as `$(id)`. */
  readonly building: number | string;
  /** Building type id; lets menus dispatch without macro arguments. */
  readonly type?: string;
}

export interface BlockPos {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Selector for every anchor marker (loaded chunks only). */
export function anchors(tag: string = DEFAULT_ANCHOR_TAG): string {
  return `@e[type=${MARKER},tag=${tag}]`;
}

/**
 * Selector for the anchor at a block. Without a position this must be used
 * from a position aligned to the anchor block (volume selectors are relative
 * to the execution position).
 */
export function findAnchorAt(
  pos?: BlockPos,
  tag: string = DEFAULT_ANCHOR_TAG,
): string {
  const where = pos ? `x=${pos.x},y=${pos.y},z=${pos.z},` : "";
  return `@e[type=${MARKER},tag=${tag},${where}dx=1,dy=1,dz=1,limit=1]`;
}

/** Selector for a specific building's anchor. */
export function anchorOf(
  data: AnchorData,
  tag: string = DEFAULT_ANCHOR_TAG,
): string {
  return `@e[type=${MARKER},tag=${tag},nbt={data:{aom:{town:"${data.town}",building:${data.building}}}}]`;
}

/** `summon` command placing an anchor marker at `pos`. */
export function summonAnchor(
  pos: string,
  data: AnchorData,
  tag: string = DEFAULT_ANCHOR_TAG,
): string {
  const type = data.type ? `,type:"${data.type}"` : "";
  return `summon ${MARKER} ${pos} {Tags:["${tag}"],data:{aom:{town:"${data.town}",building:${data.building}${type}}}}`;
}
