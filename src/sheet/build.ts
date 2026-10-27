/** Brief × template → a sheet covering every asset type the template carries.
 *
 *  The split the whole studio rests on: the TEMPLATE decides the look, the
 *  BRIEF decides the content and the count. Picking SC26_0047 does not change
 *  how many emails a seven-send brief wants, and a brief naming nine
 *  categories gets nine CPLP tiles whichever board it is grounded in.
 *
 *  Scope expansion is what turns 16 formats into an asset list: emails go per
 *  send, CPLP tiles per category, paid social per named concept, and any
 *  format whose board measured phases goes once per phase. Everything else is
 *  a single asset.
 */
import { readBrief, type Brief } from '../model/brief';
import { readSends, impliedSend, type Send } from '../model/sections';
import { copyFor, copyFromAi } from '../model/copy';
import { templateById, type Template, type FormatSpec } from '../templates/registry';
import { photoFor, pursuitOf } from '../model/compose';
import { assetId, type Sheet, type SheetAsset, type Scope, type Copy } from './types';
import { EMPTY } from '../edit/store';
import type { AiParse, AiSend } from '../ai/types';

const PURSUIT_WORDS: [string, RegExp][] = [
  ['hike', /\bhiking\b|\bhike\b|\btrail\b/i], ['camp', /\bcamping\b|\bcamp\b/i],
  ['climb', /\bclimbing\b|\bclimb\b/i],
  ['water-swim', /\bfishing\b|\bswim\b|\bwater\b|\bpaddle\b/i],
  ['product-gear', /\bproduct\b|\bgear\b|\bapparel\b/i],
];

const sendPursuit = (s: Send, b: Brief) => {
  const hero = s.sections.find(x => x.kind === 'hero');
  const words = hero && hero.kind === 'hero' ? hero.design : '';
  return PURSUIT_WORDS.find(([, re]) => re.test(words))?.[0] ?? b.pursuit;
};

/** One asset's worth of scope. A format is expanded along exactly one of
 *  these axes, because expanding along two at once gives 7 sends x 9
 *  categories and nobody asked for 63 of anything. */
