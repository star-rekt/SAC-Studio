/** Bump 2's full email, the board's five designs: the inbox lines (sender,
 *  subject, preview), nav, the design's own hero, green section headings,
 *  product grids, See More / Shop All, the category banners or the brand
 *  tiles, and the footer. Each design is one frame on the Bump 2 board
 *  (page 538:15528) -- 583:3, 585:11, 585:12, 585:13, 585:14 -- compiled to
 *  src/data/figma/bump2-body-<design>.json (npm run figma:pull).
 *
 *  Sections are read by the board's own structure, in its order, the way
 *  Bump's body reads its sends (../bump/EmailBody.tsx, whose nav, headings,
 *  product grid, brand tiles and footer this shares). The heroes differ per
 *  design but are made of the same parts -- a paper ground, a photo window or
 *  framed photo with its green outline, the eyebrow, EXTRA / 20% OFF, the
 *  code line, Shop Now, a brand row and the body copy -- found by name. */
import { assetId, type SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { Fragment } from 'react';
import { useEdits, textOf, type Edits } from '../../../edit/store';
import { sectionOf } from '../../emailSections';
import { boardFit } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';
import { layerOf, boxOf, anchorOf, typeOf, cropOf, placeIn, brandSlot, type FigmaLayer, type FigmaLayout } from '../../figma/layout';
import { Fill } from '../../figma/Fill';
import { reader, Section, Run, Button, Heading, Products, BrandTiles, Nav, Footer } from '../bump/EmailBody';
import body1 from '../../../data/figma/bump2-body-1.json';
import body2 from '../../../data/figma/bump2-body-2.json';
import body3 from '../../../data/figma/bump2-body-3.json';
import body4 from '../../../data/figma/bump2-body-4.json';
import body5 from '../../../data/figma/bump2-body-5.json';

export type Design = 1 | 2 | 3 | 4 | 5;
const LAYOUTS = { 1: body1, 2: body2, 3: body3, 4: body4, 5: body5 } as unknown as Record<Design, FigmaLayout>;
/** Each design's hero outline, a library mark drawn from its board stroke
 *  (scripts/figma-marks.ts). Design 5's nest of lines is a Figma effect on
 *  its outline, drawn from Figma's render of it instead. */
const OUTLINES: Partial<Record<Design, string>> = { 1: 'bump2-email-1-window', 2: 'bump2-email-2-window',
  3: 'bump2-email-3-window', 4: 'bump2-email-4-window' };
const W = 1200;
/** The code the board's copy is written with; the brief's replaces it. */
const BOARD_CODE = 'CHILLY20';
const BOARD_BRANDS = ['The North Face', 'Patagonia', 'Mountain Hardwear'];
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];
const SOFT = '/graphics/pill-soft.svg';

const visible = (l: FigmaLayer) => l.visible !== false;
/** A photograph, not a paper texture: an image fill that isn't tiled. */
const isPhoto = (l: FigmaLayer) => visible(l) && l.name !== 'Texture' && !!l.images?.length && l.images[0].mode !== 'TILE';

/** The inbox lines above the email: each label and its value (sender,
 *  subject, preview), the subject and preview from the brief where it has them.
 *  The board sets the subject and preview in Inter, which the studio doesn't
 *  carry: they're set in Quiet Sans at the board's size. */
function Inbox({ asset, layout, section }: { asset: SheetAsset; layout: FigmaLayout; section: string }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const quiet = (l: FigmaLayer) => ({ ...l, text: { ...l.text!, family: 'Quiet Sans' } });
  const [senderL, sender, subjectL, subject, previewL, preview] = R.find(section, l => l.type === 'TEXT').map(L)
    .map(l => l.text!.family === 'Inter' ? quiet(l) : l);
  const code = asset.copy.code;
  const board = (l: FigmaLayer) => code ? l.text!.chars.replaceAll(BOARD_CODE, code) : l.text!.chars;
  const label = (l: FigmaLayer) => <div style={anchorOf(l)}><span style={typeOf(l)}>{l.text!.chars}</span></div>;
  const value = (l: FigmaLayer, key: string, text: string) => {
    const editId = `${asset.id}/inbox/${key}`, live = textOf(edits, editId, text);
    // A fixed-width line (the preview) wraps in its box, as the board's does.
    return l.text!.resize === 'WIDTH_AND_HEIGHT'
      ? <Run l={l} id={editId} text={live} fit={boardFit(live, `body.inbox.${key}`, l)} />
      : <div style={{ ...anchorOf(l), height: undefined }}>
        <Editable id={editId} style={{ ...typeOf(l), whiteSpace: 'normal', width: l.w }}>{live}</Editable>
      </div>;
  };
  return <Section layout={layout} id={section} frame="bump2-body-inbox">
    {label(senderL)}{value(sender, 'sender', sender.text!.chars)}
    {label(subjectL)}{value(subject, 'subject', asset.copy.subject || board(subject))}
    {label(previewL)}{value(preview, 'preview', asset.copy.preview || board(preview))}
  </Section>;
}

