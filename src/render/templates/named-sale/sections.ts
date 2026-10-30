/** Named Sale's email sections (designs.ts) as its brief lists them, and each
 *  section's band of the board. Data only, so the sheet builder can use it
 *  without the frames. (Every template's sections: render/emailSections.ts.) */
import type { EmailPart } from '../../../sheet/types';
import type { Section } from '../../../model/sections';
import { DESIGNS, type SectionKind } from './designs';
import { ownParts } from '../../emailSections';

const EMAILS = DESIGNS.filter(d => d.format === 'email-body');

/** A part's section, with its band of the board, if its design still has it. */
export const sectionOf = (p: EmailPart) => EMAILS.find(d => d.id === p.design)?.sections?.[p.section];

/** The brief's kinds of section, as the board's. More deals has no Named Sale section. */
const FROM_BRIEF: Partial<Record<Section['kind'], SectionKind>> = {
  productRecs: 'products', brandTiles: 'brands', categoryTiles: 'categories',
};
const CONTENT: SectionKind[] = ['products', 'brands', 'categories'];

/** An email's sections as its brief lists them: the design's own top (banner,
 *  nav, hero, copy) and bottom (buttons, footer), and between them the brief's
 *  sections in its order, each with its header -- the design's own section of
 *  the kind where it has one, else the first design's that does. Undefined
 *  when the brief lists none: the email is its design's own. */
export function briefParts(design: string, sections: Section[] = []): EmailPart[] | undefined {
  const asked = sections.flatMap(s => {
    const kind = FROM_BRIEF[s.kind];
    return kind ? [{ kind, heading: 'header' in s ? s.header : '' }] : [];
  });
  if (!asked.length) return undefined;
  const own = ownParts('named_sale', design), kindOf = (p: EmailPart) => sectionOf(p)?.kind ?? 'section';
  const first = own.findIndex(p => CONTENT.includes(kindOf(p)));
  const last = own.length - 1 - [...own].reverse().findIndex(p => CONTENT.includes(kindOf(p)));
  const head = first < 0 ? own.filter(p => !['buttons', 'footer'].includes(kindOf(p))) : own.slice(0, first);
  const tail = first < 0 ? own.filter(p => ['buttons', 'footer'].includes(kindOf(p))) : own.slice(last + 1);
  const used = new Set<number>();
  const middle = asked.flatMap(({ kind, heading }, i) => {
    const mine = own.find(p => kindOf(p) === kind && !used.has(p.section));
    if (mine) used.add(mine.section);
    const other = mine ? undefined : EMAILS.flatMap(d => (d.sections ?? []).map((s, section) => ({ design: d.id, section, s })))
      .find(x => x.s.kind === kind);
    const p: EmailPart | undefined = mine ?? (other && { design: other.design, section: other.section, key: `brief-${i}` });
    return p ? [{ ...p, ...(heading ? { heading } : {}) }] : [];
  });
  return [...head, ...middle, ...tail];
}