function scopesFor(f: FormatSpec, b: Brief, sends: Send[],
                   plan?: Sheet['plan']): { scope: Scope; label: string }[] {
  // The BRIEF names the phases, not the board.
  //
  //   This read f.phases — what the REFERENCE measured — so two identical
  //   briefs got different asset counts purely from which board was picked:
  //   SC26_0060 publishes its hero in a Launch and an Ends Today phase, so a
  //   bump campaign silently built two heroes, two GTs and two CBs, while the
  //   same brief on SC26_0047 built one of each. The board says what a thing
  //   looks like. It does not say how many of them a campaign has.
  const named = plan?.phases ?? b.phases;
  const quantity = Math.max(1, plan?.quantities?.[f.format] ?? b.quantities[f.format] ?? 1);

  if (/^email-/.test(f.format) && sends.length) {
    // A designer asking for three emails where the brief named one gets three.
    // The extras are numbered on from the last the brief gave.
    const requested = b.quantities[f.format] ?? sends.length;
    // A full E1..En email plan needs a body for each send. A separate
    // "3 secondaries" line is not a reason to drop E4 and E5's email bodies.
    // Manual quantities remain an intentional override.
    const want = Math.max(1, plan?.quantities?.[f.format] ?? plan?.sends
      ?? (f.format === 'email-body' && b.formats.includes('email-hero')
        ? Math.max(requested, sends.length) : requested));
    const list = Array.from({ length: want }, (_, i) =>
      sends[i] ?? { ...sends[sends.length - 1], id: `E${i + 1}`,
                    label: `${sends[sends.length - 1].label} ${i + 1}` });
    return list.map(s => ({ scope: { send: s.id }, label: `${s.id} ${s.label}` }));
  }

  if (f.format === 'cplp-tile' && b.categories.length) {
    const want = plan?.quantities?.[f.format] ?? b.quantities[f.format] ?? b.categories.length;
    return Array.from({ length: Math.max(0, want) }, (_, i) => {
      const c = b.categories[i] ?? `Category ${i + 1}`;
      return { scope: { category: c }, label: c };
    });
  }

  if (/^paid-social-/.test(f.format)) {
    const want = plan?.quantities?.[f.format] ?? plan?.concepts ?? b.quantities[f.format]
      ?? (b.concepts.length > 1 ? b.concepts.length : 0);
    if (want > 1 || (want >= 1 && b.concepts.length))
      return Array.from({ length: Math.max(want, 1) }, (_, i) => {
        const c = b.concepts[i];
        return { scope: { concept: c?.name ?? `Concept ${i + 1}` },
                 label: c?.name ?? `Concept ${i + 1}` };
      });
  }

  // Reference boards often show Launch and Ends Today examples beside one
  // another. Those are evidence of possible treatments, not a request for two
  // deliverables. One asset is the default; only the brief-specific axes above
  // or an explicit manual quantity add more.
  // The AI's per-deliverable "messages" are usually just evidence of WHICH
  // instance a deliverable is (a hero noted as "Launch", a paid social noted
  // as "Flash Sale"), so a brief asking for several of one format can tell
  // them apart -- not a line meant to print verbatim. But one brief's single
  // paid social legitimately names a distinct concept ("Trail socks") that
  // drives both its copy and its photo match, and that IS meant to carry
  // through as scope.topic. The distinguishing test: does the message say
  // anything beyond the sale's own name or one of its phases? If it's just
  // restating "Launch" or "Flash Sale", it's a label, not content.
  const genericLabels = new Set([b.name, ...named].filter(Boolean).map(x => x!.trim().toLowerCase()));
  return Array.from({ length: quantity }, (_, i) => {
    const rawTopic = b.deliverableMessages?.[f.format]?.[i];
    const topic = rawTopic && !genericLabels.has(rawTopic.trim().toLowerCase()) ? rawTopic : undefined;
    const phase = quantity > 1 ? named[i] : named.length === 1 ? named[0] : undefined;
    return {
      scope: { ...(topic ? { topic } : {}), ...(phase ? { phase } : {}),
        ...(i ? { instance: i + 1 } : {}) },
      label: topic ?? phase ?? (i ? `Version ${i + 1}` : 'All'),
    };
  });
}

function initialEmailVariant(templateId: string, send?: Send): string {
  if (!send) return 'base';
  const angle = `${send.label} ${send.tb}`.toLowerCase();
  const hero = send.sections.find(section => section.kind === 'hero');
  const direction = hero?.kind === 'hero' ? hero.design.toLowerCase() : '';
  if (templateId === 'sc26_0021')
    return /ends?\s+tomorrow/.test(angle) ? 'tomorrow'
      : /ends?\s+today|last\s+(day|chance)|final\s+hours/.test(angle) ? 'today'
      : /sustain/.test(angle) && /brand\s+logos|brand\s+spotlight/.test(direction) ? 'tomorrow'
      : 'launch';
  if (templateId === 'sc26_0060')
    return /final\s+hours|last\s+chance|ends?\s+today/.test(angle) ? 'send-3'
      : /ends?\s+tomorrow/.test(angle) ? 'send-2' : 'send-1';
  return 'base';
}

/** What this asset says. The brief supplies the numbers; the send's own angle
 *  supplies the rest where there is one. */
