import {
  body,
  button,
  runCommand,
  text,
  type Datapack,
  type Dialog,
  type DialogButton,
  type MultiActionDialog,
} from "../../../mcgen/src/index.ts";
import {
  BUILDINGS,
  CONFIRM_ACTION,
  INDUSTRIAL_BUILDINGS,
  STORAGE_AMOUNTS,
  TOWNHOUSE_ACTIONS,
  buildingResources,
  deleteAction,
  jobActions,
  storageAction,
  type BuildingType,
} from "./registry.ts";

function actionButton(label: string, action: number): DialogButton {
  return button(text(label), runCommand(`trigger aom.action set ${action}`));
}

function buildButton(building: BuildingType, index: number): DialogButton {
  return button(
    text(building.label),
    runCommand(`trigger aom.build set ${index + 1}`),
  );
}

export function helpDialog(): Dialog {
  return {
    type: "minecraft:notice",
    title: text("Age of Minecraft"),
    body: body([
      text("Build a town with signs and grow it with villagers.\n\n"),
      text("1. Place a sign with your town name, look at it and run "),
      text("/trigger aom.start_village", { color: "aqua" }),
      text(".\n2. Look at the townhouse lectern and run "),
      text("/trigger aom.menu", { color: "aqua" }),
      text(" to join your town.\n3. Place a sign, look at it and run "),
      text("/trigger aom.create_building", { color: "aqua" }),
      text(" to choose what to build there.\n4. Look at a building and run "),
      text("/trigger aom.menu", { color: "aqua" }),
      text(" to staff jobs, deposit and withdraw.\n5. Staffed jobs generate resources and unlock recipes for the whole town."),
    ]),
    action: button(text("Got it")),
  };
}

export function buildDialog(): Dialog {
  return {
    type: "minecraft:multi_action",
    title: text("Build"),
    body: body("Choose what to build at the targeted sign."),
    actions: BUILDINGS.map(buildButton),
    columns: 2,
    exit_action: button(text("Cancel")),
  };
}

export function townhouseDialog(): Dialog {
  const labels: Record<keyof typeof TOWNHOUSE_ACTIONS, string> = {
    join: "Join town",
    leave: "Leave town",
    addVillager: "Add villager",
    removeVillager: "Remove villager",
    deleteTown: "Delete town",
    townInfo: "Town info",
  };
  return {
    type: "minecraft:multi_action",
    title: text("Townhouse"),
    body: body(
      "Join or leave the town, adjust how many villagers this townhouse provides, or read the town book.",
    ),
    actions: (
      Object.keys(TOWNHOUSE_ACTIONS) as Array<keyof typeof TOWNHOUSE_ACTIONS>
    ).map((key) => actionButton(labels[key], TOWNHOUSE_ACTIONS[key])),
    columns: 2,
    exit_action: button(text("Close")),
  };
}

export function buildingDialog(type: BuildingType): MultiActionDialog {
  const actions: DialogButton[] = [];
  type.jobs.forEach((job, index) => {
    const indices = jobActions(index);
    actions.push(actionButton(`Hire ${job.label}`, indices.hire));
    actions.push(actionButton(`Fire ${job.label}`, indices.fire));
  });
  buildingResources(type).forEach((resource, resourceIndex) => {
    for (const [amountIndex, amount] of STORAGE_AMOUNTS.entries()) {
      actions.push(
        actionButton(
          `Deposit ${amount.label} ${resource.label}`,
          storageAction(type, resourceIndex, "deposit", amountIndex),
        ),
      );
      actions.push(
        actionButton(
          `Withdraw ${amount.label} ${resource.label}`,
          storageAction(type, resourceIndex, "withdraw", amountIndex),
        ),
      );
    }
  });
  actions.push(actionButton("Delete building", deleteAction(type)));
  return {
    type: "minecraft:multi_action",
    title: text(type.label),
    body: body(
      "Hire workers to produce and store resources, unlock recipes, or manage the stored items.",
    ),
    actions,
    columns: 2,
    exit_action: button(text("Close")),
  };
}

export function confirmDialog(): Dialog {
  return {
    type: "minecraft:confirmation",
    title: text("Are you sure?"),
    body: body("This cannot be undone."),
    yes: button(
      text("Yes"),
      runCommand(`trigger aom.action set ${CONFIRM_ACTION}`),
    ),
    no: button(text("Cancel")),
  };
}

export function defineDialogs(d: Datapack): void {
  d.dialog("help", helpDialog());
  d.dialog("build", buildDialog());
  d.dialog("townhouse", townhouseDialog());
  d.dialog("confirm", confirmDialog());
  for (const type of INDUSTRIAL_BUILDINGS) {
    d.dialog(type.id, buildingDialog(type));
  }
}
