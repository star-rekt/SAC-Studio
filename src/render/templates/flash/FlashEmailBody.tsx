/** SC26_0021's email body, compiled from the board's own Email 1 body frames
 *  (src/data/figma/flash-body-*.json; npm run figma:pull): the Top
 *  Categories rows, the Top Picks grid and its "See More", the More Current
 *  Deals banners, and their headings. The brief still decides which sections
 *  a send has and what they say; the board decides how each one looks. A
 *  section the board has no design for (the hero's body copy, brand tiles,
 *  terms) is drawn the shared way.
 *
 *  Each section is a block of its frame's own height with every layer at
 *  its Figma box, so sections stack in any order. Ids are the ones the
 *  shared renderer used for the same sections, so existing edits still land. */
import type { Doc, Zone } from '../../../model/compose';
import type { Section } from '../../../model/sections';
import type { EmailPart } from '../../../sheet/types';
import { FLASH_ADDED } from '../../emailSections';
import { photoFor } from '../../../model/compose';
import { copyFor } from '../../../model/copy';
import { Editable } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { Media } from '../../../edit/Media';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from './textContracts';
import { layerOf, boxOf, anchorOf, typeOf, cropOf, cropWithin, type FigmaLayout } from '../../figma/layout';
import { Metadata, Nav, TeaserBar, Footer, SectionView } from '../../Email';
import categoriesJson from '../../../data/figma/flash-body-categories.json';
import headingJson from '../../../data/figma/flash-body-heading.json';
import picksJson from '../../../data/figma/flash-body-picks.json';
import picksCtaJson from '../../../data/figma/flash-body-picks-cta.json';
import dealLeftJson from '../../../data/figma/flash-body-deal-left.json';
import dealRightJson from '../../../data/figma/flash-body-deal-right.json';

const as = (j: unknown) => j as FigmaLayout;
const CATEGORIES = as(categoriesJson), HEADING = as(headingJson), PICKS = as(picksJson),
  PICKS_CTA = as(picksCtaJson), DEAL_LEFT = as(dealLeftJson), DEAL_RIGHT = as(dealRightJson);
const W = 1200;

/** Which Figma layer each part of a section is. Category rows are the
 *  board's first row (Men's Apparel) repeated at the board's row spacing. */
export const FLASH_BODY_FIGMA = {
  categories: { head: '248:711244', row: '248:711182', nextRow: '248:711222', tile: '248:711185',
    label: '248:711189', arrow: '248:711190' },
  heading: { head: '248:711132' },
  picks: { grid: '248:711134', product: '248:711135', right: '248:711136', nextRow: '248:711139' },
  picksCta: { button: '248:711142', label: '248:711143' },
  dealLeft: { photo: '248:711150', clip: '248:711145', glows: ['248:711151', '248:711152'], upto: '248:711161',
    pct: '248:711158', name: '248:711155', button: '248:711159', cta: '248:711160' },
  dealRight: { photo: '248:711168', clip: '248:711163', glows: [] as string[], upto: '248:711177',
    pct: '248:711174', name: '248:711171', button: '248:711175', cta: '248:711176' },
} as const;

/** sc26_0021's own board image per category pill, matched by keyword since a
 *  brief can phrase a category a few different ways ("Men's Apparel", "Men
 *  Apparel"). Falls back to the pursuit photo for one the board didn't show. */
function categoryImage(name: string): string | undefined {
  const n = name.toLowerCase();
  if (/\bwomen/.test(n)) return '/reference/category-womens-apparel.png';
  if (/\bmen/.test(n)) return '/reference/category-mens-apparel.png';
  if (/foot\s*wear|shoes?/.test(n)) return '/reference/category-footwear.png';
  if (/climb/.test(n)) return '/reference/category-climb-gear.png';
  if (/camp/.test(n)) return '/reference/category-camp-gear.png';
  if (/daypack|backpack/.test(n)) return '/reference/category-daypacks.png';
  return undefined;
}

/** The board's arrow: a line and a chevron, in its own box. */
const Arrow = ({ box, colour }: { box: { x: number; y: number; w: number; h: number }; colour?: string }) =>
  <svg style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'visible' }}
    viewBox={`0 0 ${box.w} ${box.h}`} fill="none" stroke={colour} strokeWidth={3} strokeLinecap="round">
    <path d={`M1.5 ${box.h / 2}H${box.w - 1.5}M${box.w - 26} 1.5L${box.w - 1.5} ${box.h / 2}L${box.w - 26} ${box.h - 1.5}`} />
  </svg>;

