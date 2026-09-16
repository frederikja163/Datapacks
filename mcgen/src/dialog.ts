// Typed dialog definitions (the `minecraft:dialog` registry, 1.21.6+).
//
// Dialogs are plain JSON resources under `data/<namespace>/dialog/<name>.json`.
// The shapes here mirror the vanilla `dialog_type` / `input_control_type`
// registries; `Datapack.dialog()` writes the JSON.

import type { ItemId } from "./models/index.ts";
import type { TextComponent } from "./text.ts";

export interface DialogItem {
  id: ItemId;
  count?: number;
  components?: Record<string, unknown>;
}

export type DialogBody =
  | { type: "minecraft:plain_message"; contents: TextComponent; width?: number }
  | {
      type: "minecraft:item";
      item: DialogItem;
      description?: TextComponent;
      show_decoration?: boolean;
      show_tooltip?: boolean;
      width?: number;
      height?: number;
    };

export interface TextInput {
  type: "minecraft:text";
  key: string;
  label: TextComponent;
  width?: number;
  label_visible?: boolean;
  initial?: string;
  max_length?: number;
  multiline?: { max_lines?: number; height?: number };
}

export interface BooleanInput {
  type: "minecraft:boolean";
  key: string;
  label: TextComponent;
  initial?: boolean;
  on_true?: string;
  on_false?: string;
}

export interface SingleOptionInput {
  type: "minecraft:single_option";
  key: string;
  label: TextComponent;
  label_visible?: boolean;
  width?: number;
  options: Array<{
    id: string;
    display?: TextComponent;
    initial?: boolean;
  }>;
}

export interface NumberRangeInput {
  type: "minecraft:number_range";
  key: string;
  label: TextComponent;
  label_format?: string;
  width?: number;
  start: number;
  end: number;
  step?: number;
  initial?: number;
}

export type DialogInput =
  | TextInput
  | BooleanInput
  | SingleOptionInput
  | NumberRangeInput;

export type DialogAction =
  | { type: "open_url"; url: string }
  | { type: "run_command"; command: string }
  | { type: "suggest_command"; command: string }
  | { type: "change_page"; page: number }
  | { type: "copy_to_clipboard"; value: string }
  | { type: "show_dialog"; dialog: string | Dialog }
  | { type: "custom"; id: string; payload?: string }
  | { type: "dynamic/run_command"; template: string }
  | {
      type: "dynamic/custom";
      id: string;
      additions?: Record<string, unknown>;
    };

export interface DialogButton {
  label: TextComponent;
  tooltip?: TextComponent;
  width?: number;
  action?: DialogAction;
}

interface DialogCommon {
  title: TextComponent;
  external_title?: TextComponent;
  body?: DialogBody | DialogBody[];
  inputs?: DialogInput[];
  can_close_with_escape?: boolean;
  pause?: boolean;
  after_action?: "close" | "none" | "wait_for_response";
}

export interface NoticeDialog extends DialogCommon {
  type: "minecraft:notice";
  action?: DialogButton;
}

export interface ConfirmationDialog extends DialogCommon {
  type: "minecraft:confirmation";
  yes: DialogButton;
  no: DialogButton;
}

export interface MultiActionDialog extends DialogCommon {
  type: "minecraft:multi_action";
  actions: DialogButton[];
  columns?: number;
  exit_action?: DialogButton;
}

export interface ServerLinksDialog extends DialogCommon {
  type: "minecraft:server_links";
  columns?: number;
  button_width?: number;
  exit_action?: DialogButton;
}

export interface DialogListDialog extends DialogCommon {
  type: "minecraft:dialog_list";
  dialogs: Array<string | Dialog>;
  columns?: number;
  button_width?: number;
  exit_action?: DialogButton;
}

export type Dialog =
  | NoticeDialog
  | ConfirmationDialog
  | MultiActionDialog
  | ServerLinksDialog
  | DialogListDialog;

export function runCommand(command: string): DialogAction {
  return { type: "run_command", command };
}

export function showDialog(dialog: string | Dialog): DialogAction {
  return { type: "show_dialog", dialog };
}

export function button(
  label: TextComponent,
  action?: DialogAction,
  extra: Omit<DialogButton, "label" | "action"> = {},
): DialogButton {
  return { label, ...extra, ...(action ? { action } : {}) };
}

export function body(
  contents: TextComponent,
  width?: number,
): DialogBody {
  return {
    type: "minecraft:plain_message",
    contents,
    ...(width !== undefined ? { width } : {}),
  };
}

/** A "close"/"cancel" button that simply exits the dialog. */
export function exitButton(label: TextComponent): DialogButton {
  return { label };
}
