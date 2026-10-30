/** Shared email shell and editable sections. Each selected Figma board owns
 *  its hero renderer; this module supplies metadata, nav, merchandising, and
 *  footer without imposing one campaign's ticket or colors on another. */
import { BRAND, type as ts, stack, photoFor, ZONE_LIST,
         type Doc, type Section } from '../model/compose';
import { copyFor } from '../model/copy';
import { Picture } from '../edit/Picture';
import { Media } from '../edit/Media';
import { LIBRARY } from '../model/media';
import { BrandMark } from './templates/BrandMark';

/** Library logos that stand in for a brand it doesn't stock yet. */
const PLACEHOLDER_LOGOS = ['patagonia', 'the-north-face', 'mountain-hardwear', 'osprey', 'outdoor-research', 'smartwool'];
import { Editable, Movable, Ground } from '../edit/Editable';
import { placeOn } from '../model/safe';
import { useEdits, textOf } from '../edit/store';
import { fitText } from '../model/textContracts';

const W = 1200;
const GUT = 64;
const ORANGE = BRAND.orange;          // #F14222 — the teaser bar, the bands, the ticket
const GREEN = BRAND.green;            // #79AC41 — 'Shop All' in the nav, and only there
const CHAR = '#2B2B2B';               // the pill
const PAPER = '#F2F0ED';

const font = (n: string, over: Partial<React.CSSProperties> = {}) => {
  const s = ts(n);
  return { fontFamily: stack(s.family), fontSize: s.size, lineHeight: s.lineHeight + 'px',
    fontWeight: /ExtraBold|Black/.test(s.style) ? 800 : /Bold/.test(s.style) ? 700 : 400,
    ...over } as React.CSSProperties;
};

/** Display type set to the length it actually has.
 *
 *  'EXTRA / 20% OFF' and 'UP TO 60% OFF / PLUS EXTRA 20% IN CART' are not the
 *  same amount of copy, and a fixed size either overflows the ticket or leaves
 *  it half empty. The size falls as the longest line grows, within the bounds
 *  the display scale allows. */
const fit = (lines: string[], max: number, min: number, boxW: number) => {
  // Solve for the size that fits the longest line in the width available,
  // rather than guessing from a character count against no box at all. That
  // guess is what set 'UP TO 60% OFF' at 94px in a 552px space and stranded
  // 'OFF' on a line of its own.
  const longest = Math.max(...lines.map(l => l.length), 1);
  return Math.round(Math.max(min, Math.min(max, boxW / (longest * 0.58))));
};

/** The reference uses one button: a charcoal pill with white bold type. */
const Pill = ({ id, children, size = 1 }: { id: string; children: string; size?: number }) => (
  <Editable id={id} style={font('CTA', { fontSize: 30 * size, lineHeight: 'normal',
    display: 'inline-block', color: BRAND.white, background: CHAR,
    padding: `${18 * size}px ${52 * size}px`, borderRadius: 999 })}>{children}</Editable>
);

/* ------------------------------------------------------------- the shell */
export function Metadata({ s, name }: { s: Doc['sends'][number]; name: string }) {
  const row = (label: string, id: string, v: string, top: number) => (
    <div style={{ position: 'absolute', left: 68, top, right: 68 }}>
      <div style={font('Documentation/Heading', { fontSize: 45, lineHeight: '52px',
        color: BRAND.ink })}>{label}</div>
      <Editable id={id} style={font('Documentation/Body', { fontSize: 36,
        lineHeight: '42px', color: BRAND.ink, marginTop: 42 })}>{v}</Editable>
    </div>
  );
  return (
    <div style={{ width: W, height: 644, position: 'relative', background: BRAND.white,
                  boxSizing: 'border-box', textAlign: 'left' }}>
      {row('Sender Name', `${s.id}/sender`, 'Steep & Cheap', 50)}
      {row('Subject Line', `${s.id}/subject`, s.assetCopy?.subject || `${name} — ${s.label}`, 225)}
      {row('Preview', `${s.id}/preview`, s.assetCopy?.preview || s.tb || `${s.label}. Shop now.`, 403)}
    </div>
  );
}