/** A heading run in a block, centred on the board's own centre, shrinking to fit. */
function Heading({ id, layer, children }: { id: string; layer: ReturnType<typeof layerOf>; children: string }) {
  const { edits } = useEdits();
  // The board's own heading sets size and character width; its room is the sheet less margins.
  const fit = boardFit(textOf(edits, id, children), 'section.header', layer, W - 128);
  return <div style={{ ...anchorOf(layer, 'CENTER'), left: layer.x + layer.w / 2 - W / 2, width: W }}>
    <Editable id={id} as="h2" fit={fit.contract} style={{ ...typeOf(layer, fit.fontSize), margin: 0 }}>{children}</Editable>
  </div>;
}

/** A block of a frame's height, its layers placed in its own px. */
const Block = ({ layout, height, frame, children }: { layout: FigmaLayout; height?: number; frame: string;
  children: React.ReactNode }) =>
  <div data-frame={frame} style={{ position: 'relative', width: W, height: height ?? layout.size[1],
    background: layout.frame.fill ?? '#fff', flex: 'none' }}>{children}</div>;

function Categories({ k, header, items, pursuit }: { k: string; header?: string; items: string[]; pursuit: string }) {
  const { edits } = useEdits();
  const P = FLASH_BODY_FIGMA.categories, L = (id: string) => layerOf(CATEGORIES, id);
  const row = L(P.row), tile = L(P.tile), label = L(P.label), arrow = L(P.arrow);
  const step = L(P.nextRow).y - row.y;
  const shown = items.slice(0, 6);
  // The board's six rows end 72px above the frame's foot; fewer rows keep that.
  const height = row.y + (shown.length - 1) * step + row.h + (CATEGORIES.size[1] - (L('248:711233').y + row.h));
  const at = (l: { x: number; y: number }) => ({ left: l.x - row.x, top: l.y - row.y });
  return <Block layout={CATEGORIES} height={height} frame="flash-body-categories">
    <Heading id={`${k}/head`} layer={L(P.head)}>{header || 'Top Categories'}</Heading>
    {shown.map((name, n) => {
      const text = name.replace(/\s*\(.*\)$/, '').trim();
      // Its room runs to the arrow: the board's labels don't all fill one width.
      const fit = boardFit(textOf(edits, `${k}/t${n}/name`, text), 'section.pillName', label, arrow.x - label.x - 20);
      return <div key={n} style={{ position: 'absolute', left: row.x, top: row.y + n * step, width: row.w, height: row.h,
        background: row.fill, borderRadius: row.radius }}>
        <div style={{ position: 'absolute', ...at(tile), width: tile.w, height: tile.h, background: tile.fill,
          borderRadius: tile.radius, overflow: 'hidden' }}>
          <Picture id={`${k}/t${n}/icon`} zone={photoFor(pursuit, n)} initialSrc={categoryImage(text)}
            style={{ position: 'absolute', inset: 0 }} />
        </div>
        <div style={{ ...anchorOf(label), ...at(label), alignItems: 'center', height: label.h }}>
          <Editable id={`${k}/t${n}/name`} fit={fit.contract} style={typeOf(label, fit.fontSize)}>{text}</Editable>
        </div>
        <Arrow box={{ ...arrow, ...{ x: arrow.x - row.x, y: arrow.y - row.y } }} colour={label.fill} />
      </div>;
    })}
  </Block>;
}

