import { existsSync } from "node:fs";
import { ResourcePack, latestVersion } from "../../../mcgen/src/index.ts";
import { encodePng } from "./png.ts";
import { BUILDINGS, planModelKey, type BuildingType, type Category } from "./registry.ts";

// ---------------------------------------------------------------------------
// AOM plan icon resource pack
//
// Plans borrow a distinct vanilla item model (`minecraft:item_model`) so they
// are told apart without any client-side pack. This pack upgrades those icons
// to custom art: it overrides each borrowed item's item-model definition with a
// `select` keyed on the plan's `custom_model_data` string. The `select`
// fallback reproduces the vanilla model verbatim, so ordinary items are
// unchanged and, crucially, when the pack is *not* installed the borrowed
// vanilla icon still renders (the "fallback to vanilla icons" behaviour).
//
// Drop a real 16x16 PNG at
//   packs/aom/resourcepack/textures/item/plan/<building>.png
// to replace the generated placeholder for that building.
// ---------------------------------------------------------------------------

/** The vanilla raw model each borrowed icon falls back to. Most icons resolve
 *  to `minecraft:item/<name>`; these are the block items that do not. */
const ICON_MODELS: Record<string, string> = {
  anvil: "minecraft:block/anvil",
  bookshelf: "minecraft:block/bookshelf",
  crafting_table: "minecraft:block/crafting_table",
  deepslate: "minecraft:block/deepslate",
  end_stone: "minecraft:block/end_stone",
  hay_block: "minecraft:block/hay_block",
  iron_block: "minecraft:block/iron_block",
  jukebox: "minecraft:block/jukebox",
  lodestone: "minecraft:block/lodestone",
  stonecutter: "minecraft:block/stonecutter",
  white_wool: "minecraft:block/white_wool",
};

function vanillaModel(item: string): string {
  const name = item.slice("minecraft:".length);
  return ICON_MODELS[name] ?? `minecraft:item/${name}`;
}

/** Three-letter code shown on each generated placeholder icon. */
const PLAN_CODES: Record<string, string> = {
  townhall: "TWN",
  townhouse: "HSE",
  lumbermill: "LBR",
  mine: "MNE",
  quarry: "QRY",
  docks: "DCK",
  ice_house: "ICE",
  stone_cutter: "STN",
  blacksmith: "BSM",
  gold_smith: "GLD",
  jeweller: "JWL",
  coppersmith: "CPR",
  kiln: "KLN",
  masons_yard: "MAS",
  farm: "FRM",
  windmill: "WND",
  barn: "BRN",
  leather_tanner: "LTN",
  shepherd: "SHP",
  spinnery: "SPN",
  weaver: "WVR",
  apiary: "APY",
  baker: "BKR",
  butcher: "BCH",
  brewery: "BRW",
  fisher: "FSH",
  weapon_smith: "WPN",
  fletcher: "FLC",
  glass_blower: "GLS",
  painter: "PNT",
  redstone_workshop: "RST",
  bard: "BRD",
  armory: "ARM",
  library: "LIB",
  school: "SCH",
  university: "UNI",
  cartographers_guild: "MAP",
  end_observatory: "END",
  custom: "CST",
};

const CATEGORY_COLORS: Record<Category, readonly [number, number, number]> = {
  Civic: [74, 144, 217],
  Extraction: [139, 111, 71],
  Industry: [158, 158, 158],
  Agriculture: [124, 179, 66],
  Husbandry: [214, 138, 173],
  Food: [230, 184, 76],
  Crafting: [199, 125, 58],
  Knowledge: [126, 87, 194],
  Special: [38, 166, 154],
};

/** A compact 4x6 uppercase bitmap font. Each glyph is six rows of four bits,
 *  top to bottom, using `1` for ink and `0` for background. */
const GLYPH_SOURCE: Record<string, string> = {
  A: "0110/1001/1001/1111/1001/1001",
  B: "1110/1001/1110/1001/1001/1110",
  C: "0111/1000/1000/1000/1000/0111",
  D: "1110/1001/1001/1001/1001/1110",
  E: "1111/1000/1110/1000/1000/1111",
  F: "1111/1000/1110/1000/1000/1000",
  G: "0111/1000/1011/1001/1001/0110",
  H: "1001/1001/1111/1001/1001/1001",
  I: "1111/0110/0110/0110/0110/1111",
  J: "0011/0001/0001/0001/1001/0110",
  K: "1001/1010/1100/1100/1010/1001",
  L: "1000/1000/1000/1000/1000/1111",
  M: "1001/1111/1111/1001/1001/1001",
  N: "1001/1101/1111/1011/1001/1001",
  O: "0110/1001/1001/1001/1001/0110",
  P: "1110/1001/1110/1000/1000/1000",
  Q: "0110/1001/1001/1001/1010/0101",
  R: "1110/1001/1110/1010/1001/1001",
  S: "0111/1000/0110/0001/0001/1110",
  T: "1111/0110/0110/0110/0110/0110",
  U: "1001/1001/1001/1001/1001/0110",
  V: "1001/1001/1001/1001/0110/0110",
  W: "1001/1001/1001/1111/1111/1001",
  X: "1001/1001/0110/0110/1001/1001",
  Y: "1001/1001/0110/0110/0110/0110",
  Z: "1111/0001/0010/0100/1000/1111",
  "0": "0110/1001/1011/1101/1001/0110",
  "1": "0010/0110/0010/0010/0010/0111",
  "2": "0110/1001/0001/0010/0100/1111",
  "3": "1110/0001/0110/0001/0001/1110",
  "4": "0010/0110/1010/1111/0010/0010",
  "5": "1111/1000/1110/0001/1001/0110",
  "6": "0110/1000/1110/1001/1001/0110",
  "7": "1111/0001/0010/0100/0100/0100",
  "8": "0110/1001/0110/1001/1001/0110",
  "9": "0110/1001/1001/0111/0001/0110",
};