function copyFor_(f: FormatSpec, scope: Scope, b: Brief, sends: Send[],
                  aiById: Map<string, AiSend>): { copy: Copy; because: string } {
  const send = scope.send ? sends.find(s => s.id === scope.send) : undefined;
  const pct = b.percent || '20';
  const code = b.noCode ? '' : b.code;

  if (send) {
    const read = aiById.get(send.id);
    const c = read ? copyFromAi(read, b) : copyFor(send, b);
    const t = c.ticket;
    return {
      copy: {
        eyebrow: c.eyebrow, marquee: c.marquee, body: c.body, cta: c.cta,
        lead: t.kind === 'stacked' ? t.lead : t.lead,
        offer: t.kind === 'stacked' ? t.offer : t.offer,
        markdown: t.kind === 'stacked' ? t.markdown : undefined,
        qualifier: t.foot, code: code || undefined,
        ...(read?.copy?.headline ? { offer: read.copy.headline } : {}),
        ...(read?.copy?.body ? { body: read.copy.body } : {}),
        ...(read?.copy?.cta ? { cta: read.copy.cta } : {}),
        ...(read?.copy?.subject ? { subject: read.copy.subject } : {}),
        ...(read?.copy?.preview ? { preview: read.copy.preview } : {}),
        // Same pattern as the five above: a literal line the brief actually
        // stated overrides the angle-vocabulary table's stock word ('EXTRA',
        // '3 DAYS ONLY', 'NO CODE NEEDED') instead of being discarded.
        ...(read?.copy?.eyebrow ? { eyebrow: read.copy.eyebrow } : {}),
        ...(read?.copy?.marquee ? { marquee: read.copy.marquee } : {}),
        ...(read?.copy?.qualifier ? { qualifier: read.copy.qualifier } : {}),
      },
      because: c.because,
    };
  }

  if (scope.category)
    return {
      copy: { eyebrow: 'SHOP', offer: scope.category, cta: 'Shop Now',
              qualifier: b.offer || `EXTRA ${pct}% OFF` },
      because: `the brief lists ${scope.category} among its CPLP tiles`,
    };

  if (scope.concept) {
    const con = b.concepts.find(x => x.name === scope.concept);
    return {
      copy: { eyebrow: scope.concept, lead: 'EXTRA', offer: `${pct}% OFF`,
              body: con?.headline, cta: con?.cta || 'Shop Now',
              qualifier: con?.subhead || b.duration,
              marquee: b.duration, code: code || undefined },
      because: `the brief names this paid-social concept: ${con?.headline ?? scope.concept}`,
    };
  }

  if (scope.topic) return {
    copy: { eyebrow: b.name, lead: '', offer: scope.topic, body: scope.topic,
      marquee: b.duration, qualifier: b.noCode ? 'No code needed' : b.code,
      cta: 'Shop Now', code: code || undefined },
    because: `the brief requests this exact offer: ${scope.topic}`,
  };

  const urgent = scope.phase && /ends/i.test(scope.phase);
  // Every run falls back to something a campaign always has. A brief that
  // names no sale and states no date range left the eyebrow and the marquee
  // empty strings, so the artwork drew blank lines where its headings go.
  const offerLine = b.offer || `EXTRA ${pct}% OFF`;
  return {
    copy: {
      eyebrow: (scope.phase || b.name || offerLine).toUpperCase(),
      lead: 'EXTRA', offer: `${pct}% OFF`,
      cta: 'Shop Now', qualifier: b.noCode
        ? b.minimumItems ? `on ${b.minimumItems}+ eligible items · no code`
          : 'No code needed'
        // A brief with no code at all (neither "no code needed" nor a
        // stated one) fell through to the literal string "Code " with
        // nothing after it -- a label with no value, not a real qualifier.
        : b.code ? `Code ${b.code}` : '',
      marquee: (urgent ? scope.phase! : (b.duration || b.name || offerLine)).toUpperCase(),
      code: code || undefined, body: b.offer || offerLine,
    },
    because: scope.phase
      ? `the brief names a ${scope.phase} phase and this format carries one`
      : 'one of the standard deliverables, built for every campaign',
  };
}

/** Claude's reading, with the deterministic parse behind it.
 *
 *  The pattern parser is exact on anything with a shape and silent on anything
 *  phrased a way it has not seen. A real brief listed seven categories under
 *  'CPLP Text Links:' with a bracketed qualifier under each, and it returned
 *  none -- not wrongly, just blankly. That is the failure mode: not a bad
 *  answer, no answer, and a campaign of eighteen assets where there should
 *  have been forty.
 *
 *  So the model leads on everything that is written in prose -- what the sale
 *  is called, which categories, which sends, what each send is for -- and the
 *  parser leads on anything with a shape it can verify. Where only one of them
 *  found something, that one is used; where they disagree, the panel shows it
 *  and nobody is overruled quietly.
 */