function Picks({ k, header, count, cta }: { k: string; header: string; count: number; cta: string }) {
  const { edits } = useEdits();
  const P = FLASH_BODY_FIGMA.picks, L = (id: string) => layerOf(PICKS, id);
  const first = L(P.product), right = L(P.right), step = L(P.nextRow).y - first.y;
  const n = Math.max(1, Math.min(count, 4)), rows = Math.ceil(n / 2);
  const left = (W - PICKS.size[0]) / 2;
  const foot = PICKS.size[1] - (L(P.nextRow).y + first.h);
  const button = layerOf(PICKS_CTA, FLASH_BODY_FIGMA.picksCta.button), label = layerOf(PICKS_CTA, FLASH_BODY_FIGMA.picksCta.label);
  const src = first.images?.[0] && PICKS.assets?.[first.images[0].ref]?.src;
  return <>
    <Block layout={HEADING} frame="flash-body-heading">
      <Heading id={`${k}/head`} layer={layerOf(HEADING, FLASH_BODY_FIGMA.heading.head)}>{header}</Heading>
    </Block>
    <Block layout={PICKS} height={first.y + (rows - 1) * step + first.h + foot} frame="flash-body-picks">
      {Array.from({ length: n }, (_, i) => {
        const at = i % 2 ? right : first;
        // The board's own placeholder product shots, faded as on the board.
        return <Media key={i} id={`${k}/product/${i}/photo`} src={src ?? `/reference/flash-top-picks-${i + 1}.png`}
          alt="Featured product" style={{ ...boxOf(at), left: left + at.x, top: at.y + Math.floor(i / 2) * step,
            opacity: at.opacity, objectFit: 'cover' }} />;
      })}
    </Block>
    <Block layout={PICKS_CTA} frame="flash-body-picks-cta">
      <div style={anchorOf(button, 'CENTER')}>
        <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
          padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center',
          background: button.fill, borderRadius: button.radius }}>
          {(() => { const fit = boardFit(textOf(edits, `${k}/cta`, cta), 'section.cta', label);
            return <Editable id={`${k}/cta`} fit={fit.contract} style={typeOf(label, fit.fontSize)}>{cta}</Editable>; })()}
        </div>
      </div>
    </Block>
  </>;
}

/** One deal banner: copy on the left (even) or right (odd), as the board
 *  alternates them. Percent, name and CTA come from the brief. */
function Deal({ k, n, name, percent, cta, zone }: { k: string; n: number; name: string; percent?: string;
  cta: string; zone: Zone }) {
  const { edits } = useEdits();
  const layout = n % 2 ? DEAL_RIGHT : DEAL_LEFT, P = n % 2 ? FLASH_BODY_FIGMA.dealRight : FLASH_BODY_FIGMA.dealLeft;
  const L = (id: string) => layerOf(layout, id);
  const clip = L(P.clip), photo = L(P.photo), button = L(P.button), label = L(P.cta);
  const ref = photo.images?.[0]?.ref, img = ref ? layout.assets?.[ref] : undefined;
  const crop = img && cropOf(cropWithin(clip, photo), [clip.w, clip.h], [img.w, img.h]);
  const right = n % 2 === 1, edge = button.x + button.w;
  // Right-hand copy ends on the button's right edge; left-hand starts on its left.
  const line = (l: ReturnType<typeof L>): React.CSSProperties => right
    ? { ...anchorOf(l, 'RIGHT'), left: 0, width: edge }
    : { ...anchorOf(l, 'LEFT'), width: clip.w - l.x };
  // A deal name may run to the banner's middle; the board's sets its size and character width.
  const nameFit = boardFit(textOf(edits, `${k}/name`, name), 'section.tileName', L(P.name), clip.w / 2);
  const pctFit = boardFit(textOf(edits, `${k}/pct`, `${percent}% OFF`), 'hero.offer', L(P.pct));
  const ctaFit = boardFit(textOf(edits, `${k}/cta`, cta), 'section.cta', label);
  const pctGap = L(P.pct).x - L(P.upto).x - L(P.upto).w;
  return <div data-frame={right ? 'flash-body-deal-right' : 'flash-body-deal-left'}
    style={{ position: 'relative', width: clip.w, height: clip.h, borderRadius: clip.radius, overflow: 'hidden' }}>
    <Picture id={`${k}/pic`} zone={zone} initialSrc={img?.src} label={name}
      focus={crop?.focus} initialScale={crop?.initialScale} style={{ position: 'absolute', inset: 0 }} />
    {P.glows.map(g => { const l = L(g); return <div key={g} style={{ ...boxOf(l), background: l.fill,
      opacity: l.opacity, filter: `blur(${(l.blur ?? 0) / 2}px)`, pointerEvents: 'none' }} />; })}
    {percent && <div style={{ ...line(L(P.pct)), ...right ? { left: 0 } : { left: L(P.upto).x } }}>
      <Editable id={`${k}/upto`} style={{ ...typeOf(L(P.upto)), whiteSpace: 'pre', marginRight: pctGap }}>{'UP\nTO'}</Editable>
      <Editable id={`${k}/pct`} fit={pctFit.contract} style={typeOf(L(P.pct), pctFit.fontSize)}>{percent + '% OFF'}</Editable>
    </div>}
    <div style={line(L(P.name))}>
      <Editable id={`${k}/name`} fit={nameFit.contract} style={typeOf(L(P.name), nameFit.fontSize)}>{name}</Editable>
    </div>
    <div style={{ position: 'absolute', top: button.y, ...right ? { left: 0, width: edge, display: 'flex',
      justifyContent: 'flex-end' } : { left: button.x, display: 'flex' } }}>
      <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
        padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center',
        background: button.fill, borderRadius: button.radius }}>
        <Editable id={`${k}/cta`} fit={ctaFit.contract} style={typeOf(label, ctaFit.fontSize)}>{cta}</Editable>
      </div>
    </div>
  </div>;
}

