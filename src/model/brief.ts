/** Reading a brief, and choosing the reference board nearest to it.
 *
 *  Two rules govern this file and neither is negotiable:
 *
 *  Recognise by keyword, never by shape. Briefs are written by marketers in
 *  whatever form suits the campaign. The parser adapts to the brief; the brief
 *  is never rewritten to suit the parser, so nothing here requires a heading,
 *  a separator or a particular punctuation.
 *
 *  Missing information becomes a placeholder, never a blocker. Anything not
 *  found is filled with a labelled stand-in and reported, so a run produces
 *  something reviewable that says exactly what was missing.
 */
import REFS from '../data/references.json';

export type CampaignType = 'flash-sale' | 'bump' | 'spend-save' | 'named-sale';

/** What a brief says under each of its own bold labels.
 *
 *  Pasted as plain text a brief is a wall of lines and every rule here has to
 *  guess which line is a label and which is a value. Pasted with its markup
 *  intact -- which a contenteditable field keeps and a textarea throws away --
 *  the author has already marked them: 'Sale Name', 'Offer', 'Code', 'Dates'
 *  and every section heading arrive in bold. That is structure given rather
 *  than inferred, and it is used in preference to any pattern below. */
export function labelled(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!html || !/<(b|strong)\b/i.test(html)) return out;
  const re = /<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<(?:b|strong)\b|$)/gi;
  const strip = (x: string) => x
    .replace(/<br\s*\/?>|<\/li>|<\/p>|<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<').replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"');
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const label = strip(m[2]).replace(/[\s:·•\-]+$/, '').trim().toLowerCase();
    const value = strip(m[3]).split('\n').map(l => l.trim()).filter(Boolean).join('\n').trim();
    if (!label || label.length > 40) continue;
    if (!out[label]) out[label] = value;
  }
  return out;
}

