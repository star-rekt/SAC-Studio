/** The vocabulary every template is written in, and the check that it is.
 *
 *  A template is a design outlook, declared as data.
 *
 *  Not a replica of a board. Rebuilding SC26_0047's hero in JSX gave a
 *  faithful one-off that could not be varied, reused or reasoned about: to
 *  change where the copy sits you edit a component, and to add a third
 *  template you write a third component. That is not modular and it does not
 *  iterate.
 *
 *  So the reference boards are read for two things only -- the VOCABULARY of
 *  decisions a SAC asset can make, and the EVIDENCE of which combinations are
 *  real -- and a template is one set of choices over that vocabulary. One
 *  renderer draws any template, so:
 *
 *    a variation is a spec delta, not a new component
 *    a new template is a new object, not new code
 *    two templates can be diffed, because they are the same shape
 *
 *  Formats collapse into CLASSES. A hero and a mobile hero make the same
 *  decisions at different sizes; a GT, a CB and a text banner are all one bar.
 *  A template declares its outlook per class, not per format, which is what
 *  keeps format-level differences from becoming unrelated template systems.
 */

export type Klass = 'hero' | 'social' | 'tile' | 'bar' | 'badge' | 'strip' | 'email';

export const CLASS_OF: Record<string, Klass> = {
  'hero-desktop': 'hero', 'hero-mobile': 'hero',
  'paid-social-1x1': 'social', 'paid-social-4x5': 'social', 'paid-social-9x16': 'social',
  'cplp-tile': 'tile',
  'gt': 'bar', 'cb': 'bar', 'text-banner': 'bar',
  'text-banner-mobile': 'bar', 'compact-mobile': 'bar', 'text-link': 'bar',
  'plp-badging-mock': 'badge', 'pdp-badging-mock': 'badge',
  'logo-strip': 'strip',
  'email-hero': 'email', 'email-body': 'email',
};
export const classOf = (format: string): Klass => CLASS_OF[format] ?? 'bar';

/* ---- the vocabulary, harvested from the published boards ---------------- */

/** What the asset sits on. */
export type Ground =
  | 'cream-grain' | 'photo-bleed' | 'accent-grain' | 'white'
  | 'ink'         // #101010 — SC26_0060 sets its PDP badging on it
  | 'charcoal';   // #333333 — and its compact mobile bar

/** How the urgency line is set. */
export type Urgency = 'caps' | 'brush' | 'none';

/** The shape the offer takes. */
export type OfferShape =
  | 'single'          // EXTRA 20% OFF, one line
  | 'lead-over'       // EXTRA / 20% OFF
  | 'prefix-stacked'  // UP TO (small, two lines) beside 75% OFF
  | 'ticket';         // on a tilted punched card

/** The call to action. */
export type Button = 'pill-charcoal' | 'pill-orange' | 'pill-outline' | 'none';

/** What closes the asset off. */
export type Closing = 'none' | 'brand-strip' | 'wordmark';

/** Whether the copy sets as a headline or as a line of prose.
 *
 *  The boards have recorded this all along and nothing read it, which is why
 *  a GT came out as a display offer on an orange slab. Every board that
 *  measures one sets a GT as a SENTENCE -- 'Extra 20% Off Select Fall Gear,
 *  use code CHILLY20' -- and all eighteen badging measurements across the
 *  corpus are sentences too. */
export type Register = 'display' | 'sentence';

/** How photography is used. */
export type Photo =
  | 'bleed'     // the picture is the frame
  | 'collage'   // tiles, where the board measured them
  | 'band'      // photograph inset into an accent band
  | 'window'    // seen through the stepped window, on paper
  | 'none';

