import {
  Datapack,
  latestVersion,
  sel,
  text,
  tellraw,
  type EquipmentSlot,
  type TextComponent,
} from "../../../mcgen/src/index.ts";

const SLOTS: EquipmentSlot[] = [
  "body",
  "chest",
  "feet",
  "head",
  "legs",
  "mainhand",
  "offhand",
];

const SLOT_IDS: Record<EquipmentSlot, string> = {
  head: "armor.head",
  chest: "armor.chest",
  legs: "armor.legs",
  feet: "armor.feet",
  body: "armor.body",
  mainhand: "weapon.mainhand",
  offhand: "weapon.offhand",
};

function toggleMessage(nowBroken: boolean): TextComponent[] {
  const state = nowBroken
    ? "Your items can now break."
    : "Your items can no longer break.";
  const action = nowBroken
    ? "To turn your items unbreakable write '"
    : "To turn your items breakable write '";
  return [
    text("[Unbreakable]", { color: "gray" }),
    text(` ${state} ${action}`, { color: "white" }),
    text("/trigger unbreakable", {
      color: "dark_gray",
      underlined: true,
      click_event: { action: "run_command", command: "/trigger unbreakable" },
      hover_event: { action: "show_text", value: "trigger unbreakable" },
    }),
    text("'", { color: "white" }),
  ];
}

export function build(): Datapack {
  const d = new Datapack(
    "unbreakable",
    latestVersion(),
    "Turns items unbreakable.",
  );

  const load = d.defineFunction("load", [
    "scoreboard objectives add unbreakable trigger",
    "scoreboard objectives add unbreakable_toggle dummy",
    "scoreboard objectives add unbreakable_initialized dummy",
  ]);

  const triggerOn = d.defineFunction("trigger/on", [
    tellraw("@s", toggleMessage(false)),
    "scoreboard players set @s unbreakable 1",
  ]);

  const triggerOff = d.defineFunction("trigger/off", [
    tellraw("@s", toggleMessage(true)),
    "scoreboard players set @s unbreakable 0",
  ]);

  const trigger = d.defineFunction("trigger/", [
    `execute if score @s unbreakable_toggle matches 0..0 run function ${triggerOn.name}`,
    `execute if score @s unbreakable_toggle matches 1..1 run function ${triggerOff.name}`,
    "scoreboard players operation @s unbreakable_toggle = @s unbreakable",
    "scoreboard players set @s unbreakable 0",
  ]);

  const playerOff = d.defineFunction("player_off", [
    ...SLOTS.map(
      (slot) =>
        `execute if predicate unbreakable:${slot}_unbreakable run item modify entity @s ${SLOT_IDS[slot]} unbreakable:make_breakable`,
    ),
  ]);

  const playerOn = d.defineFunction("player_on", [
    ...SLOTS.map(
      (slot) =>
        `execute if predicate unbreakable:${slot}_breakable run item modify entity @s ${SLOT_IDS[slot]} unbreakable:make_unbreakable`,
    ),
  ]);

  const tick = d.defineFunction("tick", [
    `execute as ${sel("@a", { scores: { unbreakable: "1.." } })} run function ${trigger.name}`,
    "scoreboard players enable @a unbreakable",
    "",
    `execute as ${sel("@a", { scores: { unbreakable_initialized: "0..0" } })} run scoreboard players set @s unbreakable_initialized 1`,
    "",
    `execute as ${sel("@a", { scores: { unbreakable_toggle: "1..1" } })} run function ${playerOn.name}`,
    `execute as ${sel("@a", { scores: { unbreakable_toggle: "0..0" } })} run function ${playerOff.name}`,
  ]);

  d.onLoad(load);
  d.onTick(tick);

  d.itemTag("items", ["#minecraft:enchantable/durability"]);

  for (const slot of SLOTS) {
    d.predicate(`${slot}_breakable`, {
      condition: "minecraft:entity_properties",
      entity: "this",
      predicate: {
        equipment: { [slot]: { items: "#unbreakable:items" } },
      },
    });
    d.predicate(`${slot}_unbreakable`, {
      condition: "minecraft:entity_properties",
      entity: "this",
      predicate: {
        equipment: {
          [slot]: {
            items: "#unbreakable:items",
            components: { unbreakable: {} },
          },
        },
      },
    });
  }

  d.itemModifier("make_breakable", {
    function: "minecraft:set_components",
    components: { "!minecraft:unbreakable": {} },
  });
  d.itemModifier("make_unbreakable", {
    function: "minecraft:set_components",
    components: { "minecraft:unbreakable": {} },
  });

  return d;
}
