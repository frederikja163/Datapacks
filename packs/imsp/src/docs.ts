import type { PackDocs } from "../../../mcgen/src/docs.ts";

export const DOCS: PackDocs = {
  title: "Improved Spectator",
  summary:
    "Spectating that leaves your body behind, so you can return to exactly where you left off.",
  about: [
    "Improved Spectator replaces vanilla's one-way spectator mode with a round trip. Running /trigger imsp while alive leaves a mannequin body behind, holding your gear at your position and rotation, and puts you in spectator mode.",
    "Running the trigger again returns you to your body: the mannequin despawns and you are teleported back to the spot you left, facing the way you did, restored to survival.",
    "The switch is also detected when an admin changes your gamemode directly, so you are never stranded in spectator with a lost body.",
  ],
  features: [
    {
      title: "Body left behind",
      detail:
        "A silent, invulnerable mannequin is spawned where you stood, wearing your armor and holding your mainhand and offhand items with your rotation.",
    },
    {
      title: "Return to your body",
      detail:
        "Run /trigger imsp while spectating to teleport back and vanish the body. Your position and rotation are restored exactly.",
    },
    {
      title: "Gamemode-safe",
      detail:
        "A per-player check sees any return to survival, creative or adventure - whether from the trigger or an admin command - and cleans the body up instead of leaving it behind.",
    },
    {
      title: "Per-player toggle",
      detail:
        "Players who do not want the feature can disable it for themselves; the trigger then does nothing for them.",
    },
  ],
  commands: [
    {
      command: "trigger imsp",
      description:
        "Toggle improved spectator: leave your body and spectate, or return to it.",
    },
    {
      command: "trigger imsp.toggle",
      description: "Enable or disable improved spectator for yourself.",
    },
    {
      command: "function imsp:uninstall",
      description:
        "Removes the objectives, storage keys and leftover bodies the pack created.",
    },
  ],
  notes: [
    "Bodies are matched to players by a unique per-player id, so cleanup survives relogs and dimension changes.",
    "Leaving spectator always returns you to survival; a previous creative or adventure gamemode is not restored.",
    "Improved spectator is enabled by default for every player.",
  ],
};