export const Nav = () => (
  <div style={{ width: W, height: 170, background: BRAND.white, padding: `28px 92px`,
                boxSizing: 'border-box', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between' }}>
    {/* Set as type it got the ampersand wrong -- it is navy, not green -- and
        lost the rule and the Backcountry line, so it moved to a file. But
        `sac-logo.png` carries the exact same navy-ampersand mistake baked
        into the raster -- never actually fixed, just moved. Pulled the real
        mark straight off the design system board (Figma node 759:29603)
        instead: black type, the actual green "&" and rule, transparent SVG. */}
    <Media id="email/nav/wordmark" src="/logos/sac-logo-light.svg"
           alt="Steep &amp; Cheap, powered by Backcountry"
           style={{ width: 220, display: 'block' }} />
    <div style={{ display: 'flex', gap: 54, ...font('Documentation/Heading', { fontSize: 28 }) }}>
      {['Men', 'Women', 'New Arrivals'].map((n, i) => <Editable key={n}
        id={`email/nav/link/${i}`} as="span" style={{ color: BRAND.ink }}>{n}</Editable>)}
      <Editable id="email/nav/link/3" as="span" style={{ color: GREEN }}>Shop All</Editable>
    </div>
  </div>
);

/** The orange teaser bar. The brief writes one per send. */
export const TeaserBar = ({ id, text }: { id: string; text: string }) => {
  const [lead, ...rest] = text.split(/\s*(?:>>|\|)\s*/);
  // minHeight, not height -- a brief's teaser line is free text with no
  // length cap of its own; a fixed height would get run through by any
  // line long enough to wrap, since nothing here clips it.
  return (
    <div style={{ width: W, background: ORANGE, minHeight: 76, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 16, padding: '14px 32px',
                  boxSizing: 'border-box', flexWrap: 'wrap' }}>
      <Editable id={id} style={font('Documentation/Heading', { fontSize: 26, color: BRAND.white })}>
        {rest.length ? lead : text}
      </Editable>
      {rest.length > 0 && <>
        <span style={{ color: '#FFFFFF99', fontSize: 24 }}>|</span>
        <Editable id={id + '/b'} style={font('Display/L', { fontSize: 26, lineHeight: 'normal',
          color: BRAND.white })}>{rest.join(' ')}</Editable>
      </>}
      <span style={{ color: BRAND.white, fontSize: 28, marginLeft: 10 }}>&#8594;</span>
    </div>
  );
};

/* -------------------------------------------------------------- the hero */
export function EmailHeader({ doc, i, bare = false }: { doc: Doc; i: number; bare?: boolean }) {
  const s = doc.sends[i], b = doc.brief;
  const H = 826;                                   // 290:6620, measured
  const k = `${s.id}/header`;
  const c = copyFor(s, b);
  const t = c.ticket;

  // The ticket, sized and placed.
  //
  //   It used to be 640 wide at a fixed left: 318, which put its centre 38px
  //   from the middle of the frame and ran it past both third lines -- every
  //   email hero in a seven-send campaign failed the thirds rule and the
  //   copy-to-subject rule in the same place, which is one template problem
  //   wearing seven faces.
  //
  //   At 520 it is a little under half the frame, its centre lands on a third,
  //   and which third comes from the photograph's own clear band rather than
  //   from a constant.
  const TW = 520;
  const pad = 40;
  const place = placeOn(s.photo);
  const left = place.at === 'right' ? Math.round(W * 2 / 3 - TW / 2)
                                    : Math.round(W / 3 - TW / 2);
  // The marquee runs across the top, so a ticket on a top band sits under it.
  const top = place.vert === 'top' ? 132 : place.vert === 'bottom' ? 420 : 232;

  const inner = TW - pad * 2;
  const big = t.kind === 'stacked'
    ? fit([t.markdown], 92, 46, inner)
    : fit([t.lead, t.offer], 104, 52, inner);
  // Code, divider and call to action share one line, so they are sized
  // together against the space they actually have.
  // 24px at 1200 wide is 12px as the email is actually displayed, and that is
  // the floor the rules set. Below it the line is there but unread.
  const foot = fit([`${t.foot}   ${'SHOP NOW >'}`], 27, 24, inner);

  // The offer has to be the largest thing in the frame. The marquee was 66px
  // against a 58px offer, so the band out-ranked the thing being sold.
  const marquee = Math.min(58, Math.round(big * 0.8));

  return (
    <div className="sheet" style={{ width: W, height: H, background: BRAND.ink }}>
      <Picture id={`${k}/photo`} zone={s.photo} label={s.label}
               style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        // The logo row and '& More' sit in the bottom eighth, on whatever the
        // photograph happens to be. At 48% they were landing on pale rock and
        // bright grass and washing out on most of the pool -- the single most
        // repeated contrast finding across the whole audit.
        background: 'linear-gradient(180deg,#00000047 0%,#0000 24%,#0000 52%,'
                  + '#00000059 78%,#000000B8 100%)' }} />

      {/* The urgency line runs across the top and off the right edge.
          It used to start 40px off the LEFT edge too, which cut its first word
          mid-letter -- 'UP TO 60% OFF' arriving as 'P TO 60% OFF'. Every
          review of every send read that as a mistake rather than as a device,
          and they were right. It starts flush now, so the band reads as
          deliberately continuing rather than as broken. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 18, overflow: 'hidden',
                    whiteSpace: 'nowrap', zIndex: 2, pointerEvents: 'none',
                    // Fading the last stretch is what makes a running band read
                    // as continuing rather than as a word chopped in half. It
                    // starts flush on the left, so only this edge needs it.
                    WebkitMaskImage: 'linear-gradient(90deg,#000 0,#000 86%,transparent 99%)',
                    maskImage: 'linear-gradient(90deg,#000 0,#000 86%,transparent 99%)' }}>
        <div style={font('Display/L', { fontSize: marquee, lineHeight: `${Math.round(marquee * 1.12)}px`,
              color: BRAND.white,
              letterSpacing: -1, textShadow: '0 2px 12px #0005' })}>
          {Array.from({ length: 4 }, () => c.marquee).map((x, n) => (
            <span key={n}>{x}<Editable as="span" id={`${k}/marquee-divider/${n}`}
              style={{ opacity: .6, margin: '0 26px' }}>|</Editable></span>
          ))}
        </div>
      </div>

      {/* the ticket: solid orange, tilted, with a hole punched out of a corner */}
      <Movable id={`${k}/ticket`} style={{ position: 'absolute', left, top, zIndex: 3 }}>
        <Ground id={`${k}/ticket/fill`} style={{ width: TW, background: ORANGE, borderRadius: 26,
          padding: `30px ${pad}px 26px ${pad}px`,
          transform: 'rotate(-2.2deg)',
          boxShadow: '0 18px 44px #0000003D',
          // The punched hole: a mask that takes a piece out of the lockup so the photograph shows through it.
          WebkitMaskImage: 'radial-gradient(circle 23px at calc(100% - 48px) 38px, transparent 99%, #000 100%)',
          maskImage: 'radial-gradient(circle 23px at calc(100% - 48px) 38px, transparent 99%, #000 100%)' }}>

          {t.kind === 'stacked' ? (
            <>
              {/* the bundle sits ON the markdown, which is what the brief asks
                  for: 'so the extra 20% reads as sitting on top of the
                  existing markdown rather than replacing it' */}
              <Editable id={`${k}/stack`} style={font('CTA', { fontSize: 27, lineHeight: 'normal',
                display: 'inline-block', background: BRAND.white, color: ORANGE,
                padding: '9px 20px', borderRadius: 6, marginBottom: 12, letterSpacing: .6 })}>
                {`+ ${t.lead} ${t.offer}`}
              </Editable>
              <Editable id={`${k}/offer`} as="h1" style={font('Display/XL', { fontSize: big,
                lineHeight: big * 0.94 + 'px', color: BRAND.white, letterSpacing: -2,
                margin: '0 0 14px' })}>{t.markdown}</Editable>
            </>
          ) : (
            <>
              <Editable id={`${k}/lead`} style={font('Display/XL', { fontSize: big,
                lineHeight: big * 0.94 + 'px', color: BRAND.white, letterSpacing: -2 })}>
                {t.lead}
              </Editable>
              <Editable id={`${k}/offer`} as="h1" style={font('Display/XL', { fontSize: big,
                lineHeight: big * 0.94 + 'px', color: BRAND.white, letterSpacing: -2,
                margin: '0 0 14px' })}>{t.offer}</Editable>
            </>
          )}

          {/* The foot row is one nowrap line, so it has to be sized to the
              ticket rather than set at a constant: at 27px in the narrower
              ticket 'SHOP NOW >' ran out past the orange and read as 'SHOP NO'. */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, whiteSpace: 'nowrap' }}>
            <Editable id={`${k}/code`} style={font('CTA', { fontSize: foot, lineHeight: 'normal',
                        color: BRAND.white, letterSpacing: 1.2 })}>{t.foot}</Editable>
            <Editable as="span" id={`${k}/divider`}
              style={{ color: '#FFFFFFAA', fontSize: foot + 1 }}>|</Editable>
            <Editable id={`${k}/cta`} style={font('CTA', { fontSize: foot, lineHeight: 'normal',
                        color: BRAND.white, letterSpacing: 1.2 })}>SHOP NOW &gt;</Editable>
          </div>
        </Ground>
      </Movable>

      {/* the brand strip along the bottom */}
      {!bare && (
        <div style={{ position: 'absolute', left: GUT, right: GUT, bottom: 44, zIndex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {[['brand-the-north-face', 84], ['brand-patagonia', 60],
            ['brand-mountain-hardwear', 78]].map(([f, h], x) => {
            const b = LIBRARY.find(i => i.id === f)!;
            return <Media key={x} id={`${k}/brand/${x}`} src={b.file} alt={b.name}
                          title="Click to replace this brand"
                          style={{ height: h as number,
                                   filter: 'drop-shadow(0 2px 10px #0007)' }} />;
          })}
          <Editable id={`${k}/more`} style={font('Display/L', { fontSize: 28, lineHeight: '30px',
            color: BRAND.white, textShadow: '0 2px 10px #0007' })}>&amp; More</Editable>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- bands */
/** A section heading is a full-width orange band with white type on it. */
const BandHead = ({ id, children, accent = ORANGE }: { id: string; children: string; accent?: string }) => (
  <div style={{ width: W, background: accent, padding: '26px 0' }}>
    <Editable id={id} as="h2" style={font('Display/L', { fontSize: 44, lineHeight: '50px',
      color: BRAND.white, margin: 0, textAlign: 'center' })}>{children}</Editable>
  </div>
);

/** sc26_0021's own section header: white, dark ink, centered -- read off the
 *  board's "Top Categories" / "Flash Sale Top Picks" / "More Current Deals"
 *  frames, all three identical down to the pixel. */
const flashTrim = { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } as React.CSSProperties;

const FlashHeader = ({ id, children }: { id: string; children: string }) => {
  // A 187px-tall band with a fixed 104px font and nothing to clip it: a
  // header longer than the board's own three examples ("Top Categories",
  // "Flash Sale Top Picks", "More Current Deals") would run past the band's
  // edges with no shrink and no clip. Sized off the LIVE text (post-edit),
  // the same way BoardHero/FlashSocial size their own title off `textOf` --
  // not the original prop, which Editable itself ignores once edited.
  const { edits } = useEdits();
  const live = textOf(edits, id, children);
  const fit = fitText(live, 'section.header', { widthBudget: W - 128 });
  const { fontSize } = fit;
  return (
    <div style={{ width: W, height: 187, background: BRAND.white, display: 'flex',
      alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      <Editable id={id} as="h2" fit={fit.contract} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 700,
        fontSize, lineHeight: (fontSize! * .95) + 'px', letterSpacing: -1.04, color: '#333', ...flashTrim,
        margin: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>{children}</Editable>
    </div>
  );
};

const White = ({ children, pad = 48, bg = BRAND.white }: {
  children: React.ReactNode; pad?: number; bg?: string;
}) => (
  <div style={{ width: W, background: bg, padding: `${pad}px ${GUT}px`, boxSizing: 'border-box',
                textAlign: 'center' }}>{children}</div>
);

function ProductGrid({ k, cta, bump = false, count = 4 }: {
  k: string; cta: string; bump?: boolean; count?: number }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: bump ? '100px 50px' : '40px 60px',
                    maxWidth: bump ? 1000 : 900, margin: '0 auto' }}>
        {Array.from({ length: Math.max(1, Math.min(count, 12)) }, (_, n) => (
          <div key={n}>
            {bump ? <Picture id={`${k}/product/${n}/photo`}
              zone={ZONE_LIST.find(z => z.id === 'product-gear-03')!}
              initialSrc={`/reference/bump-product-${n + 1}.png`}
              style={{ width: 475, height: 475, opacity: .5 }} />
              : <div style={{ aspectRatio: '1 / 1', background: '#F6F4F1', borderRadius: 4,
                display: 'grid', placeItems: 'center',
                ...font('Documentation/Body', { fontSize: 15, color: '#00000038' }) }}>
                Merch to supply
              </div>}
            <Editable id={`${k}/product/${n}/brand`} style={font('Documentation/Heading', {
              fontSize: 22, marginTop: 30 })}>Brand Name</Editable>
            <Editable id={`${k}/product/${n}/name`} style={font('Documentation/Body', {
              fontSize: 20, marginTop: 22 })}>Product Name</Editable>
            <Editable id={`${k}/product/${n}/price`} style={font('Documentation/Heading', {
              fontSize: 20, marginTop: 22 })}>$(Sale Price) $(Original Price)</Editable>
            <Editable id={`${k}/product/${n}/shop`} style={font('Documentation/Body', {
              fontSize: 20, marginTop: 22, textDecoration: 'underline' })}>Shop Now</Editable>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40 }}><Pill id={`${k}/cta`}>{cta}</Pill></div>
    </>
  );
}

/** A lifestyle tile: the photograph carries its percentage and its own pill. */
function Tile({ k, name, percent, cta, zone, h = 320, photo }: {
  k: string; name: string; percent: string; cta: string;
  zone: ReturnType<typeof photoFor>; h?: number; photo?: string;
}) {
  const { edits } = useEdits();
  const liveName = textOf(edits, `${k}/name`, name);
  return (
    <div style={{ position: 'relative', width: '100%', height: h, overflow: 'hidden',
                  borderRadius: 6, marginBottom: 18 }}>
      <Picture id={`${k}/pic`} zone={zone} initialSrc={photo} label={name} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,#00000066 0%,#0000 52%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 32, top: 28, textAlign: 'left', zIndex: 2 }}>
        {percent && <>
          <Editable id={`${k}/upto`} style={font('Eyebrow', { fontSize: 19, color: BRAND.white,
            letterSpacing: 1.2 })}>UP TO</Editable>
          <Editable id={`${k}/pct`} style={font('Display/L', { fontSize: 58, lineHeight: '58px',
            color: BRAND.white })}>{percent + '% OFF'}</Editable>
        </>}
        {(() => { const fit = fitText(liveName, 'section.tileName', { widthBudget: 1000 });
          const { fontSize } = fit;
          return <Editable id={`${k}/name`} fit={fit.contract} style={font('Display/L', { fontSize, lineHeight: (fontSize!*1.13) + 'px',
            color: BRAND.white, marginTop: percent ? 6 : 0 })}>{name}</Editable>; })()}
      </div>
      <div style={{ position: 'absolute', left: 32, bottom: 28, zIndex: 2 }}>
        <Pill id={`${k}/cta`} size={0.5}>{cta}</Pill>
      </div>
    </div>
  );
}

export function SectionView({ sec, k, pursuit, body, brief, accent, templateId, recsIndex = 0 }: {
  sec: Section; k: string; pursuit: string; body: string; accent?: string;
  templateId?: string; brief: Doc['brief']; recsIndex?: number;
}) {
  const { edits } = useEdits();
  if (sec.kind === 'hero') {
    // Longer copy is set smaller rather than allowed to run on, so a send with
    // more to say does not change the shape of the band it sits in.
    const size = body.length > 190 ? 21 : body.length > 150 ? 23 : 25;
    return (
      <White pad={46}>
        <Editable id={`${k}/body`} style={font('Body/Email', { fontSize: size,
          lineHeight: Math.round(size * 1.5) + 'px', color: BRAND.ink,
          maxWidth: 840, margin: '0 auto 28px' })}>{body}</Editable>
        <Pill id={`${k}/cta2`}>{sec.cta || 'Shop Now'}</Pill>
      </White>
    );
  }

  if (sec.kind === 'productRecs')
    return (
      <>
        <BandHead id={`${k}/head`} accent={accent}>{sec.header || 'Your Top Picks'}</BandHead>
        <White pad={46}><ProductGrid k={k} cta={sec.cta || 'See More'} count={sec.count}
          bump={templateId === 'sc26_0060'} /></White>
      </>
    );

  if (sec.kind === 'moreDeals') {
    // The board's own two placeholder photos for this frame -- a forest
    // rainwear shot and a mountain-ridge backpacking shot -- reused in
    // whatever order the brief names its deals, not tied to a fixed label.
    const photos = ['/reference/more-current-deals-rainwear-photo.jpg',
      '/reference/more-current-deals-backpacks-photo.jpg'];
    return (
      <>
        <FlashHeader id={`${k}/head`}>{sec.header || 'More Current Deals'}</FlashHeader>
        <div style={{ width: W, background: BRAND.white, padding: '48px 64px 64px', boxSizing: 'border-box' }}>
          {sec.items.map((it, n) => (
            <Tile key={n} k={`${k}/t${n}`} name={it.name} percent={it.percent}
              cta={it.cta || 'Shop Now'} zone={photoFor(pursuit, n)}
              photo={photos[n % photos.length]} h={413} />
          ))}
        </div>
      </>
    );
  }

  if (sec.kind === 'categoryTiles')
    return (
      <>
        <BandHead id={`${k}/head`} accent={accent}>{sec.header || 'Shop The Sale'}</BandHead>
        <White pad={40}>
          {templateId === 'sc26_0060' ? sec.items.map((it, n) => {
            const label = it.name.toLowerCase();
            const category = label.includes('snowboard') ? 'snowboard'
              : label.includes('ski') ? 'ski'
              : label.includes('camp') ? 'camp'
              : label.includes('climb') ? 'climb'
              : label.includes('bike') ? 'bike'
              : label.includes('foot') ? 'footwear'
              : label.includes('women') ? 'women'
              : label.includes('men') ? 'men' : 'other';
            const photo = category === 'climb' ? '/photos/climb-03.jpg'
              : category === 'bike' ? '/reference/flash-email-photo.jpg'
              : category === 'other' ? undefined
              : `/reference/bump-category-${category}.png`;
            const zone = ZONE_LIST.find(z => z.id === (category === 'climb' ? 'climb-03' : 'hike-07'))
              ?? photoFor(pursuit, n);
            return <div key={n} style={{ position: 'relative', width: 1127, height: 335,
              marginBottom: 32, overflow: 'hidden', borderRadius: 24, textAlign: 'left' }}>
              <Picture id={`${k}/t${n}/pic`} zone={zone} label={it.name}
                initialSrc={photo}
                focus={{ x: 50, y: 35 }}
                style={{ position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(90deg,#0008,transparent 70%)' }} />
              <Editable id={`${k}/t${n}/name`} style={font('Display/L', {
                position: 'absolute', left: 28, bottom: 28, fontSize: 58,
                color: '#fff', textTransform: 'uppercase' })}>{it.name}</Editable>
              <span style={{ position: 'absolute', right: 30, bottom: 22,
                color: '#fff', fontSize: 78, lineHeight: 1 }}>→</span>
              <span style={{ position: 'absolute', right: -54, top: 20, width: 250,
                background: '#79AC41', transform: 'rotate(30deg)', textAlign: 'center',
                color: '#fff', fontSize: 22, fontWeight: 700 }}><Editable id={`${k}/t${n}/ribbon`}
                  as="span">{brief.offer || `EXTRA ${brief.percent}% OFF`}</Editable></span>
            </div>;
          }) : sec.items.map((it, n) => (
            <Tile key={n} k={`${k}/t${n}`} name={it.name} percent={it.percent}
                  cta={sec.cta || 'Shop Now'} zone={photoFor(pursuit, n + 2)} />
          ))}
        </White>
      </>
    );

  if (sec.kind === 'brandTiles') {
    const list = sec.items.slice(0, sec.count);
    return (
      <>
        <BandHead id={`${k}/head`} accent={accent}>{sec.header || 'Shop By Brand'}</BandHead>
        <White pad={40}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {list.map((it, n) => {
              // A brand the library doesn't stock yet keeps a real placeholder
              // logo to swap from the library, as every other brand slot does
              // -- never the brand's name set as type in a logo's place.
              return <div key={n} style={{ height: 515, background: '#303030',
                borderRadius: 22, display: 'grid', placeItems: 'center' }}>
                <BrandMark id={`${k}/brand/${n}`} name={it.name}
                  fallback={`/logos/brand-${PLACEHOLDER_LOGOS[n % PLACEHOLDER_LOGOS.length]}.svg`}
                  style={{ width: 350, height: 300, objectFit: 'contain' }} />
              </div>;
            })}
          </div>
        </White>
      </>
    );
  }

  if (sec.kind === 'terms')
    return (
      <White bg={PAPER} pad={32}>
        <Editable id={`${k}/terms`} style={font('Documentation/Body', { fontSize: 14,
          lineHeight: '22px', color: '#00000099', maxWidth: 900, margin: '0 auto' })}>
          {`Terms & Conditions — ${brief.offer || 'Offer details'}${brief.code ? ` · Use code ${brief.code}`
            : brief.noCode ? ' · No code needed' : ''}${brief.dates ? ` · ${brief.dates}` : ''}.`}
        </Editable>
      </White>
    );

  return (
    <White bg="#FFF3F0" pad={26}>
      <Editable id={`${k}/unknown`} style={font('Documentation/Body', { fontSize: 15, color: BRAND.red })}>
        {`Not built as a section: ${sec.title}`}
      </Editable>
    </White>
  );
}

export const Footer = () => (
  <div style={{ width: W, background: PAPER, padding: `34px ${GUT}px 28px`, boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Media id="email/foot/wordmark" src="/logos/sac-logo-light.svg"
             alt="Steep &amp; Cheap, powered by Backcountry"
             style={{ width: 210, display: 'block' }} />
      <div style={{ display: 'flex', gap: 14 }}>
        {['social-facebook', 'social-instagram'].map((f, n) => (
          <Media key={n} id={`email/foot/social/${n}`} src={`/logos/${f}.png`}
                 alt={f.replace('social-', '')} style={{ height: 30 }} />
        ))}
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26,
                  ...font('Documentation/Label', { fontSize: 12, color: '#00000099' }) }}>
      <div style={{ textAlign: 'left' }}>
        2607 South 3200 West, Suite A, Salt Lake City, UT<br />
        © 2026 SteepandCheap.com. All rights reserved
      </div>
      <div style={{ textAlign: 'right', textDecoration: 'underline' }}>
        Unsubscribe<br />Talk to a Gearhead
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ body */
export function EmailBody({ doc, i, hero, templateId }: {
  doc: Doc; i: number; hero?: React.ReactNode; templateId?: string;
}) {
  const s = doc.sends[i];
  const bump = templateId === 'sc26_0060';
  return (
    <div className="sheet stack" style={{ width: W, background: BRAND.white }}>
      <Metadata s={s} name={doc.brief.name} />
      <Nav />
      {!bump && s.tb && <TeaserBar id={`${s.id}/tb`} text={s.tb} />}
      {hero ?? <EmailHeader doc={doc} i={i} />}
      {(() => { let recs = 0; return s.sections.filter(sec => !(bump && sec.kind === 'hero')).map((sec, n) => (
        <SectionView key={n} sec={sec} k={`${s.id}/s${n}`} pursuit={s.pursuit}
                     brief={doc.brief}
                     body={copyFor(s, doc.brief).body} accent={bump ? '#79AC41' : undefined}
                     templateId={templateId} recsIndex={sec.kind === 'productRecs' ? recs++ : 0} />
      )); })()}
      <Footer />
    </div>
  );
}
