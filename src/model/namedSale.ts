/** A named sale's phases, each with its own offer.
 *
 *  A Memorial Day brief runs one sale through several phases: the main
 *  campaign (up to 60% off), a refresh ("More Brands, Deeper Discounts"),
 *  bumps (an extra 20% with a code) and a closing flash sale (up to 70% off,
 *  two days only). The brief's one headline offer is the main campaign's, so
 *  every asset used to say the same thing -- and with the bump's words, since
 *  the copy's defaults are a bump's. Here each phase's offer is read off the
 *  brief's own section for it, and an asset's phase off its own words. */
import type { Brief } from './brief';
import type { Copy } from '../sheet/types';

export type NamedPhase = 'main' | 'refresh' | 'bump' | 'flash';

/** The phase some words (a deliverable's topic, a phase's name, a send's angle) are about. */
export const phaseOf = (words: string): NamedPhase =>
  /\bflash\b/i.test(words) ? 'flash'
    : /\bbumps?\b|\bextra\s+\d+\s*%/i.test(words) ? 'bump'
    : /\bnew\s+brands\b|\bmore\s+brands\b|\brefresh\b/i.test(words) ? 'refresh' : 'main';

/** Whether they're about the last day. */
export const endsOf = (words: string) => /\bends?\s+today\b|\bfinal\s+hours\b|\blast\s+(chance|day)\b/i.test(words);

type Phases = {
  main: { pct: string; upTo: boolean };
  refresh?: string;
  bump: { pct: string; days?: string; codes: string[] };
  flash: { pct?: string; days?: string };
};

/** Each phase's offer, from the brief's own words for it. */
export function phasesOf(text: string, b: Brief): Phases {
  // A phase's own section: its "Key messages" if it has them, else the first mention.
  const from = (...res: RegExp[]) => {
    for (const re of res) { const m = re.exec(text); if (m) return text.slice(m.index, m.index + 400); }
    return '';
  };
  const upTo = (s: string) => s.match(/\bup\s+to\s+(\d+)\s*%/i)?.[1];
  const days = (s: string) => s.match(/\b(\d+|one|two|three|four|five|six|seven)[\s-]*days?\s+only\b/i)?.[1];
  const flash = from(/\bflash\s+sale\s*:?\s*\n\s*key\s+messages/i, /\bflash\s+sale\b/i);
  const bump = from(/\bbumps?\s*:?\s*\n\s*key\s+messages/i, /\bextra\s+\d+\s*%/i);
  return {
    main: { pct: upTo(b.offer) ?? b.offer.match(/(\d+)\s*%/)?.[1] ?? b.percent, upTo: /\bup\s+to\b/i.test(b.offer) },
    refresh: text.match(/\bmore\s+brands,?\s+(deeper|bigger)\s+(discounts|deals)\b/i)?.[0],
    bump: { pct: bump.match(/\bextra\s+(\d+)\s*%/i)?.[1] ?? b.percent, days: days(bump),
      // Each bump's own code, in its promo block ("Promo Name: MDS Bump 2 … Coupon Code: CAMPOUT20").
      codes: [...text.matchAll(/promo\s+name:[^\n]*?\bbump\s*(\d+)[\s\S]*?coupon\s+code:\s*([A-Z0-9]{4,})/gi)]
        .sort((x, y) => Number(x[1]) - Number(y[1])).map(m => m[2]) },
    flash: { pct: upTo(flash), days: days(flash) },
  };
}

/** What an asset in this phase says: the sale's name, the phase's offer and
 *  its lead, its urgency, and (a bump) its code. `which` is the bump's number
 *  where the words give one ("Bump 2"). */
export function namedCopy(words: string, p: Phases, b: Brief): Partial<Copy> {
  const phase = phaseOf(words), ends = endsOf(words);
  const daysOnly = (d?: string) => d ? `${d.toUpperCase()} DAYS ONLY` : undefined;
  const sale = b.name.toUpperCase();
  if (phase === 'bump') {
    const n = Number(words.match(/\bbump\s*(\d)/i)?.[1] ?? (ends ? p.bump.codes.length : 1));
    const code = p.bump.codes[n - 1] ?? b.code;
    const urgency = ends ? 'ENDS TODAY' : daysOnly(p.bump.days);
    return { eyebrow: sale, lead: 'EXTRA', offer: `${p.bump.pct}% OFF`, urgency, marquee: urgency ?? sale,
      code: code || undefined, qualifier: code ? `CODE ${code}` : 'No code needed',
      body: `EXTRA ${p.bump.pct}% OFF` };
  }
  if (phase === 'flash') {
    const urgency = ends ? 'ENDS TODAY' : daysOnly(p.flash.days);
    const pct = p.flash.pct ?? p.main.pct;
    return { eyebrow: 'FLASH SALE', lead: 'UP TO', offer: `${pct}% OFF`, urgency, marquee: urgency ?? 'FLASH SALE',
      code: undefined, qualifier: 'No code needed', body: `UP TO ${pct}% OFF` };
  }
  const main = { eyebrow: sale, lead: p.main.upTo ? 'UP TO' : '', offer: `${p.main.pct}% OFF`,
    code: undefined, qualifier: 'No code needed', body: b.offer || `UP TO ${p.main.pct}% OFF` };
  if (phase === 'refresh')
    return { ...main, urgency: 'NEW BRANDS ADDED', marquee: 'NEW BRANDS ADDED', ...(p.refresh ? { body: p.refresh } : null) };
  const urgency = ends ? 'ENDS TODAY' : undefined;
  return { ...main, urgency, marquee: urgency ?? sale };
}
