/** The BuildSheet: every decision about one campaign, in one document.
 *
 *  The renderer, the PNG exporter and the Figma plugin all read this and none
 *  of them decides anything. That is the whole point -- two renderers that
 *  each make their own choices drift, and this repo already documents what
 *  that cost once. They cannot drift if neither is choosing.
 *
 *  It is also what a session saves, what Claude writes over MCP, and what gets
 *  stamped into the Figma document on export so a board can say where it came
 *  from.
 */
import type { Section } from '../model/sections';
import type { Edits } from '../edit/store';
import type { AiParse } from '../ai/types';

export type Scope = {
  topic?: string;     // exact offer/title for this requested instance
  send?: string;      // 'E1'
  category?: string;  // "Men's Apparel"
  concept?: string;   // "Summer's Last Call"
  phase?: string;     // 'Launch' | 'Ends Today'
  instance?: number;  // manual second/third copy of a one-off format
};

/** The named runs of type an asset can carry. A template says which of these
 *  its copy block actually uses; the brief says what they read. */
export type Copy = {
  title?: string;         // named campaign, separate from the offer or phase
  dates?: string;         // exact date range, for formats with room to show it
  subject?: string;
  preview?: string;
  eyebrow?: string;
  lead?: string;        // 'EXTRA' -- the word above the number
  offer?: string;       // '20% OFF'
  markdown?: string;    // 'UP TO 60% OFF' on a stacked lockup
  qualifier?: string;   // 'on 3+ items, no code'
  code?: string;
  cta?: string;
  body?: string;
  marquee?: string;
};

export type SheetAsset = {
  /** Stable and derived, never random: re-building the same sheet reproduces
   *  the same ids, which is what lets a Figma frame stay matched to its asset
   *  after someone renames it. */
  id: string;
  format: string;
  /** A brief-requested type absent from the chosen board's format registry. */
  custom?: true;
  size: [number, number];
  scope: Scope;
  label: string;
  variant: string;              // 'base' | 'direction-a' | ...
  copy: Copy;
  media: { photo?: string; brands?: string[] };
  /** Only email-body carries these; everything else is a single composition. */
  sections?: Section[];
  /** What in the brief decided this, in words. */
  because: string;
};

export type Sheet = {
  v: 8;
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  /** The brief as it was given, and as it was read.
   *
   *  `html` is kept because brief.ts reads an author's own bold labels in
   *  preference to any pattern, and a paste that keeps its markup has already
   *  said which line is a label. `ai` is Claude's reading, kept so that
   *  switching template does not mean paying for the parse again. */
  brief: { text: string; html?: string; ai?: AiParse };
  templateId: string;
  /** What to build, when it differs from what the brief asked for.
   *
   *  A brief states its deliverables and the studio builds those. A designer
   *  then wants a second social concept, or three emails where the brief named
   *  one, and that is an ordinary request rather than a reason to edit the
   *  brief. Absent means 'whatever the brief asked for'. */
  plan?: { formats?: string[]; sends?: number; concepts?: number;
           /** Manual adds/removals by deliverable, independent of the board. */
           quantities?: Record<string, number>;
           customSizes?: Record<string, [number, number]>;
           /** Phases the designer set by hand, overriding the brief's. */
           phases?: string[] };
  /** Which of the three design directions is chosen, per family. Email and
   *  social are chosen apart because they are reviewed apart. */
  direction?: { email?: 'a' | 'b' | 'c'; social?: 'a' | 'b' | 'c' };
  /** Current per-asset-type design directions. Legacy family picks remain a
   * fallback for campaigns saved before this control existed. */
  formatDirections?: Record<string, 'a' | 'b' | 'c'>;
  assets: SheetAsset[];
  edits: Edits;
};

/** A content hash of the decisions, ignoring timestamps and the designer's
 *  own edits. Stamped into Figma so a board can say which version it is. */
export function sheetHash(s: Sheet): string {
  const stable = JSON.stringify({ t: s.templateId, b: s.brief.text,
    a: s.assets.map(x => [x.id, x.copy, x.media, x.variant]) });
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** `email-hero/e1/base`, `hero-desktop/all/ends-today/base`.
 *  A segment that would be empty is dropped rather than left as '//' -- the
 *  id ends up in Figma as the frame's identity and in filenames on export. */
export const assetId = (format: string, scope: Scope, variant: string) =>
  [format,
   scope.send ?? scope.category ?? scope.concept ?? scope.topic ?? 'all',
   scope.phase,
   scope.instance ? `v${scope.instance}` : undefined,
   variant]
    .filter((x): x is string => !!x && !!slug(x))
    .map(slug)
    .join('/');
