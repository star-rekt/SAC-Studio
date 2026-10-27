/** Spring Flash email hero family, transcribed from its own three Figma email
 *  frames. Type, offer, categories and CTA stay independent React elements. */
import type { Doc } from '../../../model/compose';
import { copyFor } from '../../../model/copy';
import { Editable, Ground } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { Media } from '../../../edit/Media';
import { useEdits, textOf } from '../../../edit/store';
import { emailVariant } from '../../../templates/variants';
import { stack } from '../../../fonts';
import { find as findMedia } from '../../../model/media';
import { measureTextWidth, looksLikeAName } from './textContracts';

const orange = '#F14222', ink = '#333';
const type = (size: number, weight = 800): React.CSSProperties => ({
  fontFamily: stack('Quiet Sans'), fontSize: size, fontWeight: weight,
  lineHeight: 1, letterSpacing: -size * .015,
});

// Figma trims every text box to cap-height ('leading-trim: both; text-edge:
// cap' in its own CSS export); this Chromium supports the real equivalent.
// Without it, a plain line-height box sits taller than Figma's and adds
// phantom leading above the glyphs -- which is what put every headline and
// bolt here a visible amount too low.
const trim = { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } as React.CSSProperties;

function Brush({ id, text, top, pale = false, width = 378, height = 67, scale = 1 }: {
  id: string; text: string; top: number; pale?: boolean; width?: number; height?: number; scale?: number;
}) {
  // The ink-brush art is a fixed-aspect vector mark (the real outline, Figma
  // node 804:13668) sized for "3 DAYS ONLY" (or, on the 'today' variant, for
  // "LIMITED TIME"); a longer line like "ENDS TOMORROW" just ran past its
  // edges instead of the graphic growing with it. `width`/`height` are a
  // FLOOR here, not a fixed size -- both grow together (same aspect ratio)
  // only once the live text actually needs more room than the caller's own
  // box already gives it.
  const { edits } = useEdits();
  const live = textOf(edits, `${id}/urgency`, text);
  const fontSize = 57 * scale;
  // The actual rendered width of the live text, not a guessed character
  // count -- a length*factor estimate calibrated against "3 DAYS ONLY"
  // undershot "ENDS TOMORROW" by ~75px in practice (measured, not assumed).
  const textWidth = measureTextWidth(live, `500 ${fontSize}px ${stack('Sofia Pro')}`, -1.7 * scale);
  // 50px of horizontal padding keeps "3 DAYS ONLY" (this board's own
  // measured 378px floor) exactly at that floor -- confirmed by measuring
  // its actual rendered text width (324px) against the board's own number.
  const w = Math.max(width, textWidth + 50);
  const h = height * (w / width);
  return <div style={{ position: 'absolute', left: '50%', top, transform: 'translateX(-50%)',
    width: w, height: h, display: 'grid', placeItems: 'center' }}>
    <Media id={`${id}/mark`} src="/graphics/brush-stroke.svg" alt=""
      title="Click to recolour, resize or swap the brush mark from the library"
      style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} />
    <Editable id={`${id}/urgency`} style={{ position: 'relative', color: pale ? '#fff' : '#fff',
      fontFamily: stack('Sofia Pro'), fontWeight: 500, fontSize, lineHeight: `${55 * scale}px`,
      letterSpacing: -1.7 * scale, whiteSpace: 'nowrap', ...trim }}>{text}</Editable>
  </div>;
}
/** The bolt flanking the title: the library's own "bolt" mark. The board's
 *  own bolt is ink, matching this send's dark title -- not white, which is
 *  what hero-desktop and paid-social use against their own, lighter crop. */
function Bolt({ id, size, pale = false }: { id: string; size: number; pale?: boolean }) {
  return <Media id={id} src={pale ? '/graphics/bolt.svg' : '/graphics/bolt-ink.svg'} alt=""
    style={{ width: size * 40 / 88, height: size, display: 'inline-block', verticalAlign: 'middle' }} />;
}
/** Read straight off the board's own email-body/1 frame (1200x1029) via its
 *  "Copy as CSS" export. The 'launch' send's title sets dark ink against
 *  this particular photograph -- not white, which is what hero-desktop and
 *  paid-social use against their own, differently exposed crop. */
