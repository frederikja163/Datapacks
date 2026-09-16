// Sign and lectern book helpers.
//
// 26.3 sign text is stored as a list of four text components under
// `front_text.messages`. Plain strings are valid components, and plain strings
// are all new signs resolve (dynamic components are not resolved by the game),
// so rendered sign text must be baked as literal strings before it is written.

import { snbt, type TextComponent } from "./text.ts";

export const SIGN_LINES = 4;

/** `data modify block <pos> front_text.messages set value [...]`. */
export function setSignText(pos: string, lines: readonly string[]): string {
  if (lines.length > SIGN_LINES) {
    throw new Error(`A sign has ${SIGN_LINES} lines`);
  }
  const padded = [...lines];
  while (padded.length < SIGN_LINES) padded.push("");
  return `data modify block ${pos} front_text.messages set value ${snbt(padded)}`;
}

/** Locks the sign so players cannot edit it. */
export function waxSign(pos: string): string {
  return `data modify block ${pos} is_waxed set value true`;
}

/** NBT path to one of a sign's front lines. */
export function signLinePath(line: number): string {
  if (line < 0 || line >= SIGN_LINES) {
    throw new Error(`Sign line ${line} is out of range`);
  }
  return `front_text.messages[${line}]`;
}

/** Copies a sign line into storage so a macro can read it. */
export function readSignLine(
  storageTarget: string,
  storePath: string,
  pos: string,
  line: number,
): string {
  return `data modify ${storageTarget} ${storePath} set from block ${pos} ${signLinePath(line)}`;
}

export interface WrittenBookContent {
  title: TextComponent;
  author: string;
  pages: TextComponent[];
  /** When false the game resolves components as the book is placed. Defaults to false. */
  resolved?: boolean;
}

/** The `minecraft:written_book_content` component value. */
export function writtenBookContent(
  content: WrittenBookContent,
): Record<string, unknown> {
  return {
    "minecraft:written_book_content": {
      title: content.title,
      author: content.author,
      pages: content.pages,
      resolved: content.resolved ?? false,
    },
  };
}

/** A complete written book item, as stored in a lectern's `Book` tag. */
export function writtenBook(
  content: WrittenBookContent,
): Record<string, unknown> {
  return {
    id: "minecraft:written_book",
    count: 1,
    components: writtenBookContent(content),
  };
}

/** Writes a written book onto a lectern at `pos`. */
export function setLecternBook(
  pos: string,
  content: WrittenBookContent,
): string {
  return `data modify block ${pos} Book set value ${JSON.stringify(writtenBook(content))}`;
}