/** A text the board writes with a coloured, bolder run (the code word): the
 *  part before it, the run, and the part after, each its own field --
 *  Editable is plain-string-only. `text` is split at `word`; with no `word`
 *  in it, it is one field. */
function Highlighted({ l, id, text, word, fontSize }: { l: FigmaLayer; id: string; text: string; word: string;
  fontSize?: number }) {
  const { edits } = useEdits();
  const run = l.text!.runs?.find(r => r.style.fill && r.style.fill !== l.fill)?.style;
  const at = word ? text.indexOf(word) : -1;
  const parts = at < 0 ? [text] : [text.slice(0, at), word, text.slice(at + word.length)];
  const keys = ['', '/code', '/after'];
  return <>{parts.map((part, n) => <Editable key={n} as="span" id={`${id}${keys[n]}`}
    style={n === 1 && run ? { fontWeight: run.fontWeight as number, color: run.fill as string } : undefined}>
    {textOf(edits, `${id}${keys[n]}`, part)}</Editable>)}</>;
}

/** The hero, whichever of the board's five it is: found by its layers' names
 *  and kinds, each at its board box. */
function Hero({ asset, layout, section, design }: { asset: SheetAsset; layout: FigmaLayout; section: string; design: Design }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const id = asset.id, sec = L(section);
  const all = R.find(section, () => true).map(k => [k, L(k)] as const).filter(([, l]) => visible(l));
  const texts = all.filter(([, l]) => l.type === 'TEXT');
  const named = (name: string) => texts.filter(([, l]) => l.name === name).map(([, l]) => l);
  const code = asset.copy.code || '';

  // The ground: the section's own paper, or its Texture layer, kept to the section.
  const texture = all.find(([, l]) => l.name === 'Texture')?.[1];
  const ground = (l: FigmaLayer) => {
    const top = Math.max(l.y, sec.y), bottom = Math.min(l.y + l.h, sec.y + sec.h);
    return <Fill layer={{ ...l, radius: undefined }} layout={layout}
      style={{ left: l.x, top, width: l.w, height: bottom - top, backgroundPosition: 'center' }} />;
  };

  // The photo: a stepped window (clipped to its outline) or a framed photo.
  const photo = all.find(([, l]) => isPhoto(l))?.[1];
  const img = photo?.images?.[0] && layout.assets?.[photo.images[0].ref];
  const crop = photo && img && photo.crop ? cropOf(photo.crop, [photo.w, photo.h], [img.w, img.h]) : undefined;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  // A paper cut-out over the photo (design 4): the texture, clipped to its shape.
  const cutout = all.find(([, l]) => l.type === 'VECTOR' && l.path && !isPhoto(l) && !!l.images?.length)?.[1];
  // The green outline: round the window, the cut-out, or on its own (design 5).
  const outline = all.find(([, l]) => l.type === 'VECTOR' && l.stroke)?.[1];
  // How far a stroke reaches past its shape's box.
  const reach = (l: FigmaLayer) => l.stroke!.align === 'CENTER' ? l.stroke!.weight / 2
    : l.stroke!.align === 'OUTSIDE' ? l.stroke!.weight : 0;

  // The copy.
  const [eyebrow, eyebrow2] = named('Eyebrow').sort((a, b) => a.y - b.y);
  const head = named('Headline')[0], sub = named('Subhead')[0];
  const lineH = head.text!.lineHeight;
  // The eyebrow is the send's urgency (its phase, or the campaign's
  // duration) -- a short word, as the slot is drawn for; the offer already
  // stands beside it. Where a design has a second eyebrow under the code
  // (design 5's ENDS TODAY) that says the same, the first keeps the board's.
  const phase = asset.copy.urgency && asset.copy.urgency !== eyebrow2?.text!.chars ? asset.copy.urgency : undefined;
  const urgency = textOf(edits, `${id}/urgency`, phase || eyebrow.text!.chars);
  const lead = textOf(edits, `${id}/lead`, asset.copy.lead || 'EXTRA');
  const offer = textOf(edits, `${id}/offer`, asset.copy.offer || '20% OFF');
  const fits = { urgency: boardFit(urgency, 'hero.urgency', eyebrow), lead: boardFit(lead, 'hero.title', head),
    offer: boardFit(offer, 'hero.offer', head) };
  const codeLabel = code ? textOf(edits, `${id}/code/label`, 'CODE ') : undefined;
  const codeWord = code ? textOf(edits, `${id}/code/value`, code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || `CODE ${BOARD_CODE}`);
  const codeFit = boardFit(`${codeLabel ?? ''}${codeWord}`, 'hero.code', sub);
  const codeRun = sub.text!.runs?.find(r => r.style.fill && r.style.fill !== sub.fill)?.style;
  // Shop Now: the run on a dark button; the first under the headline, the second under the body copy.
  const buttons = texts.filter(([, l]) => l.name === 'Shop Now').map(([k, l]) => ({ label: l, button: L(L(k).parent!) }))
    .sort((a, b) => a.button.y - b.button.y);
  // The body copy: the paragraph run (fixed width, wrapping).
  const copy = texts.find(([, l]) => l.text!.resize === 'HEIGHT' && l.text!.size >= 50 && l.name !== 'Subhead')?.[1];
  // The board's own paragraph with the brief's code, unless the brief writes this send's body copy.
  const copyText = asset.copy.bodyStated && asset.copy.body ? asset.copy.body
    : code ? copy?.text!.chars.replaceAll(BOARD_CODE, code) : copy?.text!.chars;
  // The brand row: the board's logos left to right, then "& More".
  const row = all.find(([, l]) => l.name === 'Group 3403')?.[0];
  const logos = row ? R.find(row, l => l.parent === row && l.name !== '& More').map(L).sort((a, b) => a.x - b.x) : [];
  const more = row ? L(R.find(row, l => l.name === '& More')[0]) : undefined;
  const brands = asset.media.brands?.length ? asset.media.brands : PLACEHOLDER_BRANDS;

  return <Section layout={layout} id={section} frame="bump2-body-hero">
    {sec.images?.length ? ground(sec) : null}
    {texture && ground(texture)}
    {/* Designs 1-3's windows are slots; design 4's framed photo under its
        paper cut-out keeps the standard placement (design 5 has no photo). */}
    {photo && <Picture id={`${id}/photo`} zone={zone} initialSrc={img?.src} slot={design <= 3}
      focus={crop?.focus} initialScale={crop?.initialScale} initialRotate={crop?.rotate}
      style={{ ...boxOf(photo), overflow: 'hidden', borderRadius: photo.radius,
        clipPath: photo.path ? `path("${photo.path}")` : undefined }} />}
    {/* A framed photo's own border (design 4). */}
    {photo?.stroke && !photo.path && <div style={{ position: 'absolute', left: photo.x - reach(photo),
      top: photo.y - reach(photo), width: photo.w + 2 * reach(photo), height: photo.h + 2 * reach(photo),
      boxSizing: 'border-box', border: `${photo.stroke.weight}px solid ${photo.stroke.color}`,
      borderRadius: (photo.radius ?? 0) + reach(photo), pointerEvents: 'none' }} />}
    {cutout && <Fill layer={{ ...cutout, radius: undefined }} layout={layout}
      style={{ ...boxOf(cutout), clipPath: `path("${cutout.path}")` }} />}
    {outline?.render && layout.assets?.[outline.render.ref]
      ? <Media id={`${id}/window/mark`} src={layout.assets[outline.render.ref].src} alt="Line pattern"
        style={{ position: 'absolute', left: outline.render.x, top: outline.render.y, width: outline.render.w,
          height: outline.render.h, mixBlendMode: outline.blend?.toLowerCase().replace(/_/g, '-') as React.CSSProperties['mixBlendMode'],
          pointerEvents: 'none' }} />
      : outline && OUTLINES[design] && <Media id={`${id}/window/mark`} src={`/graphics/${OUTLINES[design]}.svg`}
        alt="Window outline" title="Click to recolour the outline"
        style={{ position: 'absolute', left: outline.x - reach(outline), top: outline.y - reach(outline),
          width: outline.w + 2 * reach(outline), height: outline.h + 2 * reach(outline), pointerEvents: 'none' }} />}

    <div style={anchorOf(eyebrow)}>
      <Editable id={`${id}/urgency`} fit={fits.urgency.contract} style={typeOf(eyebrow, fits.urgency.fontSize)}>{urgency}</Editable>
    </div>
    {eyebrow2 && <Run l={eyebrow2} id={`${id}/urgency-2`} text={textOf(edits, `${id}/urgency-2`, eyebrow2.text!.chars)}
      fit={boardFit(textOf(edits, `${id}/urgency-2`, eyebrow2.text!.chars), 'hero.urgency', eyebrow2)} />}
    {/* EXTRA / 20% OFF: the board's one run of two lines, a field per line. */}
    <div style={anchorOf(head)}>
      <Editable id={`${id}/lead`} fit={fits.lead.contract} style={typeOf(head, fits.lead.fontSize)}>{lead}</Editable>
    </div>
    <div style={{ ...anchorOf(head), top: head.y + lineH }}>
      <Editable id={`${id}/offer`} fit={fits.offer.contract} style={typeOf(head, fits.offer.fontSize)}>{offer}</Editable>
    </div>
    <div style={anchorOf(sub)}>
      <div style={{ ...typeOf(sub, codeFit.fontSize), pointerEvents: 'none' }}>
        {codeLabel !== undefined ? <>
          <Editable as="span" id={`${id}/code/label`} fit={codeFit.contract}>{codeLabel}</Editable>
          <Editable as="span" id={`${id}/code/value`} fit={codeFit.contract}
            style={{ fontWeight: (codeRun?.fontWeight as number) ?? 700, color: codeRun?.fill as string }}>{codeWord}</Editable>
        </> : <Editable as="span" id={`${id}/code`} fit={codeFit.contract}>{codeWord}</Editable>}
      </div>
    </div>
    {buttons.map((b, n) => <Button key={n} button={b.button} label={b.label} mark={SOFT}
      id={n ? `${id}/body-cta` : `${id}/cta`} text={asset.copy.cta || 'Shop Now'} />)}

    {logos.length > 0 && <>
      {brands.slice(0, logos.length).map((brand, n) => {
        const slot = brandSlot([...logos, ...(more ? [more] : [])], n, brand, BOARD_BRANDS);
        return <BrandMark key={`${brand}-${n}`} id={`${id}/hero/brand/${n}`} name={brand}
          fallback={`/logos/brand-${PLACEHOLDER_BRANDS[n % PLACEHOLDER_BRANDS.length]}.svg`}
          style={{ position: 'absolute', left: slot.x, top: slot.y, width: slot.w, height: slot.h, objectFit: 'contain',
            filter: 'brightness(0.2)' }} />;
      })}
      {more && <Run l={more} id={`${id}/hero/more`} text={textOf(edits, `${id}/hero/more`, '& More')}
        fit={boardFit(textOf(edits, `${id}/hero/more`, '& More'), 'hero.more', more)} />}
    </>}

    {copy && copyText && <div style={{ ...anchorOf(copy), height: undefined }}>
      <div style={{ ...typeOf(copy), whiteSpace: 'normal', width: copy.w, pointerEvents: 'none' }}>
        <Highlighted l={copy} id={`${id}/body`} text={copyText} word={code} />
      </div>
    </div>}
  </Section>;
}