export type Outlook = {
  ground: Ground;
  photo: Photo;
  copyAt: 'left' | 'right' | 'centre';
  urgency: Urgency;
  /** Photographic templates can keep urgency in the reversed copy colour;
   * paper templates normally use the campaign accent. */
  urgencyTone?: 'accent' | 'copy';
  offer: OfferShape;
  /** Fraction of the frame's height the offer's cap occupies. */
  offerScale: number;
  /** Headline or prose. */
  register: Register;
  code: boolean;
  button: Button;
  closing: Closing;
  /** Which tone the copy takes. 'auto' reverses it over photography. */
  tone: 'ink' | 'cream' | 'auto';
  /** This class's own accent, where the board does not use the template's.
   *  SC26_0060 runs orange on its hero and green on its paid social and email
   *  hero -- a template carrying one accent cannot say that, and saying it
   *  wrong is how the social lost the green outline its window is drawn in. */
  accent?: string;
};

export type TemplateSpec = {
  id: string;
  /** Old ids kept readable so saved campaigns survive template cleanup. */
  aliases?: string[];
  name: string;
  type: string;
  /** False for a template kept in the codebase but not offered in the picker
   *  (unfinished, superseded, or not yet signed off). Defaults to true. */
  exposed?: boolean;
  /** The board the vocabulary was read off, for provenance. */
  groundedIn: string;
  /** The exact page the stored dissection came from. */
  figma: { fileKey: string; nodeId: string };
  why: string;
  accent: string;
  /** The outlook per class. A class the template does not declare falls back
   *  to `bar`, which is the simplest thing that can carry a line of type. */
  classes: Partial<Record<Klass, Outlook>>;
  /** Where ONE format differs from the rest of its class, because the board
   *  says it does.
   *
   *  SC26_0060's five bars are four different designs sharing a shape: a
   *  cream GT in ink, an orange CB in cream, a white text banner, a charcoal
   *  compact bar. Collapsing them into one outlook is what made every bar an
   *  orange slab. The class stays the default; this says where a format
   *  departs from it, and nothing more. */
  formats?: Partial<Record<string, Partial<Outlook>>>;
};

/** The least a bar can be: one line of prose, centred, on the accent.
 *
 *  It is a FALLBACK for a class a template has not declared, not a design.
 *  It used to be three classes' actual answer, and 8 of 16 formats rendered
 *  as an orange slab carrying a display offer because of it. */
export const BAR: Outlook = {
  ground: 'accent-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
  offer: 'single', offerScale: 0.30, register: 'sentence', code: false,
  button: 'none', closing: 'none', tone: 'cream',
};

/* ---- the check ----------------------------------------------------------
 *
 *  A template is authored by a person, so a wrong value is a mistake made at
 *  a keyboard rather than bad input from a user. It should stop the studio at
 *  once and name the field, the way a missing font stops the Figma plugin:
 *  the alternative is an asset that renders slightly wrong and nobody knows
 *  which of four templates said so.
 */

const GROUNDS: Ground[] = ['cream-grain', 'photo-bleed', 'accent-grain', 'white',
                           'ink', 'charcoal'];
const REGISTERS: Register[] = ['display', 'sentence'];
const PHOTOS: Photo[] = ['bleed', 'collage', 'band', 'window', 'none'];
const URGENCIES: Urgency[] = ['caps', 'brush', 'none'];
const OFFERS: OfferShape[] = ['single', 'lead-over', 'prefix-stacked', 'ticket'];
const BUTTONS: Button[] = ['pill-charcoal', 'pill-orange', 'pill-outline', 'none'];
const CLOSINGS: Closing[] = ['none', 'brand-strip', 'wordmark'];
const AT = ['left', 'right', 'centre'];
const TONES = ['ink', 'cream', 'auto'];
const URGENCY_TONES = ['accent', 'copy'];
const HEX = /^#[0-9A-F]{6}$/i;

/** The palette the boards actually use. A template reaching outside it is
 *  inventing a colour, which is the one thing the design system forbids:
 *  "Brand colors are sourced from SAC Style Guide 2." */
export const PALETTE: Record<string, string> = {
  orange: '#F14222', cream: '#F5EBDF', green: '#79AC41',
  red: '#64160A', blue: '#31385C', ink: '#101010', white: '#FFFFFF',
};
const KNOWN_HUE = new Set(Object.values(PALETTE).map(h => h.toUpperCase()));