function merge(code: Brief, ai?: AiParse, source = ''): Brief {
  if (!ai) return code;
  const pick = <T,>(a: T, b: T, empty: (x: T) => boolean) => (empty(a) ? b : a);
  const blank = (x: string) => !x || !x.trim();
  const none = (x: unknown[]) => !x?.length;
  const supportedExtra = !!ai?.percent && new RegExp(`\\bextra\\s+${ai.percent}\\s*%`, 'i').test(source);
  const claimed = (ai.deliverables ?? []).filter(d =>
    typeof d?.format === 'string' && /^[a-z][a-z0-9-]*$/.test(d.format)
    && Number.isInteger(d.count) && d.count > 0 && d.count <= 50
    && typeof d.evidence === 'string' && !!d.evidence.trim());
  // UNION with the regex parser's own formats, not AI-replaces-code. A real
  // brief mixes a labeled "Site Assets Requested" list with separately
  // detailed Email/CPLP/Paid Social/Badging sections elsewhere in the same
  // document, and the model has repeatedly anchored on the labeled list and
  // dropped the rest -- different sections dropped on different briefs, so
  // no prompt wording has made this reliable. The regex parser's own
  // keyword patterns already catch the standard ones correctly every time
  // (confirmed against several real briefs); the model still contributes
  // whatever custom deliverable it names that the parser has no pattern
  // for. Losing code.formats entirely over an incomplete AI list is a much
  // worse failure than occasionally keeping a format the brief did not ask
  // for, so union, never replace.
  const aiFormats = claimed.length ? claimed.map(d => d.format)
    : ai.assets?.length ? ai.assets.filter(x => /^[a-z][a-z0-9-]*$/.test(x)) : [];
  const formats = [...new Set([...code.formats, ...aiFormats])];
  const quantities = { ...code.quantities };
  const deliverableMessages: Record<string, string[]> = {};
  for (const d of claimed) {
    quantities[d.format] = d.count;
    if (Array.isArray(d.messages)) deliverableMessages[d.format] = d.messages
      .filter(x => typeof x === 'string' && !!x.trim()).slice(0, d.count);
  }
  return {
    ...code,
    formats, quantities, deliverableMessages,
    // Written in prose: the model leads.
    name: pick(ai.name, code.name, blank),
    categories: pick(ai.categories, code.categories, none),
    concepts: pick(ai.concepts, code.concepts, none).map((c,i) => ({ ...c,
      subhead: (code.concepts.find(x => x.name === c.name) ?? code.concepts[i])?.subhead,
      cta: (code.concepts.find(x => x.name === c.name) ?? code.concepts[i])?.cta })),
    phases: pick(ai.phases, code.phases, none),
    offer: pick(ai.offer, code.offer, blank),
    pursuit: pick(ai.pursuit, code.pursuit, blank),
    dates: pick(ai.dates ?? '', code.dates ?? '', blank),
    creativeDirection: pick(ai.creativeDirection ?? '', code.creativeDirection ?? '', blank),
    imageryDirection: pick(ai.imageryDirection ?? '', code.imageryDirection ?? '', blank),
    brands: pick(ai.brands ?? [], code.brands ?? [], none),
    keyMessages: pick(ai.keyMessages ?? [], code.keyMessages ?? [], none),
    // Shaped, and checkable: the parser leads, and the model fills a blank.
    // A card's "up to 50%" is not the campaign's "extra 20%". Claude's
    // number wins only when the brief itself says "extra 20%".
    percent: supportedExtra ? ai.percent : pick(code.percent, ai.percent, blank),
    code: pick(code.code, ai.code, blank),
    duration: pick(code.duration, ai.duration, blank),
    // A literal keyword match ("no code", "without a code", "automatically in
    // cart") -- the regex parser is authoritative here, not a fact the model
    // ever needs to supply. OR-ing in ai.noCode meant one hallucinated true
    // (confirmed: asserted on a brief that never mentions a code at all)
    // permanently forced every "No code needed" qualifier campaign-wide.
    noCode: code.noCode,
    type: code.type,
  };
}