/** The category banners: each the board's photo (swappable), the tilted
 *  offer tag in its corner, the category's name and the brush arrow. */
function Categories({ asset, layout, section }: { asset: SheetAsset; layout: FigmaLayout; section: string }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const id = asset.id;
  const rows = R.find(section, l => l.type === 'FRAME' && !!l.images?.length).map(k => [k, L(k)] as const);
  const tagText = `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`.toUpperCase();
  return <Section layout={layout} id={section} frame="bump2-body-categories">{rows.map(([k, row], n) => {
    const name = L(R.find(k, l => l.type === 'TEXT' && l.parent === k)[0]);
    const tag = L(R.find(k, l => l.type === 'GROUP' && !!l.turn)[0]);
    const tagRect = L(R.find(k, l => l.type === 'RECTANGLE')[0]);
    const tagRun = L(R.find(k, l => l.type === 'TEXT' && l.parent !== k)[0]);
    // The arrow: its two brush strokes, which reach half their weight past its box.
    const arrowId = R.find(k, l => l.type === 'GROUP' && !l.turn)[0], arrow = L(arrowId);
    const arrowPad = Math.max(...R.find(arrowId, l => !!l.stroke).map(a => L(a).stroke!.weight)) / 2;
    const img = row.images?.[0] && layout.assets?.[row.images[0].ref];
    const crop = img && row.crop ? cropOf(row.crop, [row.w, row.h], [img.w, img.h]) : undefined;
    const label = textOf(edits, `${id}/category/${n}`, name.text!.chars.trim().toUpperCase());
    const fit = boardFit(label, 'body.category', name, arrow.x - name.x - 20);
    const tagLabel = textOf(edits, `${id}/category/${n}/tag`, tagText);
    const tagFit = boardFit(tagLabel, 'body.categoryTag', tagRun);
    // Children in body px, shifted into the banner, which clips the tag's overhang.
    const at = (l: FigmaLayer) => ({ left: l.x - row.x, top: l.y - row.y });
    return <div key={k} style={{ position: 'absolute', left: row.x, top: row.y, width: row.w, height: row.h,
      borderRadius: row.radius, overflow: 'hidden', background: row.fill }}>
      <Picture id={`${id}/category/${n}/image`} zone={photoFor('hike', n + 1)} initialSrc={img?.src} slot
        focus={crop?.focus} initialScale={crop?.initialScale} initialRotate={crop?.rotate}
        style={{ position: 'absolute', inset: 0 }} />
      {row.shade && <div style={{ position: 'absolute', inset: 0, background: row.shade, pointerEvents: 'none' }} />}
      <div style={{ ...placeIn(tag, null), left: (placeIn(tag, null).left as number) - row.x,
        top: (placeIn(tag, null).top as number) - row.y, pointerEvents: 'none' }}>
        <div style={{ ...placeIn(tagRect, tag), background: tagRect.fill }} />
        <div style={{ ...placeIn(tagRun, tag), display: 'flex', alignItems: 'center' }}>
          <Editable id={`${id}/category/${n}/tag`} fit={tagFit.contract} style={typeOf(tagRun, tagFit.fontSize)}>{tagLabel}</Editable>
        </div>
      </div>
      <div style={{ ...anchorOf(name), ...at(name) }}>
        <Editable id={`${id}/category/${n}`} fit={fit.contract} style={typeOf(name, fit.fontSize)}>{label}</Editable>
      </div>
      <Media id={`${id}/category/${n}/arrow`} src="/graphics/bump2-arrow.svg" alt="Arrow" fill={tagRun.fill}
        style={{ position: 'absolute', left: arrow.x - row.x - arrowPad, top: arrow.y - row.y - arrowPad,
          width: arrow.w + 2 * arrowPad, height: arrow.h + 2 * arrowPad }} />
    </div>;
  })}</Section>;
}

