/** What each email actually says, and what shape its offer takes.
 *
 *  The brief writes a Copy and a Design direction per send, and they are not
 *  the same send to send -- E2 leads on apparel already down to 60%, E3 on a
 *  set of brands, E5 on a curated pick, E7 on it being the last day. Rendering
 *  one paragraph seven times throws all of that away and gives seven identical
 *  emails with different photographs.
 *
 *  So the direction is READ, not printed. It is an instruction to a
 *  copywriter -- 'Lead summer apparel on sale up to 60% off' -- and what comes
 *  out here is the copy that instruction asks for, in the campaign's own
 *  numbers.
 *
 *  It also decides the SHAPE of the offer. E2 and E4 say 'show the stack
 *  visually so the extra 20% reads as sitting on top of the existing markdown
 *  rather than replacing it'. That is not a wording change, it is a different
 *  lockup: the markdown large with the bundle sitting on top of it. A single
 *  offer and a stacked one are both drawn; the direction picks.
 */
import type { Brief } from './brief';
import type { Send } from './sections';

export type Angle = 'launch' | 'category' | 'brand' | 'curated' | 'ends-tomorrow' | 'ends-today';

export type Ticket =
  | { kind: 'single'; lead: string; offer: string; foot: string }
  | { kind: 'stacked'; markdown: string; lead: string; offer: string; foot: string };

