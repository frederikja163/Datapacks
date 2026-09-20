import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Tech Demo",
  summary:
    "A temporary test pack that previews the Age of Minecraft advancement tree in game.",
  about: [
    "Tech Demo grants every advancement node in one tree so the layout, icons and frames can be reviewed in game without playing through the town economy.",
    "It is a temporary helper pack: it has no VERSION file, is not released, and exists only to preview the tree used by Age of Minecraft.",
  ],
  preview: true,
  features: [
    {
      title: "One node per building",
      detail:
        "The root, the nine category hubs and every building from the design each become an advancement, mirroring the tree in packs/aom/src/tree.ts.",
    },
    {
      title: "Granted for testing",
      detail:
        "Every node uses a tick criterion and is granted immediately, so the whole tree is visible as soon as the pack loads.",
    },
  ],
  notes: [
    "Install it alongside Age of Minecraft only for testing; both packs define achievements.",
    "The pack is not released, so it is not part of the download links on the index page.",
  ],
};