/** One canonical campaign reading for building AND rendering. */
export function resolveBrief(text: string, html?: string, ai?: AiParse): Brief {
  return merge(readBrief(html || text, '', text), ai, text);
}

export function buildSheet(briefText: string, templateId: string, name?: string,
                           html?: string, ai?: AiParse, plan?: Sheet['plan']): Sheet {
  const t: Template | undefined = templateById(templateId);
  if (!t) throw new Error(`unknown template: ${templateId}`);
  const brief = resolveBrief(briefText, html, ai);
  const parsed = readSends(briefText);
  // The model decides how many sends there are and what each is for; the
  // section stack still comes from the brief's own structure where it has one,
  // because that is a list of parts, not a reading of intent.
  const sends: Send[] = ai?.sends?.length
    ? ai.sends.map(a => {
        const found = parsed.find(x => x.id === a.id);
        return { id: a.id, date: found?.date ?? '', label: a.label || found?.label || a.id,
          tb: a.tb || found?.tb || '', sections: found?.sections ?? [] };
      })
    : parsed.length ? parsed
    // A brief asking for email without numbering sends still wants an email.
    : [impliedSend(brief.name)];
  const aiById = new Map((ai?.sends ?? []).map(a => [a.id, a]));

  // A real brief numbered two different sends E3 (10/4 Ends Tmr and 10/5 Ends
  // Tdy). Asset ids are derived from the scope, so a typo like that collides
  // two deliverables onto one id -- which React drops one of, and which would
  // land two Figma frames on the same stamp. The ids are made unique and the
  // card says why, rather than one of the two quietly disappearing.
  const twice = new Set(sends.map(s => s.id)
    .filter((id, i, all) => all.indexOf(id) !== i));
  const used = new Set<string>();

  // Only what was asked for. A brief requesting a hero, a banner and email
  // does not want a logo strip and two badging mocks as well -- that was
  // fifteen formats for every campaign whatever it said.
  const asked = plan?.formats?.length ? plan.formats : brief.formats;
  const wanted = new Set(asked);
  const building = t.formats.filter(f => wanted.has(f.format));
  // Requested formats absent from the selected board are *custom boards*,
  // never a fourth visual template and never a borrowed campaign composition.
  for (const format of asked.filter(format => !t.formats.some(f => f.format === format))) {
    if (!/^[a-z][a-z0-9-]*$/.test(format)) continue;
    building.push({ format, size: [1200, 900], measured: { assets: 0, sizes: 0 },
      ground: { role: 'custom' }, elements: [], phases: [], basis: 'standard' });
  }

  const assets: SheetAsset[] = [];
  for (const f of building) {
    const scopes = scopesFor(f, brief, sends, plan);
    scopes.forEach((s, i) => {
      const { copy, because: why } = copyFor_(f, s.scope, brief, sends, aiById);
      const because = s.scope.send && twice.has(s.scope.send)
        ? `${why} (the brief gives this number to more than one send)`
        : why;
      const send = s.scope.send ? sends.find(x => x.id === s.scope.send) : undefined;
      // The model reads the imagery direction per send; the keyword scan is
      // the fallback for a brief it did not see.
      const pursuit = send
        ? (aiById.get(send.id)?.pursuit || sendPursuit(send, brief))
        : brief.pursuit;
      // A CPLP tile's picture IS its category, so it keeps the one the board
      // published; everything else spreads across the cluster by index.
      const photo = f.format === 'cplp-tile'
        ? undefined
        : photoFor(pursuit, i).id;
      let id = assetId(f.format, s.scope, 'base');
      let note = '';
      if (used.has(id)) {
        let n = 2;
        while (used.has(`${id}-${n}`)) n++;
        note = ` — the brief numbers more than one send ${s.scope.send}, `
             + `so this one is kept apart as ${id}-${n}`;
        id = `${id}-${n}`;
      }
      used.add(id);

      assets.push({
        id,
        format: f.format, size: plan?.customSizes?.[id] ?? f.size,
        custom: t.formats.some(known => known.format === f.format) ? undefined : true,
        scope: s.scope, label: s.label,
        variant: /^email-/.test(f.format) ? initialEmailVariant(t.id, send) : 'base',
        copy: { ...copy, title: brief.name, dates: brief.dates },
        media: { ...(photo ? { photo } : {}), brands: brief.brands },
        sections: f.format === 'email-body' ? send?.sections : undefined,
        because: because + note,
      });
    });
  }

  const now = new Date().toISOString();
  return {
    v: 8, id: `s${Date.now().toString(36)}`, createdAt: now, updatedAt: now,
    name: name || brief.name || 'Untitled campaign',
    brief: { text: briefText, html, ai }, templateId: t.id, plan, assets, edits: EMPTY,
  };
}