const GLYPHS = new Map(
  Object.entries(GLYPH_SOURCE).map(([char, source]) => [char, source.split("/")]),
);

type RGB = readonly [number, number, number];

const PAPER: RGB = [242, 232, 198];
const PAPER_SHADE: RGB = [214, 198, 152];
const INK: RGB = [56, 42, 24];

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shade(rgb: RGB, factor: number): RGB {
  return [byte(rgb[0] * factor), byte(rgb[1] * factor), byte(rgb[2] * factor)];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    byte(a[0] + (b[0] - a[0]) * t),
    byte(a[1] + (b[1] - a[1]) * t),
    byte(a[2] + (b[2] - a[2]) * t),
  ];
}

function plot(rgba: Uint8Array, x: number, y: number, rgb: RGB): void {
  if (x < 0 || y < 0 || x >= 16 || y >= 16) return;
  const at = (y * 16 + x) * 4;
  rgba[at] = rgb[0]!;
  rgba[at + 1] = rgb[1]!;
  rgba[at + 2] = rgb[2]!;
  rgba[at + 3] = 255;
}

/** Draw a three-letter code in ink, centred in the parchment band (rows
 *  3..12). */
function drawCode(rgba: Uint8Array, code: string): void {
  const glyphWidth = 4;
  const glyphHeight = 6;
  const gap = 1;
  const width = code.length * glyphWidth + (code.length - 1) * gap;
  const originX = Math.floor((16 - width) / 2);
  const originY = 5;
  for (let i = 0; i < code.length; i++) {
    const glyph = GLYPHS.get(code[i]!);
    if (!glyph) continue;
    for (let y = 0; y < glyphHeight; y++) {
      for (let x = 0; x < glyphWidth; x++) {
        if (glyph[y]![x] !== "1") continue;
        plot(rgba, originX + i * (glyphWidth + gap) + x, originY + y, INK);
      }
    }
  }
}

/** A placeholder 16x16 icon: a rolled parchment in the category's colour with
 *  the building's three-letter code. */
function placeholderIcon(type: BuildingType): Uint8Array {
  const rgba = new Uint8Array(16 * 16 * 4);
  const accent = CATEGORY_COLORS[type.category];
  const outline = shade(accent, 0.32);
  const rollLight = mix(accent, [255, 255, 255], 0.4);
  const rollDark = shade(accent, 0.55);

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let color: RGB;
      if (x === 0 || x === 15 || y === 0 || y === 15) color = outline;
      else if (y === 1) color = rollLight;
      else if (y === 2 || y === 13) color = accent;
      else if (y === 14) color = rollDark;
      else color = PAPER;
      plot(rgba, x, y, color);
    }
  }

  for (let y = 3; y <= 12; y++) {
    plot(rgba, 1, y, PAPER_SHADE);
    plot(rgba, 14, y, PAPER_SHADE);
  }
  for (let x = 4; x <= 11; x++) plot(rgba, x, 11, accent);

  drawCode(rgba, PLAN_CODES[type.id] ?? type.id.slice(0, 3).toUpperCase());
  return encodePng(16, 16, rgba);
}

export function buildResourcePack(): ResourcePack {
  const pack = new ResourcePack(
    "aom",
    latestVersion(),
    "Age of Minecraft — plan icons",
    "Age of Minecraft",
  );

  const overrides = new Map<string, { when: string; model: Record<string, unknown> }[]>();

  for (const type of BUILDINGS) {
    const model = `aom:item/plan/${type.id}`;
    pack.json(`assets/aom/models/item/plan/${type.id}.json`, {
      parent: "minecraft:item/generated",
      textures: { layer0: model },
    });

    const texturePath = `assets/aom/textures/item/plan/${type.id}.png`;
    const source = `packs/aom/resourcepack/textures/item/plan/${type.id}.png`;
    if (existsSync(source)) pack.copy(texturePath, source);
    else pack.binary(texturePath, placeholderIcon(type));

    const icon = type.icon.slice("minecraft:".length);
    const cases = overrides.get(icon) ?? [];
    cases.push({
      when: planModelKey(type.id),
      model: { type: "minecraft:model", model },
    });
    overrides.set(icon, cases);
  }

  for (const [icon, cases] of overrides) {
    pack.json(`assets/minecraft/items/${icon}.json`, {
      model: {
        type: "minecraft:select",
        property: "minecraft:custom_model_data",
        index: 0,
        cases,
        fallback: { type: "minecraft:model", model: vanillaModel(`minecraft:${icon}`) },
      },
    });
  }

  return pack;
}