function SaleType({ id, top, title, percent, upto, pale = false, scale = 1 }: {
  id: string; top: number; title: string; percent: string; upto: boolean; pale?: boolean; scale?: number;
}) {
  // Sized off whatever is actually on screen, not the brief's original
  // string -- a retyped headline that is now shorter stayed sized for the
  // longer one it replaced otherwise.
  const { edits } = useEdits();
  const liveTitle = textOf(edits, `${id}/title`, title);
  const titleSize = Math.min(91, Math.round(760 / (Math.max(liveTitle.length, 1) * .65 + 2)));
  const color = pale ? '#F5EBDF' : ink;
  // Each row sits at its own exact top from the board, not stacked by flow.
  // The bolt+title group is centred as a whole (gap scaled to the title's
  // own size) rather than pinned to the board's literal bolt coordinates,
  // which only hold for the one headline length the board happened to show.
  // `scale` carries the 'today' send's own geometry, measured at 1.1526x
  // 'launch' -- confirmed uniform across every number in this component.
  return <div style={{ position: 'absolute', left: 0, width: 1200, top,
    textAlign: 'center', color, textShadow: pale ? '0 4px 5px #0008' : 'none' }}>
    <div style={{ position: 'absolute', left: 0, width: 1200, top: 0, height: 60 * scale,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: titleSize * .16 * scale }}>
      <Bolt id={`${id}/title/bolt-left`} size={60 * scale} pale={pale} />
      <Editable id={`${id}/title`} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 800,
        fontSize: titleSize * scale, lineHeight: `${120 * scale}px`, letterSpacing: -2.72 * scale, whiteSpace: 'nowrap', ...trim }}>{title}</Editable>
      <Bolt id={`${id}/title/bolt-right`} size={60 * scale} pale={pale} />
    </div>
    {/* Figma centres the OFFER text at the frame's own middle and hangs UP TO
        off its left edge; centring the pair as one block (the obvious flex
        approach) instead centres their combined midpoint, which sits a half
        upto-width right of where the board actually puts it. Shifting the
        reference frame left by half of upto's own box width corrects that
        without hardcoding a position that only held for one digit count. */}
    <div style={{ position: 'absolute', left: -(upto ? 65 * scale : 130 * scale) / 2, width: 1200, top: 93 * scale,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <Editable id={`${id}/upto`} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 400,
        fontSize: upto ? 51 * scale : 35 * scale, lineHeight: `${50 * scale}px`, letterSpacing: -1.53 * scale, ...trim,
        width: upto ? 65 * scale : 130 * scale, textAlign: 'right', whiteSpace: 'pre-line' }}>{upto ? 'UP\nTO' : 'EXTRA'}</Editable>
      <Editable id={`${id}/offer`} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 800,
        fontSize: 161 * scale, lineHeight: `${156 * scale}px`, letterSpacing: -4.83 * scale, whiteSpace: 'nowrap', ...trim }}>{`${percent}% OFF`}</Editable>
    </div>
  </div>;
}
function Cta({ id, top, text = 'Shop Now' }: { id: string; top: number; text?: string }) {
  // Editable always owns its own `transform` (its drag-move offset), so a
  // caller's translateX(-50%) centering trick is silently overwritten --
  // centre with a flex wrapper instead of a transform on the Editable itself.
  return <div style={{ position: 'absolute', left: 0, width: 1200, top,
    display: 'flex', justifyContent: 'center' }}>
    {/* The orange backing used to be drawn straight onto the Editable
        itself (`background: orange`) -- a flat placement, not a graphic
        component: no swap, no recolour-as-a-mark, and aligning the text
        moved the "button" along with it since there was no background
        shape independent of the text to measure. `/graphics/pill.svg` is
        the same rounded-pill mark Bump's hero CTA already uses -- same
        corner radius as a share of height in both boards, not a
        coincidence worth a second shape for. The padding that used to size
        the Editable now sizes this wrapper instead, so the button still
        grows to fit a longer CTA exactly as it did before. */}
    <div style={{ position: 'relative', display: 'inline-block', padding: '39px 100px', boxSizing: 'border-box' }}>
      <Media id={`${id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
        title="Click to recolour, resize or swap the button shape from the library"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Editable id={`${id}/cta`} style={{ position: 'relative', color: '#fff',
        fontFamily: stack('Quiet Sans'), fontWeight: 700, fontSize: 64, letterSpacing: -0.64, ...trim,
        whiteSpace: 'nowrap', textAlign: 'center' }}>{text}</Editable>
    </div>
  </div>;
}
/** The brand strip right under the 'launch' hero: exact logo positions off
 *  the board, not a space-around guess. */
function BrandBand({ id, brands, top, exact = false }: {
  id: string; brands: string[]; top: number; exact?: boolean;
}) {
  const positions = [
    { left: 124, top: 26, width: 188, height: 77 },
    { left: 440, top: 26, width: 128, height: 77 },
    { left: 696, top: 26, width: 142, height: 77 },
    { left: 965, top: 22, width: 111, height: 85 },
  ];
  {/* A bare <div> here had no data-id -- unselectable, unrecolourable, and
      exported as an anonymous Figma "block" instead of a named layer. */}
  return <Ground id={`${id}/strip/fill`} style={{ position: 'absolute', left: 0, top, width: 1200, height: 126,
    background: orange, overflow: 'hidden',
    ...(exact ? {} : { display: 'flex', alignItems: 'center', justifyContent: 'space-around' }) }}>
    {brands.map((brand, n) => {
      const item = findMedia(brand);
      const pos = exact ? positions[n] : undefined;
      const style: React.CSSProperties = pos
        ? { position: 'absolute', left: pos.left, top: pos.top, width: pos.width, height: pos.height, objectFit: 'contain' }
        : { width: 190, height: 80, objectFit: 'contain' };
      return item?.kind === 'brand'
        ? <Media key={`${brand}-${n}`} id={`${id}/brand/${n}`}
            src={item.file} alt={brand} style={style} />
        : <Editable key={`${brand}-${n}`} id={`${id}/brand-text/${n}`}
            style={{ ...(pos ? { position: 'absolute', left: pos.left, top: pos.top } : {}),
              color: '#fff', ...type(40, 700), textAlign: 'center' }}>{brand.toUpperCase()}</Editable>;
    })}
  </Ground>;
}

export function FlashEmailHero({ doc, i, variant }: { doc: Doc; i: number; variant: string }) {
  const s = doc.sends[i], v = emailVariant('sc26_0021', variant, i)!;
  const copy = copyFor(s, doc.brief);
  const heroDirection = s.sections.find(section => section.kind === 'hero');
  const heroSale = heroDirection?.kind === 'hero' ? heroDirection.design.trim() : '';
  const heroCta = heroDirection?.kind === 'hero' ? heroDirection.cta.trim() : '';
  const heroOffer = heroDirection?.kind === 'hero' ? (heroDirection.offer ?? '').trim() : '';
  // Only trust an AI-authored "offer" when it actually reads as one -- the
  // field has come back holding the sale's name instead of its percentage
  // on at least one real parse, and a bare `!/^\d+%OFF$/` guard doesn't stop
  // that: it only rejects the one exact shape it was already going to build
  // anyway, not anything else that isn't a percent phrase at all.
  const authored = s.assetCopy?.offer && /%/.test(s.assetCopy.offer)
    && !/^\d+\s*%\s*OFF$/i.test(s.assetCopy.offer)
    ? s.assetCopy.offer : '';
  const percent = authored?.match(/(\d+)\s*%/)?.[1] || heroOffer.match(/(\d+)\s*%/)?.[1]
    || doc.brief.percent || '70';
  // The brief's own Hero bullet for the sale name wins over a whole-brief
  // regex match, which can pick up a longer phrase than what was actually
  // written under Hero (or the wrong one, on a brief with more than one
  // "... Sale" phrase in it) -- but only when it actually reads as a name.
  // A brief in the numbered "Section 1 - Hero / Design: <sentence>" format
  // puts a whole creative-direction paragraph in this same field ("Snowy
  // landscape photography with the lockup on a clean ground...") instead of
  // a sale name, and printing that verbatim as the headline is printing a
  // designer instruction, not copy -- fall through to the campaign's own
  // name instead.
  const title = authored || (looksLikeAName(heroSale) ? heroSale.toUpperCase() : '')
    || doc.brief.name?.toUpperCase()
    || (doc.brief.type === 'flash-sale' ? 'FLASH SALE' : 'SALE');
  const upto = /\bUP\s+TO\b/i.test(authored || heroOffer || doc.brief.offer)
    || (!authored && !heroOffer && doc.brief.type === 'flash-sale');
  // Urgency is a countdown phrase ("3 Days Only", "Ends Today") -- the
  // generic angle system's marquee falls back to restating the offer
  // ("EXTRA 70% OFF") when nothing urgent matched, which is the wrong kind
  // of text for this slot; let Brush's own 'LIMITED TIME' fallback take it
  // instead of showing that restated offer here.
  const urgency = /\bENDS|FINAL|LAST\b/i.test(copy.marquee) ? copy.marquee
    : doc.brief.duration || '';
  const cta = heroCta || copy.cta;
  const categories = s.sections.find(section => section.kind === 'categoryTiles');
  const categoryNames = categories?.kind === 'categoryTiles'
    ? categories.items.map(item => item.name) : [];
  const brands = doc.brief.brands?.length ? doc.brief.brands.slice(0, 4)
    : ['Merrell', 'Outdoor Research', 'Scarpa', 'Mountain Hardwear'];
  const id = `${s.id}/flash-email`;
  const tomorrow = v.id === 'tomorrow', today = v.id === 'today';
  const ctaAt = today && heroDirection?.kind === 'hero'
    && /\b800\s*px\s*or\s*higher/i.test(heroDirection.design) ? 820
    : today ? 487 : 824;
  const initialSrc = tomorrow ? '/reference/flash-tomorrow-photo-b.png'
    : today ? '/reference/flash-today-photo.png' : '/reference/flash-email-photo.jpg';
  return <Ground id={`${id}/fill`} className="sheet" data-design-variant={v.id}
    style={{ width: 1200, height: v.height, position: 'relative', overflow: 'hidden',
      background: tomorrow ? '#F5EBDF' : '#d9d9d9' }}>
    {tomorrow ? <>
      <Picture id={`${id}/photo`} zone={s.photo} initialSrc={initialSrc}
        style={{ position: 'absolute', left: 100, top: 0, width: 1000, height: 1860,
          borderRadius: 25 }} />
      <div style={{ position: 'absolute', left: 100, top: 0, width: 1000, height: 1860,
        pointerEvents: 'none', background: '#37546b42', borderRadius: 25 }} />
      <Brush id={id} text={urgency || 'LIMITED TIME'} top={170} pale />
      <SaleType id={id} top={280} title={title} percent={percent} upto={upto} pale />
      {doc.brief.code && <div style={{ position: 'absolute', left: 350, top: 570, width: 500 }}>
        <Media id={`${id}/code/mark`} src="/graphics/pill.svg" fill="#F5EBDF"
          style={{ position: 'absolute', inset: 0 }} />
        {/* The label "CODE" stays regular weight; only the code word itself
            is bold -- Editable is plain-string-only, so each needs its own id. */}
        <div style={{ position: 'relative',
          textAlign: 'center', color: ink, padding: '11px 0',
          fontFamily: stack('Quiet Sans'), fontSize: 45 }}>
          <Editable as="span" id={`${id}/code/label`} style={{ fontWeight: 400 }}>{'CODE '}</Editable>
          <Editable as="span" id={`${id}/code/value`} style={{ fontWeight: 800 }}>{doc.brief.code}</Editable>
        </div>
      </div>}
      <div style={{ position: 'absolute', left: 180, top: 670, width: 840 }}>
        {categoryNames.slice(0, 6).map((name, n) => {
          const dual = /dual\s+CTA/i.test(name);
          const label = name.replace(/\s*\(.*\)$/, '').trim();
          return (
          // The orange backing used to be a flat `background: orange,
          // borderRadius: 20` on the row's own <Ground> -- a colour fill,
          // not a graphic: no swap, no recolour-as-a-mark. `/graphics/
          // pill-wide.svg` is a real rounded-pill vector at this row's own
          // 840x140 proportions (its own corner radius, not reused from the
          // button pill -- a 20px radius on a 140px-tall row reads
          // noticeably less rounded than the CTA's, and stretching the
          // button's own shape to fit would have visibly distorted it).
          <div key={name} style={{ position: 'relative', width: '100%', height: 140, marginBottom: 22 }}>
            <Media id={`${id}/category/${n}/mark`} src="/graphics/pill-wide.svg" alt="Row"
              title="Click to recolour, resize or swap the row shape from the library"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {/* This layout row sits on TOP of the Media above (later in the
                DOM paints over it) and spans the row's full size for its
                flex centring -- without `pointerEvents: 'none'` here it
                swallows every click meant for the pill graphic underneath,
                anywhere that isn't exactly on the label or the arrow, since
                a div with no handler of its own still blocks whatever is
                stacked below it. The label and arrow opt back into pointer
                events individually so they stay clickable/editable --
                `justifyContent: 'space-between'` (not `flex: 1` on the
                label) is what pins the arrow to the right edge now, because
                `flex: 1` grew the label's own CLICKABLE box across nearly
                the whole row (a flex item's hit area is its full box, not
                just its visible glyphs), leaving almost no room for a click
                to ever reach the pill underneath. */}
            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', boxSizing: 'border-box', padding: '0 35px', color: '#fff',
              pointerEvents: 'none' }}>
              <Editable id={`${id}/category/${n}`} style={{ ...type(dual ? 45 : 50, 700), pointerEvents: 'auto' }}>{label}</Editable>
              {dual ? <div style={{ display: 'flex', gap: 18, pointerEvents: 'auto', ...type(28, 700) }}>
                <Editable id={`${id}/category/${n}/men`}>Men →</Editable>
                <Editable id={`${id}/category/${n}/women`}>Women →</Editable>
              </div> : <span style={{ fontSize: 72, fontWeight: 300 }}>→</span>}
            </div>
          </div>);
        })}
      </div>
      <Cta id={id} top={1780} text={cta || 'Shop All Sale'} />
      <BrandBand id={id} brands={brands} top={1962} />
    </> : <>
      <Picture id={`${id}/photo`} zone={s.photo} initialSrc={initialSrc}
        // Tuned by hand against the 'today' photo specifically (two hikers
        // near a lake) -- 'launch' keeps its own untouched default.
        {...(today ? { initialScale: 1.61, focus: { x: 44.22, y: 23.94 } }
          : { focus: { x: 0, y: 50 } })}
        style={{ position: 'absolute', inset: 0 }} />
      {/* 'today' (email-body/2) measures 1.1526x 'launch' across every
          number in its hero -- title, offer, upto and the brush all scale
          uniformly, confirmed against the board's own CSS export. */}
      {today
        ? <Brush id={id} text={urgency || 'LIMITED TIME'} top={66} width={436} height={79} scale={1.1526} />
        : <Brush id={id} text={urgency || 'LIMITED TIME'} top={59} />}
      <SaleType id={id} top={today ? 183 : 160} title={title} percent={percent} upto={upto} scale={today ? 1.1526 : 1} />
      {doc.brief.code && <div style={{ position: 'absolute',
        left: 350, top: today ? ctaAt > 600 ? 650 : 715 : 650, width: 500 }}>
        <Media id={`${id}/code/mark`} src="/graphics/pill.svg" fill="#F5EBDF"
          style={{ position: 'absolute', inset: 0 }} />
        {/* The label "CODE" stays regular weight; only the code word itself
            is bold -- Editable is plain-string-only, so each needs its own id. */}
        <div style={{ position: 'relative',
          textAlign: 'center', color: ink, padding: '11px 0', fontFamily: stack('Quiet Sans'),
          fontSize: 45 }}>
          <Editable as="span" id={`${id}/code/label`} style={{ fontWeight: 400 }}>{'CODE '}</Editable>
          <Editable as="span" id={`${id}/code/value`} style={{ fontWeight: 800 }}>{doc.brief.code}</Editable>
        </div>
      </div>}
      <Cta id={id} top={ctaAt} text={cta} />
      {today && <BrandBand id={id} brands={brands} top={1169} exact />}
      {!today && <BrandBand id={id} brands={brands} top={1029} exact />}
    </>}
  </Ground>;
}