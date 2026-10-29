/** Spring Flash email hero family, compiled from its own three Figma email
 *  frames (src/data/figma/flash-email-*.json; npm run figma:pull). Type, offer, categories and CTA stay independent React elements. */
import type { Doc } from '../../../model/compose';
import { copyFor } from '../../../model/copy';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { useEdits, textOf } from '../../../edit/store';
import { emailVariant } from '../../../templates/variants';
import { stack } from '../../../fonts';
import { find as findMedia } from '../../../model/media';
import { looksLikeAName, boardFit } from './textContracts';
import { photoFor, photoUrl, type Zone } from '../../../model/compose';
import { layerOf, boxOf, anchorOf, typeOf, imageRect, brandSlot, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import flashEmailHero from '../../../data/figma/flash-email-hero.json';
import flashEmailTomorrow from '../../../data/figma/flash-email-tomorrow.json';
import flashEmailToday from '../../../data/figma/flash-email-today.json';
import flashEmailHeroBand from '../../../data/figma/flash-email-hero-band.json';

const orange = '#F14222', ink = '#333';
const type = (size: number, weight = 800): React.CSSProperties => ({
  fontFamily: stack('Quiet Sans'), fontSize: size, fontWeight: weight,
  lineHeight: 1, letterSpacing: -size * .015,
});

/** The bolt flanking the title: the library's own "bolt" mark. The board's
 *  own bolt is ink, matching this send's dark title -- not white, which is
 *  what hero-desktop and paid-social use against their own, lighter crop. */
function Bolt({ id, size, pale = false }: { id: string; size: number; pale?: boolean }) {
  return <Media id={id} src={pale ? '/graphics/bolt.svg' : '/graphics/bolt-ink.svg'} alt=""
    // flex: none -- in a row a long title fills, a flex item shrinks, and a
    // bolt has no text to stop it: it was squeezed to 0px wide.
    style={{ width: size * 40 / 88, height: size, display: 'inline-block', verticalAlign: 'middle', flex: 'none' }} />;
}
/** A board's brand strip: its band (`rect`) and its four logo slots, left to
 *  right, all from its compiled Figma frame. The brief's brands fill the
 *  board's own slots: the board's own brand in its slot gets its exact box;
 *  any other brand an even cell centred on the slot -- a slot shaped for a
 *  long, short wordmark (Merrell, 296x33) shrank a square logo to a speck. */
type Band = { layout: FigmaLayout; rect: string; slots: readonly string[] };

/** The brand strip under a hero, `top` on the sheet. */
function BrandBand({ id, brands, top, band }: { id: string; brands: string[]; top: number; band: Band }) {
  const rect = layerOf(band.layout, band.rect);
  const fill = rect.images?.[0], texture = fill && band.layout.assets?.[fill.ref];
  {/* A bare <div> here had no data-id -- unselectable, unrecolourable, and
      exported as an anonymous Figma "block" instead of a named layer. */}
  return <Ground id={`${id}/strip/fill`} style={{ position: 'absolute', left: 0, top, width: rect.w, height: rect.h,
    background: rect.fill ?? orange, overflow: 'hidden' }}>
    {texture && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url(${texture.src})`,
      backgroundSize: 'cover', mixBlendMode: fill.blend === 'SCREEN' ? 'screen' : undefined, opacity: fill.opacity }} />}
    {brands.slice(0, band.slots.length).map((brand, n) => {
      const item = findMedia(brand);
      const slot = brandSlot(band.slots.map(s => layerOf(band.layout, s)), n, brand);
      // A brand the library doesn't stock yet keeps a real placeholder logo
      // (cycling the known set), not plain text -- every brand slot is an
      // image, same as the ones the library does resolve.
      const placeholder = ['the-north-face', 'patagonia', 'mountain-hardwear', 'osprey'][n % 4];
      const src = item?.kind === 'brand' ? item.file : `/logos/brand-${placeholder}.svg`;
      return <Media key={`${brand}-${n}`} id={`${id}/brand/${n}`} src={src} alt={brand}
        style={{ position: 'absolute', left: slot.x - rect.x, top: slot.y - rect.y, width: slot.w, height: slot.h,
          objectFit: 'contain' }} />;
    })}
  </Ground>;
}

/** Which Figma layer (src/data/figma/flash-email-hero.json, the launch
 *  send's hero) each editable layer is, by the part of its id after
 *  `<send>/flash-email`. The position check holds the render to these. */
export const FLASH_EMAIL_FIGMA = {
  mark: '248:711119', urgency: '248:711122',
  'title/bolt-left': '248:711111', title: '248:711110', 'title/bolt-right': '248:711115',
  upto: '248:711106', offer: '248:711104', 'cta/mark': '248:711099', cta: '248:711100',
} as const;

/** The same for the 'tomorrow' send (src/data/figma/flash-email-tomorrow.json).
 *  Category rows run top to bottom on the board. */
export const FLASH_EMAIL_TOMORROW_FIGMA = {
  photo: '248:711332', mark: '248:711336', urgency: '248:711339',
  'title/bolt-left': '248:711350', title: '248:711349', 'title/bolt-right': '248:711354',
  upto: '248:711345', offer: '248:711343',
  'category/0/mark': '248:711358', 'category/0': '248:711365',
  'category/1/mark': '248:711398', 'category/1': '248:711405',
  'category/2/mark': '248:711369', 'category/2': '248:711375',
  'category/3/mark': '248:711379', 'category/3': '248:711384',
  'category/4/mark': '248:711388', 'category/4': '248:711394',
  'category/5/mark': '248:711409', 'category/5': '248:711415',
  'cta/mark': '248:711419', cta: '248:711420', 'strip/fill': '248:711422',
  'brand/0': '248:711424', 'brand/1': '248:711425', 'brand/2': '248:711426', 'brand/3': '248:711427',
} as const;

/** The same for the 'today' send (src/data/figma/flash-email-today.json). */
export const FLASH_EMAIL_TODAY_FIGMA = {
  mark: '248:711267', urgency: '248:711270',
  'title/bolt-left': '248:711259', title: '248:711258', 'title/bolt-right': '248:711263',
  upto: '248:711254', offer: '248:711252', 'cta/mark': '248:711247', cta: '248:711248',
} as const;

/** One board's single-photo hero (launch, ends today): its compiled frame,
 *  which layer each part is (`map`, plus the title and offer row groups),
 *  its photo, and how much sheet runs on below the frame (the brand strip). */
type HeroSpec = { variant: string; layout: FigmaLayout; map: Record<keyof typeof FLASH_EMAIL_FIGMA, string>;
  titleRow: string; offerRow: string; photo: { src: string; size: [number, number] };
  below: number; brandTop: number; band: Band; codeTop: number; ctaTop?: number };
const LAUNCH: HeroSpec = { variant: 'launch', layout: flashEmailHero as unknown as FigmaLayout, map: FLASH_EMAIL_FIGMA,
  titleRow: '248:711107', offerRow: '248:711101', photo: { src: '/reference/flash-email-photo.jpg', size: [4096, 2373] },
  below: 126, brandTop: 1029, codeTop: 650,
  // E1's strip is its own frame on the board, just under the hero.
  band: { layout: flashEmailHeroBand as unknown as FigmaLayout, rect: '248:711124',
    slots: ['248:711129', '248:711127', '248:711128', '248:711126'] } };
const todayLayout = flashEmailToday as unknown as FigmaLayout;
const todayPhoto = todayLayout.assets![todayLayout.frame.images![0].ref];
const TODAY: HeroSpec = { variant: 'today', layout: todayLayout, map: FLASH_EMAIL_TODAY_FIGMA,
  titleRow: '248:711255', offerRow: '248:711249', photo: { src: todayPhoto.src, size: [todayPhoto.w, todayPhoto.h] },
  below: 0, brandTop: 1169, codeTop: 715,
  band: { layout: todayLayout, rect: '248:711272', slots: ['248:711277', '248:711275', '248:711276', '248:711274'] } };

/** A single-photo send's hero (launch, ends today), every box, size, colour
 *  and crop from its Figma frame; only behaviour is decided here:
 *   - The brush grows with longer urgency text, centred where the board centres it.
 *   - The title row (bolts and title) and the UP TO + offer row stay
 *     centred on the board's own centres; the title shrinks to fit.
 *   - The button grows with a longer CTA, centred on the board's button.
 *   - A code pill (no layer on the board) sits between the offer and the button.
 *  FigmaFrame supplies the photo at Figma's crop; the copy stays centred
 *  (`centred`) and auto-crop frames the photo round it. The brand strip
 *  sits below the frame. */
function FlashEmailCompiled({ spec, id, zone, title, percent, upto, urgency, cta, code, brands }: {
  spec: HeroSpec; id: string; zone: Zone; title: string; percent: string; upto: boolean;
  urgency: string; cta: string; code?: string; brands: string[];
}) {
  const { edits } = useEdits();
  const [fw, fh] = spec.layout.size;
  const L = (part: keyof typeof FLASH_EMAIL_FIGMA) => layerOf(spec.layout, spec.map[part]);

  const brush = L('mark'), u = L('urgency');
  // The brush stays the board's size; longer urgency contracts to its room.
  const urgencyFit = boardFit(textOf(edits, `${id}/urgency`, urgency), 'hero.urgency', u);
  const brushW = brush.w, brushH = brush.h;

  const titleFit = boardFit(textOf(edits, `${id}/title`, title), 'hero.title', L('title'));
  const offerFit = boardFit(textOf(edits, `${id}/offer`, `${percent}% OFF`), 'hero.offer', L('offer'));
  const k = (titleFit.fontSize ?? L('title').text!.size) / L('title').text!.size;
  const boltGap = (L('title').x - L('title/bolt-left').x - L('title/bolt-left').w) * k;
  const uptoGap = L('offer').x - L('upto').x - L('upto').w;
  const button = L('cta/mark'), label = L('cta');
  const ctaFit = boardFit(textOf(edits, `${id}/cta`, cta), 'hero.cta', label);
  const row = (group: string): React.CSSProperties => ({ ...anchorOf(layerOf(spec.layout, group), 'CENTER'), alignItems: 'flex-start' });
  // A brief that asks for the CTA low ("800px or higher") moves it there.
  const lift = spec.ctaTop === undefined ? 0 : button.y - spec.ctaTop;

  return <FigmaFrame id={id} size={[fw, fh + spec.below]} frameHeight={fh} layout={spec.layout} zone={zone} centred
    background="#d9d9d9" attrs={{ 'data-design-variant': spec.variant }}
    photo={{ id: `${id}/photo`, ...spec.photo }}
    after={<BrandBand id={id} brands={brands} top={spec.brandTop} band={spec.band} />}>
    {/* Centred on the board's own brush centre, which isn't always the sheet's. */}
    <div style={{ ...boxOf(brush), left: brush.x + brush.w / 2 - fw / 2, width: fw, height: brushH,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: brushW, height: brushH, display: 'grid', placeItems: 'center', flex: 'none', pointerEvents: 'none' }}>
        <Media id={`${id}/mark`} src="/graphics/brush-stroke.svg" alt=""
          title="Click to recolour, resize or swap the brush mark from the library"
          style={{ position: 'absolute', left: 0, top: 0, width: brushW, height: brushH }} />
        {/* The board sets the text a hair off the brush's centre; kept. */}
        <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={{ ...typeOf(u, urgencyFit.fontSize), position: 'relative',
          left: u.x + u.w / 2 - brush.x - brush.w / 2 }}>{urgency}</Editable>
      </div>
    </div>

    <div style={{ ...row(spec.titleRow), alignItems: 'center' }}>
      <Bolt id={`${id}/title/bolt-left`} size={L('title/bolt-left').h * k} />
      <Editable id={`${id}/title`} fit={titleFit.contract}
        style={{ ...typeOf(L('title'), titleFit.fontSize), margin: `0 ${boltGap}px` }}>{title}</Editable>
      <Bolt id={`${id}/title/bolt-right`} size={L('title/bolt-right').h * k} />
    </div>

    <div style={row(spec.offerRow)}>
      <Editable id={`${id}/upto`} style={{ ...typeOf(L('upto'), upto ? undefined : 35), whiteSpace: 'pre',
        marginRight: uptoGap }}>{upto ? 'UP\nTO' : 'EXTRA'}</Editable>
      <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(L('offer'), offerFit.fontSize)}>{`${percent}% OFF`}</Editable>
    </div>

    {code && <div style={{ position: 'absolute', left: 350, top: spec.codeTop, width: 500 }}>
      <Media id={`${id}/code/mark`} src="/graphics/pill.svg" fill="#F5EBDF"
        style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'relative', textAlign: 'center', color: ink, padding: '11px 0',
        fontFamily: stack('Quiet Sans'), fontSize: 45 }}>
        <Editable as="span" id={`${id}/code/label`} style={{ fontWeight: 400 }}>{'CODE '}</Editable>
        <Editable as="span" id={`${id}/code/value`} style={{ fontWeight: 800 }}>{code}</Editable>
      </div>
    </div>}

    <div style={{ ...anchorOf(button, 'CENTER'), top: button.y - lift }}>
      <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
        padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center' }}>
        <Media id={`${id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
          title="Click to recolour, resize or swap the button shape from the library"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <Editable id={`${id}/cta`} fit={ctaFit.contract} style={{ ...typeOf(label, ctaFit.fontSize), position: 'relative' }}>{cta}</Editable>
      </div>
    </div>
  </FigmaFrame>;
}

const TOMORROW = flashEmailTomorrow as unknown as FigmaLayout;
const T = (part: keyof typeof FLASH_EMAIL_TOMORROW_FIGMA | string) =>
  layerOf(TOMORROW, (FLASH_EMAIL_TOMORROW_FIGMA as Record<string, string>)[part] ?? part);
/** The board's six category rows, top to bottom: the row, its label, the
 *  grey thumbnail tile, the image in it, and the arrow. */
const TOMORROW_ROWS = [
  { row: '248:711358', label: '248:711365', tile: '248:711361', image: '248:711362', arrow: '248:711366' }, // Men's Apparel
  { row: '248:711398', label: '248:711405', tile: '248:711401', image: '248:711402', arrow: '248:711406' }, // Women's Apparel
  { row: '248:711369', label: '248:711375', tile: '248:711371', image: '248:711372', arrow: '248:711376' }, // Footwear
  { row: '248:711379', label: '248:711384', tile: '248:711381', image: '248:711381', arrow: '248:711385' }, // Camp Gear
  { row: '248:711388', label: '248:711394', tile: '248:711390', image: '248:711391', arrow: '248:711395' }, // Climb Gear
  { row: '248:711409', label: '248:711415', tile: '248:711411', image: '248:711412', arrow: '248:711416' }, // Daypacks
];
/** Which board thumbnail a category gets, by what it names. None matched,
 *  the tile shows the photo the body's own category tile for it does (its
 *  pursuit photo), so the row is never blank; either swaps from the library. */
const THUMB_WORDS = [/\bmen(['’]s)?\b/i, /wom[ae]n/i, /foot|shoe|boot/i, /camp|tent|sleep/i, /climb/i, /pack|bag/i];

const asset = (l: { images?: { ref: string }[] }) => l.images?.[0] && TOMORROW.assets?.[l.images[0].ref];
const shadowOf = (l: { shadow?: { x: number; y: number; blur: number; color?: string } }) =>
  l.shadow ? `drop-shadow(${l.shadow.x}px ${l.shadow.y}px ${l.shadow.blur / 2}px ${l.shadow.color ?? '#0004'})` : undefined;

/** The 'tomorrow' send, from its Figma frame (src/data/figma/flash-email-tomorrow.json):
 *  paper ground, a rounded photo card with a soft slate glow behind the
 *  type, the sale lockup, category rows with thumbnails, the CTA and the
 *  brand strip. Behaviour decided here:
 *   - The brush grows with longer urgency text; title row and offer row stay centred.
 *   - Rows follow the board's spacing for however many categories the
 *     brief has (up to six); labels shrink to fit before the arrow.
 *   - Each row's thumbnail is the board's own for that kind of category,
 *     or an empty tile.
 *   - A code pill (no layer on the board) takes the first row's place and
 *     the rows move down under it.
 *  The copy stays centred; auto-crop frames the photo round it. */
function FlashEmailTomorrow({ id, zone, pursuit, title, percent, upto, urgency, cta, code, brands, categories }: {
  id: string; zone: Zone; pursuit: string; title: string; percent: string; upto: boolean;
  urgency: string; cta: string; code?: string; brands: string[]; categories: string[];
}) {
  const { edits } = useEdits();
  const [fw, fh] = TOMORROW.size;
  const card = T('photo'), glow = T('248:711334'), paper = T('248:711330');

  const brush = T('mark'), u = T('urgency');
  // The brush stays the board's size; longer urgency contracts to its room.
  const urgencyFit = boardFit(textOf(edits, `${id}/urgency`, urgency), 'hero.urgency', u);
  const brushW = brush.w, brushH = brush.h;

  const titleFit = boardFit(textOf(edits, `${id}/title`, title), 'hero.title', T('title'));
  const offerFit = boardFit(textOf(edits, `${id}/offer`, `${percent}% OFF`), 'hero.offer', T('offer'));
  const k = (titleFit.fontSize ?? T('title').text!.size) / T('title').text!.size;
  const boltGap = (T('title').x - T('title/bolt-left').x - T('title/bolt-left').w) * k;
  const uptoGap = T('offer').x - T('upto').x - T('upto').w;
  const row = (group: string): React.CSSProperties => ({ ...anchorOf(layerOf(TOMORROW, group), 'CENTER'), alignItems: 'flex-start' });

  const first = TOMORROW_ROWS[0], step = T(TOMORROW_ROWS[1].row).y - T(first.row).y;
  const pillH = 76, codeShift = code ? pillH + 30 : 0;
  const button = T('cta/mark'), label = T('cta');
  const ctaFit = boardFit(textOf(edits, `${id}/cta`, cta), 'hero.cta', label);

  return <FigmaFrame id={id} size={[fw, fh]} layout={TOMORROW} zone={zone} centred
    attrs={{ 'data-design-variant': 'tomorrow' }}
    photo={{ id: `${id}/photo`, src: asset(card)!.src, size: [asset(card)!.w, asset(card)!.h], layer: card }}
    ground={<div style={{ ...boxOf(paper), opacity: paper.opacity, pointerEvents: 'none',
      backgroundImage: `url(${asset(paper)!.src})`, backgroundRepeat: 'repeat' }} />}
    fixed={<div style={{ ...boxOf(card), borderRadius: card.radius, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ ...boxOf(glow), left: glow.x - card.x, top: glow.y - card.y, background: glow.fill,
        opacity: glow.opacity, filter: `blur(${(glow.blur ?? 0) / 2}px)` }} />
    </div>}
    after={<BrandBand id={id} brands={brands} top={T('248:711422').y}
      band={{ layout: TOMORROW, rect: '248:711422', slots: ['248:711424', '248:711425', '248:711426', '248:711427'] }} />}>
    {/* Centred on the board's own brush centre, which isn't always the sheet's. */}
    <div style={{ ...boxOf(brush), left: brush.x + brush.w / 2 - fw / 2, width: fw, height: brushH,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: brushW, height: brushH, display: 'grid', placeItems: 'center', flex: 'none', pointerEvents: 'none' }}>
        <Media id={`${id}/mark`} src="/graphics/brush-stroke.svg" alt=""
          title="Click to recolour, resize or swap the brush mark from the library"
          style={{ position: 'absolute', left: 0, top: 0, width: brushW, height: brushH }} />
        {/* The board sets the text a hair off the brush's centre; kept. */}
        <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={{ ...typeOf(u, urgencyFit.fontSize), position: 'relative',
          left: u.x + u.w / 2 - brush.x - brush.w / 2 }}>{urgency}</Editable>
      </div>
    </div>

    <div style={{ ...row('248:711346'), alignItems: 'center' }}>
      <Bolt id={`${id}/title/bolt-left`} size={T('title/bolt-left').h * k} pale />
      <Editable id={`${id}/title`} fit={titleFit.contract}
        style={{ ...typeOf(T('title'), titleFit.fontSize), margin: `0 ${boltGap}px` }}>{title}</Editable>
      <Bolt id={`${id}/title/bolt-right`} size={T('title/bolt-right').h * k} pale />
    </div>

    <div style={row('248:711340')}>
      <Editable id={`${id}/upto`} style={{ ...typeOf(T('upto'), upto ? undefined : 35), whiteSpace: 'pre',
        marginRight: uptoGap }}>{upto ? 'UP\nTO' : 'EXTRA'}</Editable>
      <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(T('offer'), offerFit.fontSize)}>{`${percent}% OFF`}</Editable>
    </div>

    {code && <div style={{ position: 'absolute', left: 350, top: T(first.row).y, width: 500, height: pillH }}>
      <Media id={`${id}/code/mark`} src="/graphics/pill.svg" fill="#F5EBDF"
        style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'relative', textAlign: 'center', color: ink, padding: '11px 0',
        fontFamily: stack('Quiet Sans'), fontSize: 45 }}>
        <Editable as="span" id={`${id}/code/label`} style={{ fontWeight: 400 }}>{'CODE '}</Editable>
        <Editable as="span" id={`${id}/code/value`} style={{ fontWeight: 800 }}>{code}</Editable>
      </div>
    </div>}

    {categories.slice(0, TOMORROW_ROWS.length).map((name, n) => {
      const r = T(first.row), at = (l: { x: number; y: number }) => ({ left: l.x - r.x, top: l.y - r.y });
      const top = r.y + n * step + codeShift;
      const lab = T(first.label), tile = T(first.tile), arrow = T(first.arrow);
      const dual = /dual\s+CTA/i.test(name);
      const text = name.replace(/\s*\(.*\)$/, '').trim();
      // Its room runs to the arrow: the board's labels don't all fill one width.
      const fit = boardFit(textOf(edits, `${id}/category/${n}`, text), 'section.pillName', lab, arrow.x - lab.x - 20);
      const kind = THUMB_WORDS.findIndex(w => w.test(text));
      const thumb = kind < 0 ? undefined : TOMORROW_ROWS[kind];
      const thumbTile = thumb && T(thumb.tile), thumbImage = thumb && T(thumb.image);
      const src = thumbImage ? asset(thumbImage)?.src : photoUrl(photoFor(pursuit, n).id);
      return <div key={name + n} style={{ position: 'absolute', left: r.x, top, width: r.w, height: r.h }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: shadowOf(T(TOMORROW_ROWS[n]?.row ?? first.row)) }}>
          <Media id={`${id}/category/${n}/mark`} src="/graphics/pill-wide.svg" alt="Row"
            title="Click to recolour, resize or swap the row shape from the library"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
        <div style={{ position: 'absolute', ...at(tile), width: tile.w, height: tile.h, borderRadius: tile.radius,
          background: tile.fill, overflow: 'hidden' }}>
          {src && <Media id={`${id}/category/${n}/thumb`} src={src} alt={text}
            // The tile's own fill (cropped to it), an image layer inside the
            // tile, or (no board shot) the body's photo covering the tile.
            style={!thumbImage ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
              : thumbImage === thumbTile ? imageRect(thumbImage) : { position: 'absolute',
              left: thumbImage!.x - thumbTile!.x, top: thumbImage!.y - thumbTile!.y,
              width: thumbImage!.w, height: thumbImage!.h, objectFit: 'cover' }} />}
        </div>
        <div style={{ ...anchorOf(lab), ...at(lab), alignItems: 'center', height: lab.h }}>
          <Editable id={`${id}/category/${n}`} fit={fit.contract} style={typeOf(lab, fit.fontSize)}>{text}</Editable>
        </div>
        {dual
          ? <div style={{ position: 'absolute', right: r.x + r.w - arrow.x - arrow.w, top: arrow.y - r.y, display: 'flex', gap: 18,
              ...type(28, 700), color: lab.fill }}>
              <Editable id={`${id}/category/${n}/men`}>Men →</Editable>
              <Editable id={`${id}/category/${n}/women`}>Women →</Editable>
            </div>
          : <svg style={{ position: 'absolute', ...at(arrow), width: arrow.w, height: arrow.h, overflow: 'visible' }}
              viewBox={`0 0 ${arrow.w} ${arrow.h}`} fill="none" stroke={lab.fill} strokeWidth={3} strokeLinecap="round">
              <path d={`M1.5 ${arrow.h / 2}H${arrow.w - 1.5}M${arrow.w - 21} 1.5L${arrow.w - 1.5} ${arrow.h / 2}L${arrow.w - 21} ${arrow.h - 1.5}`} />
            </svg>}
      </div>;
    })}

    <div style={{ ...anchorOf(button, 'CENTER') }}>
      <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
        padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center' }}>
        <Media id={`${id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
          title="Click to recolour, resize or swap the button shape from the library"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <Editable id={`${id}/cta`} fit={ctaFit.contract} style={{ ...typeOf(label, ctaFit.fontSize), position: 'relative' }}>{cta}</Editable>
      </div>
    </div>
  </FigmaFrame>;
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
  // The pill shows a real code only -- the same rule as the hero desktop's
  // code line: a brief that says no code is needed (or names none) has no pill.
  const code = doc.brief.noCode ? undefined : doc.brief.code?.trim() || undefined;
  const today = v.id === 'today';
  const ctaAt = today && heroDirection?.kind === 'hero'
    && /\b800\s*px\s*or\s*higher/i.test(heroDirection.design) ? 820
    : today ? 487 : 824;
  if (v.id === 'launch' || today) return <FlashEmailCompiled id={id} zone={s.photo} title={title} percent={percent}
    spec={today ? { ...TODAY, ...ctaAt === 820 ? { ctaTop: 820, codeTop: 650 } : null } : LAUNCH}
    upto={upto} urgency={urgency || 'LIMITED TIME'} cta={cta} code={code} brands={brands} />;
  return <FlashEmailTomorrow id={id} zone={s.photo} title={title} percent={percent}
    upto={upto} urgency={urgency || 'LIMITED TIME'} cta={cta || 'Shop All Sale'} code={code} brands={brands}
    categories={categoryNames} pursuit={s.pursuit} />;
}