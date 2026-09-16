// Typed text components (the post-1.21.5 SNBT/object form).
//
// `snbt()` serializes them for use in commands. Because the shape is modelled
// with discriminated unions, an invalid component (e.g. a stale `hoverEvent`
// or `clickEvent` field) fails at compile time instead of silently building.

export type Color =
  | "black"
  | "dark_blue"
  | "dark_green"
  | "dark_aqua"
  | "dark_red"
  | "dark_purple"
  | "gold"
  | "gray"
  | "dark_gray"
  | "blue"
  | "green"
  | "aqua"
  | "red"
  | "light_purple"
  | "yellow"
  | "white"
  | `#${string}`;

export interface ClickEvent {
  action:
    | "run_command"
    | "suggest_command"
    | "open_url"
    | "copy_to_clipboard"
    | "change_page"
    | "show_dialog";
  command?: string;
  url?: string;
  value?: string;
  page?: number;
}

export interface HoverEvent {
  action: "show_text" | "show_item" | "show_entity";
  value?: TextComponent;
  id?: string;
  count?: number;
  uuid?: number[] | string;
  name?: TextComponent;
}

export interface Style {
  color?: Color;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  insertion?: string;
  font?: string;
  click_event?: ClickEvent;
  hover_event?: HoverEvent;
}

export type TextNode = Style &
  (
    | { text: string }
    | { translate: string; with?: TextComponent[]; fallback?: string }
    | { score: { name: string; objective: string } }
    | { selector: string; separator?: TextComponent }
    | {
        nbt: string;
        storage?: string;
        entity?: string;
        block?: string;
        interpret?: boolean;
        plain?: boolean;
        separator?: TextComponent;
      }
  );

export type TextComponent = string | TextNode | TextComponent[];

export const text = (value: string, style: Style = {}): TextNode => ({
  text: value,
  ...style,
});

export const score = (
  name: string,
  objective: string,
  style: Style = {},
): TextNode => ({ score: { name, objective }, ...style });

export const selector = (target: string, style: Style = {}): TextNode => ({
  selector: target,
  ...style,
});

export const nbt = (
  path: string,
  source: { storage?: string; entity?: string; block?: string },
  style: Style & { interpret?: boolean } = {},
): TextNode => ({ nbt: path, ...source, ...style });

export const snbt = (component: TextComponent): string =>
  JSON.stringify(component);