/** Every fault in a template, or an empty list. */
export function faults(t: TemplateSpec): string[] {
  const bad: string[] = [];
  const at = t.id || '(no id)';
  for (const k of ['id', 'name', 'type', 'groundedIn', 'why'] as const)
    if (!t[k]) bad.push(`${at}: ${k} is empty`);
  if (!t.figma?.fileKey || !t.figma?.nodeId)
    bad.push(`${at}: figma.fileKey and figma.nodeId are required`);
  if (!HEX.test(t.accent)) bad.push(`${at}: accent "${t.accent}" is not a hex colour`);
  else if (!KNOWN_HUE.has(t.accent.toUpperCase()))
    bad.push(`${at}: accent ${t.accent} is not in the SAC palette`);

  const classes = Object.keys(t.classes) as Klass[];
  if (!classes.length) bad.push(`${at}: declares no classes`);
  for (const k of [...new Set(Object.values(CLASS_OF))])
    if (!classes.includes(k)) bad.push(`${at}: classes.${k} is required`);
  for (const k of classes) {
    const o = t.classes[k]!;
    const where = `${at}/${k}`;
    const one = <T extends string>(field: string, v: T, allowed: readonly T[]) => {
      if (!allowed.includes(v)) bad.push(`${where}: ${field} "${v}" — expected ${allowed.join(' | ')}`);
    };
    one('ground', o.ground, GROUNDS);
    one('photo', o.photo, PHOTOS);
    one('copyAt', o.copyAt, AT as typeof o.copyAt[]);
    one('urgency', o.urgency, URGENCIES);
    if (o.urgencyTone) one('urgencyTone', o.urgencyTone, URGENCY_TONES);
    one('offer', o.offer, OFFERS);
    one('button', o.button, BUTTONS);
    one('closing', o.closing, CLOSINGS);
    one('tone', o.tone, TONES as typeof o.tone[]);
    one('register', o.register, REGISTERS);
    if (typeof o.code !== 'boolean') bad.push(`${where}: code must be true or false`);
    if (!(o.offerScale > 0 && o.offerScale <= 1))
      bad.push(`${where}: offerScale ${o.offerScale} must be between 0 and 1`);
    if (o.accent !== undefined) {
      if (!HEX.test(o.accent)) bad.push(`${where}: accent "${o.accent}" is not a hex colour`);
      else if (!KNOWN_HUE.has(o.accent.toUpperCase()))
        bad.push(`${where}: accent ${o.accent} is not in the SAC palette`);
    }
  }
  for (const [format, over] of Object.entries(t.formats ?? {})) {
    if (!(format in CLASS_OF)) bad.push(`${at}: formats."${format}" is not a known format`);
    const o = over as Partial<Outlook>;
    const where = `${at}/formats/${format}`;
    if (o.ground && !GROUNDS.includes(o.ground)) bad.push(`${where}: ground "${o.ground}"`);
    if (o.register && !REGISTERS.includes(o.register)) bad.push(`${where}: register "${o.register}"`);
    if (o.photo && !PHOTOS.includes(o.photo)) bad.push(`${where}: photo "${o.photo}"`);
    if (o.urgencyTone && !URGENCY_TONES.includes(o.urgencyTone))
      bad.push(`${where}: urgencyTone "${o.urgencyTone}"`);
    if (o.offerScale !== undefined && !(o.offerScale > 0 && o.offerScale <= 1))
      bad.push(`${where}: offerScale ${o.offerScale} must be between 0 and 1`);
    if (o.accent !== undefined && !HEX.test(o.accent)) bad.push(`${where}: accent "${o.accent}"`);
  }
  return bad;
}

/** Which of the sixteen formats a template actually answers for, and which it
 *  leaves to the `bar` fallback. A template with five classes falling through
 *  is not a template across assets — it is one template and five stand-ins. */
export function coverageOf(t: TemplateSpec) {
  const declared = new Set(Object.keys(t.classes));
  const byClass = new Map<Klass, string[]>();
  for (const [format, k] of Object.entries(CLASS_OF))
    byClass.set(k, [...(byClass.get(k) ?? []), format]);
  return [...byClass].map(([k, formats]) => ({
    klass: k, formats, declared: declared.has(k),
  }));
}