/** A send's hero keyed as its standalone "email-hero" asset is, whether drawn
 *  on its own or inside the body -- one set of edits for the two (as Bump's). */
const heroOf = (asset: SheetAsset): SheetAsset => asset.scope.send
  ? { ...asset, id: assetId('email-hero', asset.scope, asset.variant), format: 'email-hero' } : asset;

/** The design's hero on its own: a send's "email-hero" asset. */
export function Bump2EmailHero({ asset, design }: { asset: SheetAsset; design: Design }) {
  const layout = LAYOUTS[design], R = reader(layout);
  const section = R.all.find(s => ['SAC_Paid_1x1', 'Email Hero'].includes(layerOf(layout, s).name))!;
  const hero = heroOf(asset);
  return <Ground id={`${hero.id}/fill`} className="sheet" style={{ width: W, position: 'relative', background: '#fff' }}>
    <Hero asset={hero} layout={layout} section={section} design={design} />
  </Ground>;
}

/** Behaviour decided here, besides the shared sections' own:
 *  - The board's sections in the board's order; a design is its frame.
 *  - The brief's code replaces the board's (CHILLY20) in every line that
 *    quotes it, drawn in the board's green bold run.
 *  - Every single-line run's contract is its board layer's (boardFit); the
 *    paragraphs (preview, body copy) wrap in their board width.
 *  - Brands fill the hero row's slots and the brand tiles from the brief.
 *  - The hero's eyebrow is the send's urgency; its paragraph the board's,
 *    unless the brief writes that send's body copy.
 *  - The hero windows (designs 1-3) and the banner photos are slots: smart
 *    placement frames each within its own visible shape. */