export type Copy = {
  angle: Angle;
  eyebrow: string;
  marquee: string;
  ticket: Ticket;
  body: string;
  cta: string;
  /** What in the brief decided this, so the panel can show its work. */
  because: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mechanic = (b: Brief) => {
  const minimum = b.minimumItems ? `${b.minimumItems}+ eligible items` : 'eligible items';
  return b.noCode
    ? `Add ${minimum} to cart; the extra ${b.percent || '20'}% applies automatically. No code needed.`
    : b.code ? `Use code ${b.code} for an extra ${b.percent || '20'}% off.`
    : '';
};
const offerBody = (b: Brief) => [b.offer, mechanic(b)].filter(Boolean).join(' ');

/** 'Lead summer apparel on sale up to 60% off' -> what to lead on, and at what. */
function lead(direction: string): { subject: string; upto: string } | null {
  const m = direction.match(
    /\blead\s+(.{3,40}?)\s+(?:gear\s+)?on\s+sale\s+up\s+to\s+(\d{1,2})\s*%\s*off/i);
  if (!m) return null;
  return { subject: m[1].trim().replace(/\s+/g, ' '), upto: m[2] };
}

export function copyFor(send: Send, b: Brief): Copy {
  if (send.assetCopy) {
    const a = send.assetCopy;
    const ticket: Ticket = a.markdown
      ? { kind: 'stacked', markdown: a.markdown, lead: a.lead || '',
          offer: a.offer || b.offer, foot: a.qualifier || '' }
      : { kind: 'single', lead: a.lead || '', offer: a.offer || b.offer,
          foot: a.qualifier || '' };
    const angle: Angle = /ends?\s+today|last\s+(?:day|chance)|final\s+hours/i.test(a.marquee || '')
      ? 'ends-today' : /ends?\s+tomorrow/i.test(a.marquee || '')
      ? 'ends-tomorrow' : 'launch';
    return { angle, eyebrow: a.eyebrow || '', marquee: a.marquee || '',
      ticket, body: a.body || offerBody(b), cta: a.cta || 'Shop Now',
      because: 'resolved from the brief for this email' };
  }
  const hero = send.sections.find(s => s.kind === 'hero');
  const design = hero && hero.kind === 'hero' ? hero.design : '';
  const copy = hero && hero.kind === 'hero' ? hero.copy : '';
  const both = `${design} ${copy} ${send.label}`;
  const pct = b.percent || '20';
  const dates = b.duration || '';
  const noCode = b.noCode;

  // Urgency first: a send that says it is the last day is that, whatever else
  // the direction mentions.
  if (/\blast day\b|\bends t(?:o)?dy\b|\bends today\b/i.test(both))
    return {
      angle: 'ends-today', eyebrow: 'LAST DAY', marquee: 'ENDS TODAY',
      ticket: { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
                foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
      body: offerBody(b),
      cta: 'Shop Now',
      because: 'the brief marks this send as the last day',
    };

  if (/\bends tomorrow\b|\bends tmr\b/i.test(both))
    return {
      angle: 'ends-tomorrow', eyebrow: 'ENDS TOMORROW', marquee: 'ENDS TOMORROW',
      ticket: { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
                foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
      body: offerBody(b),
      cta: 'Shop Now',
      because: 'the brief asks this send to push ends tomorrow',
    };

  // 'Show the stack visually' is a lockup instruction, not a wording one.
  const L = lead(copy);
  if (L) {
    const stack = /\bstack\b|\bon top of the existing markdown\b/i.test(both);
    return {
      angle: 'category',
      eyebrow: cap(L.subject).toUpperCase(),
      marquee: `UP TO ${L.upto}% OFF`,
      ticket: stack
        ? { kind: 'stacked', markdown: `UP TO ${L.upto}% OFF`, lead: 'PLUS EXTRA',
            offer: `${pct}% IN CART`, foot: noCode ? 'ON 3+ ITEMS, NO CODE' : `CODE ${b.code}` }
        : { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
            foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
      body: offerBody(b),
      cta: 'Shop Now',
      because: `the brief says to lead ${L.subject} at up to ${L.upto}% off`
             + (stack ? ', and to show the stack visually' : ''),
    };
  }

  if (/\bbrand\b/i.test(both))
    return {
      angle: 'brand', eyebrow: 'BRANDS ON SALE', marquee: `EXTRA ${pct}% OFF`,
      ticket: { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
                foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
      body: offerBody(b),
      cta: 'Shop Now',
      because: 'the brief frames this send as a brand spotlight',
    };

  if (/\btop picks\b|\bcurated\b/i.test(both))
    return {
      angle: 'curated', eyebrow: 'TOP PICKS', marquee: 'TOP PICKS OF THE SUMMER',
      ticket: { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
                foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
      body: offerBody(b),
      cta: 'Shop Now',
      because: 'the brief asks for a curated pick rather than a comprehensive one',
    };

  return {
    angle: 'launch', eyebrow: send.label.toUpperCase(), marquee: dates || `EXTRA ${pct}% OFF`,
    ticket: { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`,
              foot: noCode ? 'NO CODE NEEDED' : `CODE ${b.code}` },
    body: offerBody(b),
    cta: 'Shop Now',
    because: 'no other angle is stated, so this reads as the launch send',
  };
}


/** Copy from Claude's reading of the send, rather than from keyword matching.
 *
 *  `copyFor` above matches a handful of words against the Design and Copy
 *  lines -- 'lead ... on sale up to N% off', 'brand', 'top picks'. It is exact
 *  when a brief uses those words and silent when it does not, and a brief that
 *  says 'wraps up Sunday' instead of 'ends today' gets the launch angle.
 *
 *  This takes the same decisions already made by something that read the
 *  direction as a direction: the angle, what to lead on, the markdown being
 *  led on, and whether the extra stacks on top of it. The numbers are still
 *  the brief's own -- the model is trusted to read intent, not to do
 *  arithmetic or to invent an offer.
 */
export function copyFromAi(a: AiSendRead, b: Brief): Copy {
  const pct = b.percent || '20';
  const noCode = b.noCode;
  const foot = noCode ? 'NO CODE NEEDED' : `CODE ${b.code}`;
  const single: Ticket = { kind: 'single', lead: 'EXTRA', offer: `${pct}% OFF`, foot };

  const subject = (a.leadOn || '').replace(/\s+/g, ' ').trim();
  const upto = a.uptoPercent;

  switch (a.angle) {
    case 'ends-today':
      return { angle: 'ends-today', eyebrow: 'LAST DAY',
        marquee: /final\s+hours|last\s+chance/i.test(a.label)
          ? a.label.replace(/^.*?[–—-]\s*/, '').toUpperCase() : 'ENDS TODAY', ticket: single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
    case 'ends-tomorrow':
      return { angle: 'ends-tomorrow', eyebrow: 'ENDS TOMORROW', marquee: 'ENDS TOMORROW',
        ticket: single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
    case 'brand':
      return { angle: 'brand', eyebrow: 'BRANDS ON SALE', marquee: `EXTRA ${pct}% OFF`,
        ticket: single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
    case 'curated':
      return { angle: 'curated', eyebrow: 'TOP PICKS', marquee: 'TOP PICKS',
        ticket: single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
    case 'category':
      return { angle: 'category',
        eyebrow: (subject || 'ON SALE').toUpperCase(),
        marquee: upto ? `UP TO ${upto}% OFF` : `EXTRA ${pct}% OFF`,
        ticket: a.showStack && upto
          ? { kind: 'stacked', markdown: `UP TO ${upto}% OFF`, lead: 'PLUS EXTRA',
              offer: `${pct}% IN CART`, foot: noCode ? 'ON 3+ ITEMS, NO CODE' : foot }
          : single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
    default:
      return { angle: 'launch', eyebrow: (a.label || b.name || 'ON SALE').toUpperCase(),
        marquee: b.duration || `EXTRA ${pct}% OFF`, ticket: single,
        body: offerBody(b),
        cta: 'Shop Now', because: a.because };
  }
}

/** The shape `copyFromAi` needs, named here so model/ does not import from ai/. */
export type AiSendRead = {
  id: string; label: string; angle: Angle; leadOn: string;
  uptoPercent: string; showStack: boolean; because: string;
};
