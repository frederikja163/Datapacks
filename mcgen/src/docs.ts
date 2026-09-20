// Documentation model shared by the packs and the static-site generator
// (`bun run docs`). Each pack declares its prose in `src/docs.ts`; structural
// data (buildings, jobs, skills, recipes) is derived from the pack's own
// TypeScript so the docs cannot drift from what the datapack does.

export interface DocFeature {
  readonly title: string;
  readonly detail: string;
}

export interface DocCommand {
  /** The literal command to run, without a leading slash. */
  readonly command: string;
  readonly description: string;
}

export interface PackDocs {
  /** Display name used in headings and navigation. */
  readonly title: string;
  /** One-sentence summary for the index and the page header. */
  readonly summary: string;
  /** Paragraphs shown under "About". */
  readonly about?: readonly string[];
  /** Feature cards. */
  readonly features?: readonly DocFeature[];
  /** Commands, triggers and uninstall instructions. */
  readonly commands?: readonly DocCommand[];
  /** Short bullets under "Good to know". */
  readonly notes?: readonly string[];
  /** True for helper packs that are not released. */
  readonly preview?: boolean;
}