function Deals({ k, header, items, pursuit }: { k: string; header?: string; pursuit: string;
  items: { name: string; percent?: string; cta?: string }[] }) {
  // The board: banners 41px apart, centred, 55px under the last one.
  const gap = 41, foot = 55;
  return <>
    <Block layout={HEADING} frame="flash-body-heading">
      <Heading id={`${k}/head`} layer={layerOf(HEADING, FLASH_BODY_FIGMA.heading.head)}>{header || 'More Current Deals'}</Heading>
    </Block>
    <div data-frame="flash-body-deals" style={{ width: W, background: '#fff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap, paddingBottom: foot, flex: 'none' }}>
      {items.map((it, n) => <Deal key={n} k={`${k}/t${n}`} n={n} name={it.name} percent={it.percent}
        cta={it.cta || 'Shop Now'} zone={photoFor(pursuit, n)} />)}
    </div>
  </>;
}

export function FlashEmailBody({ doc, i, hero, parts }: { doc: Doc; i: number; hero?: React.ReactNode;
  /** The email's sections when chosen (render/emailSections.ts): the brief's, by
   *  their place in it, and any added, from the brief's categories and brands. */
  parts?: EmailPart[] }) {
  const s = doc.sends[i];
  const items = (names: string[] = []) => names.map(name => ({ name, percent: '' }));
  const added = (sec: Section): Section => sec.kind === 'brandTiles' ? { ...sec, items: items(doc.brief.brands) }
    : sec.kind === 'categoryTiles' ? { ...sec, items: items(doc.brief.categories) } : sec;
  const shown = parts
    ? parts.flatMap((p, n) => p.off ? [] : p.design === 'brief' && s.sections[p.section] ? [{ n, sec: s.sections[p.section], k: `${s.id}/s${p.section}` }]
      : p.design === 'added' && FLASH_ADDED[p.section] ? [{ n, sec: added(FLASH_ADDED[p.section]), k: `${s.id}/${p.key}` }] : [])
    : s.sections.map((sec, n) => ({ n, sec, k: `${s.id}/s${n}` }));
  let recs = 0;
  return (
    <div className="sheet stack" style={{ width: W, background: '#fff' }}>
      <Metadata s={s} name={doc.brief.name} />
      <Nav />
      {s.tb && <TeaserBar id={`${s.id}/tb`} text={s.tb} />}
      {hero}
      {shown.map(({ n, sec, k }) => [
        // data-part: where the section starts, for the Sections list to scroll to.
        <div key={`${k}/at`} data-part={n} />, (() => {
        if (sec.kind === 'categoryTiles')
          return <Categories key={k} k={k} header={sec.header} pursuit={s.pursuit} items={sec.items.map(it => it.name)} />;
        if (sec.kind === 'productRecs') {
          // A second Product Recs block with no header of its own gets the
          // board's third heading, not a repeat of the first.
          const header = sec.header || (recs++ > 0 ? 'More Current Deals' : 'Flash Sale Top Picks');
          return <Picks key={k} k={k} header={header} count={sec.count ?? 4} cta={sec.cta || 'See More'} />;
        }
        if (sec.kind === 'moreDeals')
          return <Deals key={k} k={k} header={sec.header} pursuit={s.pursuit} items={sec.items} />;
        return <SectionView key={k} sec={sec} k={k} pursuit={s.pursuit} brief={doc.brief}
          body={copyFor(s, doc.brief).body} templateId="sc26_0021" />;
      })()])}
      <Footer />
    </div>
  );
}