/** A brief's markup reduced to the plain text every keyword rule reads. */
export function plainText(html: string): string {
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  return html
    .replace(/<\/(?:p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<')
    .replace(/&#39;|&rsquo;/gi, "'").replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\n{3,}/g, '\n\n');
}

export type Brief = {
  type: CampaignType;
  /** False when `type` is a fallback guess, not read from the brief itself
   *  (an ERP code, a stated 'Sale Type', or the wording). The template picker
   *  uses this to offer every template rather than lock onto the guess. */
  typeConfident: boolean;
  /** The offer as numbers, for rewriting a board whatever shape it is set in:
   *  a percentage, or a saving and the spend that earns it. */
  percent: string;
  amounts: { threshold: string; saving: string } | null;
  /** What the sale is called, e.g. 'SPRING FLASH SALE'. Empty when the brief
   *  names none and the type does not imply one. */
  name: string;
  /** The headline offer, e.g. 'UP TO 70% OFF'. */
  offer: string;
  /** Promo code, if the brief names one. */
  code: string;
  /** The brief says there is no code — the discount applies in cart. The code
   *  line comes off the artwork entirely rather than being blanked. */
  noCode: boolean;
  /** Bundle threshold, when the discount requires a number of items. */
  minimumItems: number | null;
  /** A pursuit the brief's imagery direction calls for, where it names one. */
  pursuit: string;
  /** The categories a CPLP run covers. A brief listing nine text links wants
   *  nine tiles, not one. */
  categories: string[];
  /** The email sends, in order. A brief asking for E1 to E6 wants six heroes,
   *  each carrying its own send's urgency, not one hero. */
  sends: {
    id: string; date: string; label: string;
    /** The send's own Design: line, and the pursuit read out of it. Seven
     *  emails placed from one component are seven identical boards unless
     *  something tells them apart, and the brief says what: E1 is hiking, E4
     *  is camping, E3 is a brand spotlight. */
    design: string; tb: string; pursuit: string;
  }[];
  /** How many sends the brief DECLARES, counted from its own E-numbers. The
   *  parse is checked against this: if the brief says E1..E7 and seven did not
   *  come out, `sendsMissing` names the ones that did not. */
  sendsDeclared: number;
  sendsMissing: string[];
  /** Paid-social concepts. '2 sets + copy' with a headline each is two sets of
   *  every ratio, not one. */
  concepts: { name: string; headline: string; subhead?: string; cta?: string }[];
  /** How long it runs, e.g. '3 DAYS ONLY'. */
  duration: string;
  /** Brief facts retained for every renderer, not just the quantity planner. */
  dates?: string;
  creativeDirection?: string;
  imageryDirection?: string;
  brands?: string[];
  keyMessages?: string[];
  /** Phases the brief asks for, e.g. Launch, Ends Today. */
  phases: string[];
  /** Formats requested, as reference-board format names. */
  formats: string[];
  /** Explicit counts in site-asset headings (Hero x2, CB x2, etc.). */
  quantities: Record<string, number>;
  /** Distinct offer/title for each counted format, when stated in the brief. */
  deliverableMessages?: Record<string, string[]>;
  /** Everything filled in rather than found, for the report. */
  placeholders: string[];
};

export type Board = {
  campaign: string; fileKey: string; type: string; measuredAt: string;
  assets: { format: string; size: [number, number]; phases?: string[];
            copy?: { rect: number[]; align?: string; capHeight?: number; tone?: string;
                     register?: string; offerLines?: number; stack?: string[] };
            ground?: { role: string; fill: string }; accent?: { hue: string; roles: string[] };
            elements?: { role: string; rect: number[]; radius?: number }[] }[];
};

export const BOARDS = (REFS as unknown as { boards: Board[] }).boards;

/** Campaign type by vocabulary. Order matters: 'spend $300 save $75' also says
 *  'sale' on most briefs, and a bump is often written as a flash sale with a
 *  code, so the more specific phrasings are tested first. */
const TYPE_WORDS: [CampaignType, RegExp][] = [
  // A spend-save brief says 'extra' and a percentage too, and a bump always
  // does, so the money shape has to be recognised before the bump words are
  // tried. The window was 40 characters, which a brief like 'Spend $300 and
  // save $75 on full-price gear' overruns -- and that brief came back a bump,
  // which then linked bump boards and shipped their own CHILLY20 code.
  // A spend-save is a threshold and a saving. 'Spend' and 'save' merely near
  // each other is prose -- 'spend less, save more' is any sale's copy -- so it
  // takes money or the mechanic's own name.
  ['spend-save', /\bspend\s*\$?\s*\d|\bspend\s*(&|and)\s*save\b|\bsave\s*\$\s*\d{2,4}\b[\s\S]{0,40}?\bspend\b/i],
  // A sale named for its occasion is a named sale, whatever else it says: a
  // Memorial Day brief says 'extra 20%' and carries a code too, which made it a
  // bump. The occasion itself, not 'holiday' or 'anniversary' in passing.
  ['named-sale', /\b(memorial|labou?r|presidents?'?|veterans|independence)\s+day\b|\bblack\s*friday\b|\bcyber\s*monday\b|\b(holiday|anniversary)\s+sale\b/i],
  // A bundle promotion is a bump: an extra percentage off, applied in cart.
  ['bump', /\bbuy\s*\d\+?\b[\s\S]{0,40}?\bsave\b|\bbundle\s*(&|and)\s*save\b/i],
  ['bump', /\bbump\b|\bextra\s+\d+%|\bcode\s*[:\-]?\s*[A-Z0-9]{4,}\b[\s\S]{0,60}\bextra\b/i],
  ['flash-sale', /\bflash\s*sale\b|\bflash\b/i],
];

/** Format by vocabulary, mapped to the names the reference boards use. */
const FORMAT_WORDS: [string, RegExp][] = [
  ['hero-desktop', /\bhero\b(?![\s\S]{0,12}mobile)|\bhomepage\s*hero\b|\bhp\s*hero\b/i],
  ['hero-mobile', /\bhero\b[\s\S]{0,12}\bmobile\b|\bmobile\b[\s\S]{0,12}\bhero\b/i],
  // A brief that asks for paid social without naming ratios wants the set.
  // SC26_0065 says 'Paid Social / 2 sets + copy' and nothing about 1x1, so the
  // three formats every board carries were never requested.
  ['paid-social-1x1', /\b1x1\b|\bsquare\b|\bpaid\s*social\b|\bmeta\b/i],
  ['paid-social-4x5', /\b4x5\b|\b4:5\b|\bpaid\s*social\b/i],
  ['paid-social-9x16', /\b9x16\b|\b9:16\b|\bstor(y|ies)\b|\breels?\b|\bpaid\s*social\b/i],
  ['cplp-tile', /\bcplp\b|\bcategory\s*(drop\s*down\s*)?(tile|banner|page)\b/i],
  ['text-banner', /\btop\s*banners?\b|\btext\s*banners?\b|\bsite\s*banners?\b/i],
  // The two-letter names are only taken where the brief is naming an asset,
  // not wherever those letters happen to fall.
  // Site-asset lists write these on a line of their own, with nothing after.
  ['gt', /\bglobal\s*text\b|\bgt\b\s*(?=[:\-]|\d|banner)|^\s*GT\s*$/im],
  ['cb', /\bcampaign\s*banner\b|\bcb\b\s*(?=[:\-]|\d|banner)|^\s*CB\s*$/im],
  // Briefs number their sends 'E1:', 'E2:' as often as 'Email 1'.
  ['email-hero', /\bemail\b[^.\n]{0,20}\bhero\b|\bemail\s*\d+\b|^\s*E\d\s*[:\-]/im],
  ['email-body', /\bsecondar(?:y|ies)\b|\bemail\s*body\b|\btop\s*sale\s*picks\b|\bproduct\s*recs\b/i],
  // 'PLP Card' is served by the PLP badging mock, which is the card in its
  // page. There is no separate asset for it on any board.
  ['plp-badging-mock', /\bplp\b[\s\S]{0,12}badg|\bbadging\b|\bplp\s*card\b/i],
  ['pdp-badging-mock', /\bpdp\b[\s\S]{0,12}badg/i],
  // A brief asking for brand tiles means the brand artwork the boards carry:
  // square brand tiles and the tall brand banners. 'logo-strip' is a name from
  // the old dissection that no board publishes.
  ['brand-tile', /\bbrand\s*tiles?\b|\bbrand\s*logos?\b|\blogo\s*strip\b/i],
  ['brand-banner', /\bbrand\s*(spotlight|banners?)\b|\bsimple\s+square\s+brand\b/i],
  // Named so the run reports them as missing rather than passing over them in
  // silence. Both briefs ask for an affiliate text link and brand tiles, and
  // no board in the library publishes either.
  ['text-link', /\baffiliate\s*(text\s*)?link\b|\btext\s*link\b/i],
  ['homepage-card-4x3', /\bhomepage\b[^\n]{0,75}\b(?:cards?|tiles?|row)\b|\b(?:cards?|tiles?)\b[^\n]{0,40}\b4\s*:\s*3\b/i],
  ['rules-page', /\brules?\s*pages?\b/i],
  ['compact-mobile', /\bcompact\b/i],
];

/** What gets built first.
 *
 *  A brief describes a whole campaign, so it mentions emails and category
 *  banners alongside the hero. Those are real requests, but they are not what
 *  anyone opens the page to look at -- and when the hero was skipped for a
 *  missing font, what was left on the page was a category tile and an email,
 *  which reads as the plugin having built something random. The deliverables
 *  people judge the campaign by come first. */
const FORMAT_ORDER = [
  'hero-desktop', 'hero-mobile',
  'paid-social-1x1', 'paid-social-4x5', 'paid-social-9x16',
  'cplp-tile', 'gt', 'cb', 'text-banner', 'text-banner-mobile',
  'plp-badging-mock', 'pdp-badging-mock', 'compact-mobile',
  'email-hero', 'email-body', 'text-link', 'homepage-card-4x3', 'rules-page',
  'brand-tile', 'brand-banner',
];

const PHASE_WORDS: [string, RegExp][] = [
  ['Launch', /\blaunch\b|\bday\s*1\b|\bstarts?\b/i],
  ['Ends Tomorrow', /\bends?\s+tomorrow\b/i],
  ['Ends Today', /\bends?\s+today\b|\blast\s+(day|chance)\b|\bfinal\s+(day|hours)\b/i],
];

/** Read a brief. Never throws and never returns nothing: what it cannot find
 *  it fills with a placeholder and names in `placeholders`. */
/** @param text  the brief's markup, which carries its bold labels.
 *  @param plain  the same brief as rendered text, which carries its line
 *    breaks. Supplied by the panel; derived from the markup when a caller has
 *    only the one string. The two are kept apart deliberately: stripping tags
 *    out of markup recovers breaks only where the markup used a tag this knows
 *    about, and a flattened brief silently reads zero sends and zero
 *    categories rather than failing. */
export function readBrief(text: string, override?: CampaignType | '', plain?: string): Brief {
  const raw = text || '';
  const marks = labelled(raw);
  const t = (plain || '').trim() ? (plain as string) : plainText(raw);
  const placeholders: string[] = [];

  // A brief arrives as lines. Nearly every list rule here is anchored to one --
  // the sends, the category lists, the named concepts -- so a paste that lost
  // its line breaks does not fail, it quietly reads fewer of everything, and
  // the run then builds one email where the brief asked for seven. This is
  // structural and catches it whatever the brief says: a real brief is
  // hundreds of characters over many lines, and one long line is not a brief.
  const breaks = (t.match(/\n/g) || []).length;
  if (t.length > 400 && breaks < Math.max(3, t.length / 600))
    placeholders.push(`this brief arrived as ${breaks + 1} line(s) over ${t.length} characters — `
      + 'its line breaks were lost in the paste, and the email sends, category lists and '
      + 'concepts are read line by line. Expect fewer assets than the brief asks for.');
  if (Object.keys(marks).length) placeholders.push(
    `${Object.keys(marks).length} labelled field(s) read from the brief's own formatting`);
  /** What the author wrote under a bold label, where they used one. */
  const said = (...labels: string[]) => {
    for (const l of labels) {
      const v = marks[l];
      if (v) return v.split('\n')[0].trim();
    }
    return '';
  };

  // A stated type wins over anything read from the words.
  //
  //   Briefs are written however the campaign suits, and a spend-save brief
  //   that says 'extra 65% off' and never puts spend and save near each other
  //   reads as a bump -- which then grounds the whole run in the wrong design.
  //   Rather than keep widening rules against briefs nobody has seen, the
  //   panel can simply say which it is.
  // The ERP code is the campaign type in writing, and every brief carries one:
  //   SAC__Q3_All_All_20%_All_Bump_BUY3SAVE20SUMMER      -> bump
  //   SAC_2026_Q4_All_All_$75_All_Cart_SPEND300SAVE75OCT -> cart, a spend-save
  // It is a system identifier rather than prose, so it cannot be thrown off by
  // an email section or a turn of phrase, and it beats every other signal.
  const erp = t.match(/\bSAC_{1,2}[A-Za-z0-9_%$]{10,}/);
  const fromErp: CampaignType | '' = erp
    ? (/_Bump_/i.test(erp[0]) ? 'bump'
      : /_Cart_|SPEND\d+SAVE/i.test(erp[0]) ? 'spend-save'
      : /_Flash_/i.test(erp[0]) ? 'flash-sale' : '')
    : '';

  // 'Sale Type' is the author stating it outright.
  const saidType = said('sale type', 'campaign type').toLowerCase();
  const fromLabel: CampaignType | '' =
    /spend\s*(&|and)?\s*save/.test(saidType) ? 'spend-save'
    : /bump/.test(saidType) ? 'bump'
    : /flash/.test(saidType) ? 'flash-sale'
    : /named|holiday|memorial|labor/.test(saidType) ? 'named-sale' : '';
  const fromWords = TYPE_WORDS.find(([, re]) => re.test(t))?.[0] || '';
  const typeConfident = Boolean(override || fromErp || fromLabel || fromWords);
  let type: CampaignType = override || fromErp || fromLabel || fromWords || 'flash-sale';
  const typeWhy = override ? 'set in the panel'
    : fromErp ? `read from the ERP code ${erp![0].slice(0, 44)}`
    : fromLabel ? "taken from the brief's own 'Sale Type'"
    : fromWords ? 'read from the wording'
    : 'not stated anywhere, so only a starting suggestion';
  placeholders.unshift(`campaign type is ${type} — ${typeWhy}`);
  if (override) placeholders.push(`campaign type set to ${override} in the panel, not read from the brief`);
  else if (!typeConfident)
    placeholders.push('campaign type (no flash / bump / spend-save / named sale wording found) — '
      + 'Flash suggested, pick a template below if this guess is wrong');

  // The sale's name, where the brief gives one: up to three words running into
  // 'sale'. A bump is not usually named -- it is a code on an existing sale --
  // so an unnamed one gets no name line rather than an invented one.
  // [^\S\n] is "a space that is not a newline". \s matched newlines, so a
  // brief whose first line ended in a word and whose third said 'Sale' came
  // back named "EMAIL / CLAUDE INFO / SALE" -- three lines of the brief, set as
  // the sale's name across the whole campaign.
  // The headline the brief asks for, where it quotes one. SC26_0065 names its
  // overlay outright -- 'End-of-Season Blowout' -- and a rule that only looks
  // for a phrase ending in 'sale' finds nothing on a brief like that.
  // Many briefs simply state it: 'Sale Name: CHILLY20 Bump'. That beats both
  // the quoted overlay and the phrase-ending-in-sale rule, because it is the
  // author saying what the campaign is called rather than being inferred.
  // Briefs write it both ways: 'Sale Name: X' and 'Sale Name' with X on the
  // next line. Missing the second form let 'More On Sale Secondary Tiles',
  // buried in an email section, become the name of the whole campaign.
  const fromMark = said('sale name', 'campaign name');
  const stated = (fromMark ? [fromMark, fromMark] as RegExpMatchArray : null)
              || t.match(/\bsale\s*name\s*[:\-]\s*([^\n]{2,40})/i)
              || t.match(/^[ \t]*sale\s*name[ \t]*\n[ \t]*([^\n]{2,40})/im);
  const overlay = stated
               || t.match(/(?:overlays?|key\s+cop(?:y|ies)|headline)\s*[:\-]?[^"“]{0,40}["“]([^"”]{3,40})["”]/i)
               || t.match(/["“]([^"”]{3,40})["”]\s*(?:\+|and)\s*["“]/);
  const nameM = overlay || t.match(/\b((?:[A-Za-z']+[^\S\n]+){0,3}sale)\b/i);
  const DEFAULTS: Record<string, string> = {
    'flash-sale': 'FLASH SALE', 'spend-save': 'SPEND & SAVE', 'named-sale': 'SALE', bump: '',
  };
  let name = nameM ? nameM[1].trim().toUpperCase() : DEFAULTS[type];
  // A bump's headline is normally its offer, so a phrase merely ending in
  // 'sale' is not a name for one. A quoted overlay is different: SC26_0065 is
  // a bump and asks for 'End-of-Season Blowout' in as many words.
  if (type === 'bump' && nameM && !overlay) name = '';
  if (!nameM && DEFAULTS[type]) placeholders.push(`sale name (none found) — used "${DEFAULTS[type]}"`);

  // Spend-save boards are set in money -- 'EXTRA' over '$75 OFF' -- and the
  // first version only knew percentages, so a spend-save brief rewrote nothing
  // at all and the board's own numbers shipped.
  const spend = t.match(/\bspend\s*\$?\s*(\d{2,4})[\s\S]{0,40}?\bsave\s*\$?\s*(\d{2,4})/i)
             || t.match(/\bsave\s*\$?\s*(\d{2,4})[\s\S]{0,40}?\bwhen you spend\s*\$?\s*(\d{2,4})/i);
  const money = t.match(/\bextra\s*\$\s*(\d{2,4})\s*off/i) || t.match(/\b\$\s*(\d{2,4})\s*off\b/i);
  // The headline offer is the FIRST percentage the brief states, not the first
  // pattern this file happens to try. SC26_0065 says 'Save an Extra 20%' at
  // character 399 and 'Men's Apparel up to 65% off' at 1473, in an email
  // section listing per-category maximums -- and the run came back 65% because
  // 'up to' was tested before 'extra'.
  const saidOffer = said('offer', 'promo', 'discount');
  const primaryExtra = (saidOffer || t).match(/\bextra\s+(\d{1,2})\s*%/i);
  const pctAll = [...(saidOffer || t).matchAll(/\b(up\s*to|extra)?\s*(\d{1,2})\s*%/gi)]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  // Brand/category markdown may appear before the campaign overview. For a
  // bump, "extra N%" is the mechanic; "up to M%" on individual cards is not.
  const pct = type === 'bump' && primaryExtra
    ? ([primaryExtra[0], primaryExtra[1]] as unknown as RegExpMatchArray)
    : pctAll.length ? ([pctAll[0][0], pctAll[0][2]] as unknown as RegExpMatchArray) : null;

  /** The amounts the offer is made of, for rewriting a board set in money. */
  const amounts = spend ? { threshold: spend[1], saving: spend[2] }
                : money ? { threshold: '', saving: money[1] }
                : null;
  const percent = pct ? pct[1] : '';

  const offer = spend ? `SPEND $${spend[1]} SAVE $${spend[2]}`
    : money ? `EXTRA $${money[1]} OFF`
    : pct ? (/extra/i.test(pct[0]) || type === 'bump'
               ? `EXTRA ${pct[1]}% OFF` : `UP TO ${pct[1]}% OFF`)
    : (placeholders.push('offer (no percentage or amount found) — placeholder shown'), 'UP TO XX% OFF');

  // A promo code gets retyped by hand in several places across a real brief
  // -- a structured "Code" field, a Creative Direction line, a Campaign
  // Synopsis paragraph, a Key Messages bullet -- and only ONE of those
  // mentions has to have a typo for a transcription like ALPINE20/APLINE20
  // to end up on the board. Taking whichever regex matched first used to
  // mean whichever mention happened to come first in reading order won,
  // typo or not -- confirmed on SC26_0071, where the Campaign Synopsis
  // paragraph's own "using code APLINE20" sat before three separate,
  // correctly-spelled mentions and was the one that shipped. Every
  // code-shaped token in the brief is collected instead, and the spelling
  // repeated the most wins; a lone outlier spelling is reported as a
  // placeholder rather than silently trusted.
  const saidCode = said('code', 'promo code', 'coupon code');
  const codeCounts = new Map<string, number>();
  const seeCode = (tok: string, weight = 1) =>
    codeCounts.set(tok, (codeCounts.get(tok) ?? 0) + weight);
  // A clean, explicitly labelled field (an HTML brief's bold "Code:") is
  // strong evidence on its own -- weighted so it wins a majority vote
  // outright rather than merely tying with a typo repeated as often.
  if (/^[A-Z][A-Z0-9]{3,}$/.test(saidCode)) seeCode(saidCode, 1000);
  for (const m of t.matchAll(/\bcode\s*[:\-]?\s*([A-Z][A-Z0-9]{3,})\b/gi)) seeCode(m[1].toUpperCase());
  for (const m of t.matchAll(/\b([A-Z]{4,}\d{2,})\b/g)) seeCode(m[1]);
  const ranked = [...codeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const code = ranked[0]?.[0] ?? '';
  // Candidates that are plausibly the SAME code, misspelled: same length,
  // the same letters, just reordered -- a transposition, not a different
  // code naming a different promotion.
  const sameLetters = (a: string, b: string) => a.length === b.length
    && [...a].sort().join('') === [...b].sort().join('');
  const codeConflict = ranked.slice(1).find(([tok]) => sameLetters(tok, code));
  if (codeConflict) placeholders.push(
    `promo code appears as both "${code}" and "${codeConflict[0]}" in the brief — `
    + `used "${code}" (the spelling repeated more often); double-check the exact `
    + 'code against the source before this ships');
  // A board carries its own code in its artwork. If the brief names none, the
  // line cannot simply be left alone -- that ships CHILLY20 on someone else's
  // campaign -- so it becomes a visible blank for the author to fill.
  // 'no promo code required' is a statement about the campaign, not a gap in
  // the brief. SC26_0065 applies its discount in cart and says so four times;
  // blanking the board's code to XXXXXX would put a blank on artwork that
  // should carry no code line at all.
  const noCode = /\bno\s+(promo\s+)?code\b|\bwithout\s+a\s+code\b|\bautomatically\s+in\s+cart\b/i.test(t);
  const itemThreshold = t.match(/\b(?:buy|purchase|add)\s*(\d+)\s*\+\s*(?:eligible\s+|summer\s+)?(?:items?|products?)/i)
    || t.match(/\b(?:buy|purchase|add)\s*(\d+)\s+or\s+more\s+(?:eligible\s+|summer\s+)?(?:items?|products?)/i);
  const minimumItems = itemThreshold ? Number(itemThreshold[1]) : null;
  if (!code && noCode) placeholders.push('no promo code — the code line is removed, as the brief says the discount applies in cart');
  else if (!code) placeholders.push('promo code (none named) — any code on the board is blanked to XXXXXX');

  // How long it runs, as the brief states it: a day count, or the dates
  // themselves. SC26_0065 asks for 'October 20-26' on every site asset.
  const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const dur = t.match(/\b(\d+)\s*[- ]?\s*days?\s*only\b/i) || t.match(/\b(\d+)\s*[- ]?\s*day\s+(sale|event)\b/i);
  const countdown = t.match(/\bcountdown\s*timer\s*:\s*(\d+)\s*hours?\b/i);
  const span = t.match(new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2})\\s*[–\\-—to]+\\s*(?:(${MONTHS})\\s+)?(\\d{1,2})\\b`, 'i'));
  const duration = dur ? `${dur[1]} DAYS ONLY`
    : countdown ? `${Math.ceil(Number(countdown[1]) / 24)} DAYS ONLY`
    : span ? `${span[1].toUpperCase()} ${span[2]}–${span[4]}`
    : (placeholders.push('duration (no day count or date range found) — omitted'), '');
  const dates = (t.match(/^[ \t]*Dates?\s*:\s*([^\n]+)/im)?.[1]
    ?? t.match(new RegExp(`\\b(${MONTHS})\\s+\\d{1,2}\\s*[–\\-—]\\s*(?:${MONTHS}\\s+)?\\d{1,2}(?:,?\\s*\\d{4})?`, 'i'))?.[0]
    ?? '').trim();
  const section = (heading: string) => {
    const match = new RegExp(`^[ \\t]*${heading}\\s*:?\\s*\\n`, 'im').exec(t);
    if (!match) return '';
    const rest = t.slice(match.index + match[0].length);
    const end = rest.search(/\n\s*\n[ \t]*[A-Z][A-Za-z &/]{2,50}\s*:?\s*\n/);
    return (end >= 0 ? rest.slice(0, end) : rest).trim();
  };
  const creativeDirection = section('Creative Direction');
  const imageryDirection = (creativeDirection.match(/(?:Imagery|Photography)\s*:\s*([^\n]+)/i)?.[1]
    ?? creativeDirection.match(/Imagery\s+can\s+be[^.]+\./i)?.[0] ?? '').trim();
  const brands = section('Top Brand Cards').split('\n')
    .map(line => line.replace(/^[\s·•*\-]+/, '').replace(/\s*[–—-]\s*up\s*to\s*\d+%.*$/i, '').trim())
    .filter(line => line.length > 1 && line.length < 50);
  const keyMessages = section('Key Messages').split('\n')
    .map(line => line.replace(/^[\s·•*\-]+/, '').trim()).filter(Boolean);

  const phases = PHASE_WORDS.filter(([, re]) => re.test(t)).map(([p]) => p);
  if (!phases.length) { phases.push('Launch'); placeholders.push('phases (none named) — assumed Launch'); }

  // Site assets are read from the site-asset part of the brief, not from the
  // email plan.
  //
  //   The email block describes what sits INSIDE each send -- 'Section 2 -
  //   Lifestyle Category Tiles', 'Section 3 - 4 Simple Brand Tiles' -- and
  //   those are not deliverables in their own right; the email itself is, and
  //   it already contains them. Reading them as site assets produced a row of
  //   identical brand tiles nobody asked for.
  //   The plan is the heading followed by the sends themselves. A bare 'Email'
  //   in a 'Channels Assets Requested' list is a channel, not the plan, and
  //   cutting from there threw away the GT, CB and CPLP tiles listed below it.
  const planRe = /^[ \t]*emails?\s*:?[ \t]*$[\s\S]{0,200}?\bE\d{1,2}\s*[:\-–—]/im;
  const plan = t.match(planRe);
  const emailAt = plan ? (plan.index ?? -1) : -1;
  //   The plan ends at the next heading of any kind. Listing only three of
  //   them meant a brief that puts its CPLP tiles after the email plan lost
  //   them with it, and came back with one category tile instead of ten.
  const afterEmail = emailAt >= 0
    ? t.slice(emailAt + 1).search(
        /^[ \t]*(affiliates?|paid\s*social|site\s*assets?|site\s*experience|cplp\b|creative\s*direction|merch\s*direction|campaign\s*(details|synopsis)|key\s*messages|brands?\s*to|product\s*categories|additional\s*info|coupon\s*code|channels?\b|claude\s*info)\b/im)
    : -1;
  const siteText = emailAt < 0 ? t
    : t.slice(0, emailAt) + (afterEmail >= 0 ? t.slice(emailAt + 1 + afterEmail) : '');
  const hasEmail = /\bemail\b/i.test(t);
  const hasFullEmail = hasEmail && (/\bemail\s*(?:hero|body|campaign|send|blast|design|\d+)\b/i.test(t)
    || /^\s*E\d+\s*[:\-]/im.test(t));

  // Availability is not a request. The old ALWAYS list silently made formats
  // the brief did not ask for, which looked like random collateral in a sheet.
  const askedFor = FORMAT_WORDS
    .filter(([f, re]) => f === 'email-hero' ? hasFullEmail
      : f === 'email-body' ? hasFullEmail || re.test(t)
      : f === 'text-banner' ? re.test(t) : re.test(siteText))
    .map(([f]) => f);
  const formats = [...new Set(askedFor)]
    .sort((a, b) => FORMAT_ORDER.indexOf(a) - FORMAT_ORDER.indexOf(b));
  const quantities: Record<string, number> = {};
  const countHeads: [string, RegExp][] = [
    ['hero-desktop', /^\s*(?:HP\s*)?Hero\s*[x×]\s*(\d+)/im],
    ['gt', /^\s*(?:Global\s*Text|GT)\s*[x×]\s*(\d+)/im],
    ['cb', /^\s*(?:Campaign\s*Banner|CB)\s*[x×]\s*(\d+)/im],
    ['homepage-card-4x3', /\bhomepage\b[^\n]{0,80}?\b(?:row|cards?)\b[^\n]{0,35}?(\d+)\s*cards?\b/im],
    ['email-body', /\b(\d+)\s*[x×]?\s*secondar(?:y|ies)\b/i],
    ['text-banner', /\b(\d+)\s*[x×]?\s*text\s*banners?\b/i],
    ['text-link', /\b(\d+)\s*[x×]?\s*(?:affiliate\s*)?text\s*links?\b/i],
  ];
  for (const [format, re] of countHeads) {
    const source = format === 'text-banner' || format === 'email-body' ? t : siteText;
    const count = Number(source.match(re)?.[1] ?? 0);
    if (count > 0) quantities[format] = Math.min(count, 50);
  }
  const socialSets = Number((siteText.match(/\bpaid\s*social\b[^\n]{0,80}?\b(\d+)\s*(?:sets?|ads?)\b/i)
    ?? siteText.match(/\b(\d+)\s*sets?\s*(?:of\s*)?ads?\b/i))?.[1] ?? 0);
  if (socialSets > 0) for (const format of ['paid-social-1x1','paid-social-4x5','paid-social-9x16'])
    quantities[format] = Math.min(socialSets, 50);
  const offerCount = quantities['homepage-card-4x3'] ?? quantities.cb
    ?? Number(t.match(/\b(\d+)\s*(?:offers?\s*)?total\b/i)?.[1] ?? 0);
  if (offerCount > 0) for (const format of ['text-link', 'rules-page'])
    if (formats.includes(format) && (quantities[format] ?? 1) <= 1
      && t.split('\n').some(line => /\bper\s+offer\b/i.test(line)
        && (format === 'text-link' ? /\btext\s*links?\b/i.test(line)
          : /\brules?\s*pages?\b/i.test(line))))
      quantities[format] = Math.min(offerCount, 50);

  // The imagery direction, where the brief gives one. SC26_0065 asks for
  // hiking, climbing, biking, camping and fishing and says to avoid snow.
  const PURSUIT_WORDS: [string, RegExp][] = [
    ['hike', /\bhiking\b|\bhike\b|\btrail\b/i],
    ['camp', /\bcamping\b|\bcamp\b/i],
    ['climb', /\bclimbing\b|\bclimb\b/i],
    ['water-swim', /\bfishing\b|\bswim\b|\bwater\b|\bpaddle\b/i],
    ['product-gear', /\bproduct\s+imagery\b|\bgear\s+shot/i],
  ];
  const skiAsked = /\bski\b|\bsnowboard\b|\bsnow\b|\bpowder\b|\bmountain\s+opens?\b/i.test(t);
  const asked = PURSUIT_WORDS.filter(([, re]) => re.test(t)).map(([p]) => p);
  const avoidsWinter = /\bavoid\s+(snow|winter)|no\s+(snow|winter)\b|warm[- ]weather\b/i.test(t);
  const pursuit = asked[0] ?? '';
  if (skiAsked) placeholders.push('the brief asks for ski and snow imagery; the published gallery '
    + 'has no ski pursuit, so photography stays as the board has it unless you pick one in the panel');
  if (pursuit) placeholders.push(`imagery reads as ${asked.join(', ')}`
    + (avoidsWinter ? ' and the brief says to avoid winter' : '')
    + ` — photographs drawn from ${pursuit} unless the panel says otherwise`);

  // 'CPLP Text Links:' followed by a list is the clearest statement of how
  // many category tiles a campaign needs. Falling back to a 'Categories:' line.
  // The heading must end in a colon and be followed by a list. 'CPLP Tile'
  // sitting in a Site Assets list is the name of an asset, not a list of
  // categories, and matching it swallowed the email section that came after.
  // A line up to 72 characters, and a line that is only a parenthetical
  // qualifier does not end the run.
  //
  //   A real brief writes its CPLP list as a name and then a bracketed
  //   explanation of what it covers:
  //
  //     Men's Tops
  //     (all activewear, hoodies, shirts, t-shirts, etc.)
  //     Women's Tops
  //
  //   At 40 characters that second line stopped the run after one item, which
  //   is below the two-line minimum, so the whole match failed and a brief
  //   naming seven categories produced none at all.
  const LIST = '((?:[ \\t]*[^\\n:]{2,72}\\n){2,40})';
  // CPLP first, and only from the site-asset text.
  //
  //   A generic 'Categories:' rule matched 'Included Categories: Men's Apparel
  //   up to 65% off | ...' inside an email section and took four category
  //   tiles where the brief's own CPLP list has nine. The CPLP heading is the
  //   statement of what tiles are needed; everything else is a fallback.
  const catBlock = siteText.match(new RegExp(`^[ \\t]*cplp\\s+(?:text\\s+links?|tiles?)\\s*:[ \\t]*\\n${LIST}`, 'im'))
                || siteText.match(/^[ \t]*cplp\s+tiles?\s*:[ \t]*([^\n]{20,300})/im)
                || siteText.match(new RegExp(`^[ \\t]*product\\s+categories\\s+to\\s+include\\s*:?[ \\t]*\\n${LIST}`, 'im'))
                || siteText.match(new RegExp(`^[ \\t]*(?:featured\\s+)?categories\\s+to\\s+include\\s*:?[ \\t]*\\n${LIST}`, 'im'))
                || siteText.match(/^[ \t]*(?:included|featured)\s+categories\s*:[ \t]*([^\n]{20,300})/im)
                || siteText.match(/^[ \t]*categories\s*:[ \t]*([^\n]{10,200})/im);
  // A labelled list keeps every line, not just the first.
  const markedCats = (marks['cplp tiles'] || marks['cplp text links'] || marks['cplp tile']
    || marks['product categories to include'] || marks['categories to include']
    || marks['included categories'] || marks['featured categories'] || marks['categories']
    || marks['cplp rules page'] || '')
    .split('\n').map(c => c.replace(/^[\s·\-*•]+/, '').trim())
    .filter(c => c.length > 2 && c.length < 34 && /[a-z]/i.test(c)
      && !/^section\b|^e\d\b|^cta\b|^tb\b|:/i.test(c));
  const categories = markedCats.length ? markedCats : catBlock
    ? catBlock[1].split(/\n/)
        .map(c => c.replace(/^[\s·\-*•]+/, '').replace(/\s*up\s*to\s*\d{1,2}\s*%\s*off\s*$/i, '').trim())
        // A line wholly in brackets explains the line above it; it is not a
        // category of its own.
        .filter(c => !/^\(.*\)$/.test(c))
        .flatMap(c => c.split(/\s*[|,]\s*(?![^(]*\))/))
        .map(c => c.trim())
        .filter(c => c.length > 2 && c.length < 34 && /[a-z]/i.test(c)
          && !/^section\b|^e\d\b|^cta\b|^tb\b|^design\b|^copy\b|^merch\b|:/i.test(c))
    : [];
  if (categories.length) placeholders.push(`${categories.length} categories named — `
    + `a CPLP tile for each: ${categories.slice(0, 4).join(', ')}${categories.length > 4 ? '…' : ''}`);

  // The sends. Briefs number them E1..En and write the date and the angle on
  // the same line, in every punctuation anyone has ever used:
  //   'E1: 10/10 — Launch'   'E2 - 10/3: Sustain'   'E4 - 10/5: Final Hrs'
  const sends: Brief['sends'] = [];
  // Not anchored to the start of a line. The shape -- E, a number, a
  // separator, a date, a separator -- is distinctive enough on its own, and
  // anchoring meant a paste that lost its line breaks lost every send with
  // them. A brief asking for E1 to E7 came back with one email.
  //   The angle ends where the next thing begins: a TB line, a Section, a CTA,
  //   or the next send. Without naming the next send by its full shape, 'E2 -
  //   10/3: Sustain E3 - 10/4: Ends Tmr' ran all three into one label.
  /** What the brief writes under one send, up to where the next one begins.
   *  The Design: line is the imagery direction for that email specifically,
   *  and TB: is its teaser bar. Both were being read past. */
  const blockOf = (at: number) => {
    const rest = t.slice(at);
    const nextAt = rest.slice(1).search(/\bE\d{1,2}\s*[:\-\u2013\u2014]\s*(?:\d{1,2}\/|[A-Z])/);
    const block = nextAt > 0 ? rest.slice(0, nextAt + 1) : rest;
    const design = (block.match(/^[ \t]*design\s*[:\-]\s*([^\n]{3,300})/im) || [, ''])[1].trim();
    const tb = (block.match(/^[ \t]*TB\s*[:\-]\s*([^\n]{2,80})/im) || [, ''])[1].trim();
    // The send's own words decide its photography; the brief's overall
    // direction is the fallback, and 'same build as the launch' inherits.
    const here = PURSUIT_WORDS.filter(([, re]) => re.test(design)).map(([x]) => x);
    return { design, tb, pursuit: here[0] ?? '' };
  };

  const sendRe = /\b(E\d{1,2})\s*[:\-–—]\s*(\d{1,2}\/\d{1,2})\s*[:\-–—]?\s*([^\n]{2,40}?)(?=\s*(?:TB\b|Section\b|CTA\b|Copy\b|Design\b|Headline\b|E\d{1,2}\s*[:\-–—]\s*\d{1,2}\/)|\n|$)/gi;
  for (let m = sendRe.exec(t); m; m = sendRe.exec(t)) {
    const label = m[3].replace(/\s*[:\-–—]\s*$/, '').trim();
    // 'Preseason Ski: Ends Tmr' -- the angle is after the last colon.
    const short = label.includes(':') ? label.slice(label.lastIndexOf(':') + 1).trim() : label;
    sends.push({ id: m[1].toUpperCase(), date: m[2], label: short,
                 ...blockOf(m.index) });
  }
  // The brief states its own total, so the parse can be checked against it
  // rather than trusted. Every E-number written as a heading -- 'E1:', 'E4 —'
  // -- is a send the author declared, whether or not the line that follows is
  // in a shape the rule above understands. If a declared send did not come
  // out, something was missed, and saying which one is the difference between
  // 'a lot of assets are missing' and a one-line fix.
  const declared = new Set<string>();
  const decRe = /\bE(\d{1,2})\s*[:\-–—]/gi;
  for (let m = decRe.exec(t); m; m = decRe.exec(t)) declared.add('E' + Number(m[1]));
  const got = new Set(sends.map(x => x.id));

  // A declared send the rule above did not read is still an email somebody
  // expects to see. The rule wants a date because that is what tells 'E2 -
  // 10/3: Sustain' from a stray 'E3' in prose; a send written without one --
  // 'E3 - Brand Spotlight' -- is a real shape and was simply lost. So the
  // leftovers get a second, looser pass, applied ONLY to the numbers the brief
  // declared and the first pass missed. Reporting the gap is not the same as
  // covering it, and coverage is the point.
  for (const id of declared) {
    if (got.has(id)) continue;
    const loose = new RegExp('\\b' + id + '\\s*[:\\-\u2013\u2014]\\s*([^\\n]{2,60})', 'i');
    const hit = loose.exec(t);
    if (!hit) continue;
    const label = hit[1].replace(/\s*[:\-\u2013\u2014]\s*$/, '').trim();
    const short = label.includes(':') ? label.slice(label.lastIndexOf(':') + 1).trim() : label;
    if (!short) continue;
    sends.push({ id, date: '', label: short, ...blockOf(hit.index) });
    got.add(id);
  }
  sends.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

  const sendsMissing = [...declared].filter(id => !got.has(id))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  if (sends.length) placeholders.push(`${sends.length} email send(s) named `
    + `(${sends.map(x => `${x.id} ${x.label}`).join(', ')}) — a hero for each; `
    + 'the sections beneath them are not in the library');
  if (sendsMissing.length) placeholders.unshift(
    `${sendsMissing.join(', ')} named in the brief but not read — expected `
    + `${declared.size} email send(s), parsed ${sends.length}. Those emails will not be built.`);
  else if (!sends.length && /\bemails?\b/i.test(t) && declared.size === 0)
    placeholders.push('no email sends found. If the brief lists E1, E2\u2026 and this says none, '
      + 'the paste lost its line breaks.');

  // Paid-social concepts, where the brief names them.
  const concepts: Brief['concepts'] = [];
  const conRe = /^[ \t]*concept\s*(\d)\s*[:\-–—]\s*([^\n]{2,60})/gim;
  for (let m = conRe.exec(t); m; m = conRe.exec(t)) {
    const after = t.slice(m.index, m.index + 400);
    const head = after.match(/\bheadline\s*[:\-]\s*([^\n]{2,60})/i);
    const sub = after.match(/\bsubhead\s*[:\-]\s*([^\n]{2,100})/i);
    const cta = after.match(/\bCTA\s*[:\-]\s*([^\n]{2,60})/i);
    concepts.push({ name: m[2].replace(/\s*\(.*$/, '').trim(),
                    headline: (head ? head[1] : m[2]).trim(),
                    subhead: sub?.[1].trim(), cta: cta?.[1].trim() });
  }
  if (concepts.length > 1) placeholders.push(`${concepts.length} paid-social concepts named `
    + `(${concepts.map(c => c.name).join(', ')}) — each ratio is built once per concept`);

  return { type, typeConfident, percent, amounts, name, offer, code, noCode, minimumItems,
    pursuit, categories, sends, concepts,
           sendsDeclared: declared.size, sendsMissing,
           duration, dates, creativeDirection, imageryDirection, brands,
           keyMessages, phases, formats, quantities, placeholders };
}

export type Match = {
  board: Board;
  score: number;
  /** One line a designer can read: why this board and not another. */
  why: string;
  /** Formats the brief asked for that this board does not carry. */
  missing: string[];
  runnersUp: { campaign: string; score: number }[];
};

/** Choose the reference board nearest the brief.
 *
 *  Campaign type dominates, because a bump and a spend-save are different
 *  designs rather than different copy. Format coverage comes next: a board that
 *  carries every format asked for can ground the whole run, and one that
 *  carries half of it leaves half the run guessing. A mismatch degrades the
 *  result rather than blocking it -- the nearest board still grounds, and what
 *  it cannot cover is named. */
export function matchBoard(brief: Brief, boards: Board[] = BOARDS): Match {
  const scored = boards.map(board => {
    const has = new Set(board.assets.map(a => a.format));
    const covered = brief.formats.filter(f => has.has(f));
    const phases = new Set(board.assets.flatMap(a => a.phases ?? []));
    const phaseHits = brief.phases.filter(p => phases.has(p)).length;
    const score =
      (board.type === brief.type ? 100 : 0)
      + (brief.formats.length ? (covered.length / brief.formats.length) * 60 : 0)
      + (brief.phases.length ? (phaseHits / brief.phases.length) * 15 : 0)
      + Math.min(board.assets.length / 50, 5);   // a fuller board is a better template
    return { board, score, covered, has };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const missing = brief.formats.filter(f => !top.has.has(f));
  const sameType = top.board.type === brief.type;
  const why =
    `${top.board.campaign} — ${sameType ? `a ${brief.type} board, like the brief`
      : `the nearest board, though it is a ${top.board.type} and the brief reads ${brief.type}`}`
    + `, carrying ${top.covered.length} of the ${brief.formats.length} format(s) asked for`
    + (missing.length ? ` (no ${missing.join(', ')})` : '')
    + `. ${top.board.assets.length} measured assets.`;

  return { board: top.board, score: Math.round(top.score), why, missing,
           runnersUp: scored.slice(1, 4).map(s => ({ campaign: s.board.campaign, score: Math.round(s.score) })) };
}