export { pursuitOf };

/** Re-derive old saved campaigns once when build/count rules change.
 * Designer edits, identity and manual planning survive; only derived assets are
 * rebuilt. This is what removes reference-board phase duplicates from existing
 * campaigns as well as from newly created ones. */
export function migrateSheet(old: Sheet | (Omit<Sheet, 'v'> & { v: number })): Sheet {
  if (old.v >= 8) return old as Sheet;
  const next = buildSheet(old.brief.text, old.templateId, old.name,
                          old.brief.html, old.brief.ai, old.plan);
  const variants = new Map(old.assets.map(a => [a.id, a.variant]));
  return { ...next, id: old.id, createdAt: old.createdAt, updatedAt: old.updatedAt,
           edits: old.edits, direction: old.direction,
           formatDirections: old.formatDirections,
           assets: next.assets.map(a => ({ ...a,
             variant: variants.get(a.id) && variants.get(a.id) !== 'base'
               ? variants.get(a.id)! : a.variant })) };
}


/** The sends a sheet actually has, rebuilt from its own assets.
 *
 *  The renderer looks a send up by the id the asset carries, so the two have
 *  to agree on the list. They did not: when Claude read seven sends out of a
 *  brief whose shape `readSends` could not follow, the sheet scoped seven
 *  emails and `compose` -- reading the brief again on its own -- produced one.
 *  Six emails then failed the lookup and fell through to the generic composer.
 *
 *  Reading them off the sheet removes the second opinion. The sheet is the
 *  record of what was decided; nothing downstream should be deciding it again.
 */
export function sendsOf(sheet: Sheet): Send[] {
  const out = new Map<string, Send>();
  const authored = new Map(readSends(sheet.brief.text).map(send => [send.id, send]));
  const ai = new Map((sheet.brief.ai?.sends ?? []).map(send => [send.id, send]));
  for (const a of sheet.assets) {
    const id = a.scope.send;
    if (!id || out.has(id)) continue;
    const fromBrief = authored.get(id);
    out.set(id, { id, date: fromBrief?.date ?? '', label: fromBrief?.label ?? a.label,
                  tb: ai.get(id)?.tb || fromBrief?.tb || '',
                  assetCopy: a.copy,
                  sections: (a.sections?.length ? a.sections : fromBrief?.sections ?? []) as Send['sections'] });
  }
  // email-body carries the section stack; email-hero does not. Prefer whichever
  // asset actually has one.
  for (const a of sheet.assets) {
    const id = a.scope.send;
    if (id && a.sections?.length) out.set(id, { ...out.get(id)!,
      sections: a.sections,
      assetCopy: a.format === 'email-body' ? a.copy : out.get(id)!.assetCopy,
      tb: out.get(id)!.tb });
  }
  return [...out.values()];
}