export function Bump2EmailBody({ asset, design }: { asset: SheetAsset; design: Design }) {
  const { edits } = useEdits();
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width: W, position: 'relative', background: '#fff' }}>
    {blocksOf(asset, design, edits)}
  </Ground>;
}

/** An email built of sections (its `parts`), each the blocks it names
 *  (render/emailSections.ts) from its own design. A part keyed apart (from
 *  another design, or a second copy) has ids of its own. */
export function Bump2EmailSections({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width: W, position: 'relative', background: '#fff' }}>
    {asset.parts!.map((p, n) => {
      if (p.off) return null;
      const section = sectionOf('sc26_bump2', p), design = Number(p.design.replace('design-', '')) as Design;
      if (!section || !LAYOUTS[design]) return null;
      const blocks = blocksOf(p.key ? { ...asset, id: `${asset.id}~${p.key}` } : asset, design, edits);
      // data-part: where the section starts, for the Sections list to scroll to.
      return <Fragment key={p.key || `${p.design}.${p.section}`}><div data-part={n} />{section.blocks.map(i => blocks[i])}</Fragment>;
    })}
  </Ground>;
}

/** Every block of a design, drawn, in the board's order: its ids numbered as
 *  the whole email numbers them, so a section keeps its edits wherever it is. */
function blocksOf(asset: SheetAsset, design: Design, edits: Edits) {
  const layout = LAYOUTS[design], R = reader(layout), L = (l: string) => layerOf(layout, l);
  const id = asset.id;
  let heading = 0, grid = 0, cta = 0;
  return R.all.map(section => {
      const name = L(section).name;
      if (name === 'SL/PH') return <Inbox key={section} asset={asset} layout={layout} section={section} />;
      if (name === 'HEADER') return <Nav key={section} layout={layout} section={section} id={id} />;
      if (name === 'Footer') return <Footer key={section} layout={layout} section={section} id={id} />;
      if (name === 'SAC_Paid_1x1' || name === 'Email Hero')
        return <Hero key={section} asset={heroOf(asset)} layout={layout} section={section} design={design} />;
      if (name === 'SAC Email Header') {
        const n = ++heading, title = L(R.find(section, l => l.type === 'TEXT')[0]).text!.chars;
        return <Section key={section} layout={layout} id={section} frame={`bump2-body-heading-${n}`}>
          <Heading layout={layout} section={section} id={`${id}/header${n}`} eyebrowId={`${id}/header${n}/eyebrow`}
            title={textOf(edits, `${id}/header${n}`, title)} eyebrow="" />
        </Section>;
      }
      if (name === 'SAC Bluecore SKUs') {
        const n = grid++;
        return <Section key={section} layout={layout} id={section} frame={`bump2-body-products-${n}`}>
          <Products layout={layout} section={section} id={n ? `${id}/s${n + 1}` : id} />
        </Section>;
      }
      if (name === 'SAC Email CTA') {
        const n = cta++, button = R.find(section, l => l.name === 'Button')[0];
        const label = L(R.find(button, l => l.type === 'TEXT')[0]);
        return <Section key={section} layout={layout} id={section} frame={`bump2-body-cta-${n}`}>
          <Button button={L(button)} label={label} mark={SOFT} id={`${id}/${n ? `see-more-${n + 1}` : 'see-more'}`}
            text={label.text!.chars} />
        </Section>;
      }
      // The two other blocks: the brand tiles (their textured squares) or the category banners.
      return R.find(section, l => l.name === 'Vector 747').length
        ? <BrandTiles key={section} asset={asset} layout={layout} section={section} />
        : <Categories key={section} asset={asset} layout={layout} section={section} />;
    });
}
