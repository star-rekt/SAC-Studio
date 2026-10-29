/** Bump's full marketing email, per send: nav, the send's hero, body copy and
 *  Shop Now, an orange "Your Top Picks" heading, the four-product grid and
 *  See More, a second heading over the brand tiles (sends 1-2) or a second
 *  product grid (send 3), and the footer. Each send is its own body frame on
 *  SC26_0058 Wk33 Bump (585:23 / 583:4 / 585:25), compiled to
 *  src/data/figma/bump-body-<send>.json (npm run figma:pull).
 *
 *  Sections are found by the board's own structure -- its section frames in
 *  order and the layers' names inside them -- so the same code reads every
 *  send. Each section is a block of its board height with every layer at its
 *  board box, stacked in the board's order; the hero is the send's own
 *  compiled hero (./EmailSend.tsx), passed in. */
import type { ReactNode } from 'react';
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { useEdits, textOf, picOf } from '../../../edit/store';
import { boardFit } from '../../../model/textContracts';
import { stack } from '../../../fonts';
import { BrandMark } from '../BrandMark';
import { layerOf, anchorOf, typeOf, type FigmaLayer, type FigmaLayout } from '../../figma/layout';
import { Fill } from '../../figma/Fill';
import body1 from '../../../data/figma/bump-body-1.json';
import body2 from '../../../data/figma/bump-body-2.json';
import body3 from '../../../data/figma/bump-body-3.json';

const LAYOUTS = { 1: body1, 2: body2, 3: body3 } as unknown as Record<1 | 2 | 3, FigmaLayout>;
const W = 1200;
/** Each send's body copy, as its board writes it, with the brief's own code. */
const COPY = {
  1: (code: string) => `The squirrels are stockpiling and honestly, they're onto something. Hoard clothing, camp, ski and snowboard gear at an extra 20% off with code ${code}.`,
  2: (code: string) => `Your sandals had a great run. Retire them with honor and take an extra 20% off boots, layers and cool-ready gear with code ${code}.`,
  3: (code: string) => `This is the last lap, the final send, the closing bell. Code ${code} takes an extra 20% off The North Face, Patagonia, and more until midnight.`,
};
const NAV_LINKS = ['Men', 'Women', 'New Arrivals', 'Shop All'];
// Logos the library ships, to stand in when a brand has none of its own.
const BRAND_GRID = ['patagonia', 'mountain-hardwear', 'the-north-face', 'outdoor-research', 'smartwool', 'rab'];
const slug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

/** A board body read by structure: its top-level sections in order, and the
 *  layers inside one found by name. */
export function reader(layout: FigmaLayout) {
  const entries = Object.entries(layout.layers);
  const sections = entries.filter(([, l]) => l.parent === null).sort((a, b) => a[1].y - b[1].y);
  const within = (root: string) => entries.filter(([id]) => {
    for (let p = layout.layers[id].parent; p; p = layout.layers[p].parent) if (p === root) return true;
    return false;
  });
  return {
    /** Every top-level section, top to bottom. */
    all: sections.map(([id]) => id),
    /** The n-th top-level section with this name. */
    section: (name: string, n = 0) => sections.filter(([, l]) => l.name === name)[n]?.[0],
    /** Layers inside a section with this name (or of this type), top to bottom, left to right. */
    find: (root: string, test: (l: FigmaLayer) => boolean) => within(root).filter(([, l]) => test(l))
      .sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x).map(([id]) => id),
  };
}

/** A section: a block of its board height; children are placed in body px
 *  and shifted up by the section's own top. */
export function Section({ layout, id, frame, height, children }: { layout: FigmaLayout; id: string; frame: string;
  /** A section that grows with its content (more brand rows than the board's). */
  height?: number; children: ReactNode }) {
  const s = layerOf(layout, id);
  return <div data-frame={frame} style={{ position: 'relative', width: W, height: height ?? s.h, background: s.fill ?? '#fff', flex: 'none' }}>
    <div style={{ position: 'absolute', left: 0, top: -s.y, width: W, pointerEvents: 'none' }}>{children}</div>
  </div>;
}

/** A text run at its board box, the way the board aligns it. */
export const Run = ({ l, id, text, fit, style }: { l: FigmaLayer; id: string; text: string;
  fit?: ReturnType<typeof boardFit>; style?: React.CSSProperties }) =>
  <div style={anchorOf(l)}>
    <Editable id={id} fit={fit?.contract} style={{ ...typeOf(l, fit?.fontSize), ...style }}>{text}</Editable>
  </div>;

/** A dark pill button at its board box, its label centred, growing with a longer label. */
export function Button({ button, label, id, text, mark = '/graphics/pill.svg' }: { button: FigmaLayer; label: FigmaLayer;
  id: string; text: string; mark?: string }) {
  const { edits } = useEdits();
  const fit = boardFit(textOf(edits, id, text), 'body.cta', label);
  return <div style={{ ...anchorOf(button, 'CENTER'), alignItems: 'stretch' }}>
    <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
      padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center' }}>
      <Media id={`${id}/mark`} src={mark} fill={button.fill}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Editable id={id} fit={fit.contract} style={{ ...typeOf(label, fit.fontSize), position: 'relative' }}>{text}</Editable>
    </div>
  </div>;
}

/** An orange section heading: the board's band (with its texture), its title,
 *  and (where the board has one) the offer line over it. */
export function Heading({ layout, section, id, eyebrowId, title, eyebrow }: { layout: FigmaLayout; section: string;
  id: string; eyebrowId: string; title: string; eyebrow: string }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const band = R.find(section, l => l.name === 'Your Top Picks Header')[0];
  const [first, second] = R.find(section, l => l.type === 'TEXT');
  // Two runs: the offer line above the title; one: the title alone.
  const [eyebrowL, titleL] = second ? [L(first), L(second)] : [undefined, L(first)];
  const fit = boardFit(textOf(edits, id, title), 'body.sectionHeader', titleL, W - 128);
  return <>
    {band && <Fill layer={L(band)} layout={layout} style={{ left: L(band).x, top: L(band).y, width: L(band).w, height: L(band).h }} />}
    {eyebrowL && <Run l={{ ...eyebrowL, x: 0, w: W }} id={eyebrowId} text={eyebrow}
      fit={boardFit(textOf(edits, eyebrowId, eyebrow), 'body.sectionEyebrow', eyebrowL, W - 128)} />}
    <Run l={{ ...titleL, x: 0, w: W }} id={id} text={title} fit={fit} />
  </>;
}

/** The four-product grid: the board's cards, the board's product shots (faded
 *  placeholders until a designer swaps them), each line at its board box. */
export function Products({ layout, section, id }: { layout: FigmaLayout; section: string; id: string }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const cards = R.find(section, l => /^Product Listing \d/.test(l.name));
  return <>{cards.map((card, n) => {
    const image = R.find(card, l => l.name === 'Product Image')[0];
    const line = (name: string) => L(R.find(card, l => l.name === name)[0]);
    const src = L(image).images?.[0] && layout.assets?.[L(image).images![0].ref]?.src;
    const label = (name: string, key: string, text: string, style?: React.CSSProperties) => {
      const editId = `${id}/product/${n}/${key}`;
      return <Run l={line(name)} id={editId} text={textOf(edits, editId, text)}
        fit={boardFit(textOf(edits, editId, text), `body.product.${key}`, line(name))} style={style} />;
    };
    return <div key={card}>
      <Media id={`${id}/product/${n}`} src={src ?? '/reference/badge-jacket-blue.png'} alt="Product"
        style={{ position: 'absolute', left: L(image).x, top: L(image).y, width: L(image).w, height: L(image).h,
          objectFit: 'cover', opacity: L(image).opacity }} />
      {label('Brand Name', 'brand', 'Brand Name')}
      {label('Product Name', 'name', 'Product Name')}
      {/* The board sets the price in Tiempos Headline, which isn't in the
          studio's type kit: the price keeps the board's size in Quiet Sans. */}
      {label('Price', 'price', '$Sale Price', { fontFamily: stack('Quiet Sans'), fontWeight: 700 })}
      {label('Shop Now', 'shop', 'Shop Now', { textDecoration: 'underline' })}
    </div>;
  })}</>;
}

/** The brand tiles: the brief's brands (or the board's six), two to a row at
 *  the board's spacing, each on the board's dark textured tile, the logo in
 *  the board's own box for that brand or centred in the tile. A tile hidden
 *  from the panel drops out of the preview/export; in edit mode it stays so
 *  it can be restored. */
export function BrandTiles({ asset, layout, section }: { asset: SheetAsset; layout: FigmaLayout; section: string }) {
  // The section grows (or shrinks) by the board's row step for each row more
  // (or fewer) than the board's three -- a fixed board height cut off a
  // fourth row when a brief named more than six brands.
  const { edits, mode } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  const tiles = R.find(section, l => l.type === 'FRAME' && l.w === l.h && l.w > 400);
  const first = L(tiles[0]), right = L(tiles[1]), step = L(tiles[2]).y - first.y;
  const texture = R.find(tiles[0], l => l.name === 'Vector 747')[0];
  const boardLogos = tiles.map(t => R.find(t, l => l.type === 'INSTANCE')[0]).filter(Boolean).map(L);
  // With no brands in the brief, the board's own (send 2 has Columbia where send 1 has Smartwool).
  const brands = asset.media.brands?.length ? asset.media.brands : boardLogos.map(l => slug(l.name));
  const shown = brands.map((brand, n) => ({ brand, n }))
    .filter(({ n }) => mode === 'edit' || !picOf(edits, `${asset.id}/brand/${n}`).hidden);
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z]/g, '');
  const rows = Math.max(1, Math.ceil(shown.length / 2)), boardRows = Math.ceil(tiles.length / 2);
  return <Section layout={layout} id={section} frame="bump-body-brands"
    height={layerOf(layout, section).h + (rows - boardRows) * step}>{shown.map(({ brand, n }, i) => {
    const at = i % 2 ? right : first, top = first.y + Math.floor(i / 2) * step;
    const own = boardLogos.find(l => norm(l.name) === norm(brand.replace(/-/g, ' ')));
    // The board's own box for this brand, moved to this tile; else centred.
    const logo = own
      ? { left: own.x - (own.x > right.x ? right.x : first.x), top: own.y - L(tiles[boardLogos.indexOf(own)]).y, width: own.w, height: own.h }
      : { left: at.w * 0.15, top: at.h * 0.3, width: at.w * 0.7, height: at.h * 0.4 };
    return <div key={`${brand}-${n}`} style={{ position: 'absolute', left: at.x, top, width: at.w, height: at.h,
      borderRadius: at.radius, overflow: 'hidden', background: texture ? L(texture).fill : '#333' }}>
      {texture && <Fill layer={{ ...L(texture), radius: undefined }} layout={layout} style={{ inset: 0 }} />}
      <BrandMark id={`${asset.id}/brand/${n}`} name={brand}
        fallback={`/logos/brand-${BRAND_GRID.includes(slug(brand)) ? slug(brand) : BRAND_GRID[n % BRAND_GRID.length]}.svg`}
        style={{ position: 'absolute', ...logo, objectFit: 'contain' }} />
    </div>;
  })}</Section>;
}

/** The nav bar: the logo and the four links, at their board boxes. */
export function Nav({ layout, section, id }: { layout: FigmaLayout; section: string; id: string }) {
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  return <Section layout={layout} id={section} frame="bump-body-nav">
    <Ground id={`${id}/header`} style={{ position: 'absolute', left: 0, top: L(section).y, width: W, height: L(section).h }} />
    {R.find(section, l => l.type === 'TEXT').map((link, n) =>
      <div key={link} style={anchorOf(L(link))}>
        <span style={typeOf(L(link))}>{NAV_LINKS[n]}</span>
      </div>)}
    <Media id={`${id}/header/logo`} src="/logos/sac-logo-light.svg" alt="Steep & Cheap, powered by Backcountry"
      style={{ position: 'absolute', ...boxStyle(L(R.find(section, l => l.name === 'Logo')[0])), objectFit: 'contain' }} />
  </Section>;
}

/** The footer: logo, social icons, links, address and copyright. */
export function Footer({ layout, section, id }: { layout: FigmaLayout; section: string; id: string }) {
  const { edits } = useEdits();
  const R = reader(layout), L = (l: string) => layerOf(layout, l);
  return <Section layout={layout} id={section} frame="bump-body-footer">
    {(() => { const F = (name: string) => L(R.find(section, l => l.name === name)[0]); return <>
      <Media id={`${id}/footer/logo`} src="/logos/sac-logo-light.svg" alt="Steep & Cheap, powered by Backcountry"
        style={{ position: 'absolute', ...boxStyle(F('Logo')), objectFit: 'contain' }} />
      <Media id={`${id}/footer/facebook`} src="/logos/social-facebook.png" alt="Facebook"
        style={{ position: 'absolute', ...boxStyle(F('Facebook Logo')) }} />
      <Media id={`${id}/footer/instagram`} src="/logos/social-instagram.png" alt="Instagram"
        style={{ position: 'absolute', ...boxStyle(F('Instagram Logo')) }} />
      {([['Unsubscribe', 'unsubscribe', 'Unsubscribe', true], ['Talk to a Gearhead', 'contact', 'Talk to a Gearhead', true],
        ['Physical Address', 'address', '2607 South 3200 West, Suite A, Salt Lake City, UT', false],
        ['Copyright', 'copyright', '© 2026 SteepAndCheap.com. All rights reserved', false]] as const)
        .map(([layer, key, text, link]) => {
          const editId = `${id}/footer/${key}`;
          return <Run key={key} l={F(layer)} id={editId} text={text} style={link ? { textDecoration: 'underline' } : undefined}
            fit={boardFit(textOf(edits, editId, text), `body.footer.${key}`, F(layer))} />;
        })}
    </>; })()}
  </Section>;
}

export function BumpEmailBody({ asset, hero, send }: { asset: SheetAsset; hero?: ReactNode; send: 1 | 2 | 3 }) {
  const { edits } = useEdits();
  const layout = LAYOUTS[send], R = reader(layout), L = (l: string) => layerOf(layout, l);
  const id = asset.id;
  const nav = R.section('HEADER'), body = R.section('SAC Email Body'), footer = R.section('Footer');
  const heads = [R.section('SAC Email Header', 0), R.section('SAC Email Header', 1)];
  const grids = [R.section('SAC Bluecore SKUs', 0), R.section('SAC Bluecore SKUs', 1)];
  const ctas = [R.section('SAC Email CTA', 0), R.section('SAC Email CTA', 1)];
  const tiles = R.section('Frame 4752');
  const text = (section: string) => L(R.find(section, l => l.type === 'TEXT')[0]);
  const eyebrow = `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`.toUpperCase();
  // The heading's title is its last run (an offer line, where there is one, sits above it).
  const secondTitle = L(R.find(heads[1], l => l.type === 'TEXT').at(-1)!).text!.chars;
  const copy = COPY[send](asset.copy.code || 'AUTUMN20');
  const seeMore = (n: 0 | 1) => {
    const button = R.find(ctas[n], l => l.name === 'Button')[0];
    return <Section layout={layout} id={ctas[n]} frame={`bump-body-cta-${n}`}>
      <Button button={L(button)} label={L(R.find(button, l => l.type === 'TEXT')[0])}
        id={`${id}/${n ? 'see-more-2' : 'see-more'}`} text="See More" />
    </Section>;
  };

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: W, position: 'relative', background: '#fff' }}>
    <Nav layout={layout} section={nav} id={id} />

    {hero}

    <Section layout={layout} id={body} frame="bump-body-copy">
      {(() => { const t = text(body); return <div style={{ ...anchorOf(t), height: undefined }}>
        <Editable id={`${id}/body`} style={{ ...typeOf(t), whiteSpace: 'normal', width: t.w }}>{textOf(edits, `${id}/body`, copy)}</Editable>
      </div>; })()}
      {/* The board's dark Shop Now button and its label (the section's second run). */}
      <Button button={L(R.find(body, l => l.type === 'FRAME' && l.fill === '#333333')[0])}
        label={L(R.find(body, l => l.type === 'TEXT')[1])} id={`${id}/body-cta`} text="Shop Now" />
    </Section>

    <Section layout={layout} id={heads[0]} frame="bump-body-heading-0">
      <Heading layout={layout} section={heads[0]} id={`${id}/header1`} eyebrowId={`${id}/header1/eyebrow`}
        title={textOf(edits, `${id}/header1`, 'Your Top Picks')} eyebrow={eyebrow} />
    </Section>
    <Section layout={layout} id={grids[0]} frame="bump-body-products-0"><Products layout={layout} section={grids[0]} id={id} /></Section>
    {seeMore(0)}

    <Section layout={layout} id={heads[1]} frame="bump-body-heading-1">
      <Heading layout={layout} section={heads[1]} id={`${id}/header2`} eyebrowId={`${id}/header2/eyebrow`}
        title={textOf(edits, `${id}/header2`, secondTitle)} eyebrow={eyebrow} />
    </Section>
    {tiles
      ? <BrandTiles asset={asset} layout={layout} section={tiles} />
      : <>
        <Section layout={layout} id={grids[1]} frame="bump-body-products-1"><Products layout={layout} section={grids[1]} id={`${id}/s2`} /></Section>
        {seeMore(1)}
      </>}

    <Footer layout={layout} section={footer} id={id} />
  </Ground>;
}

export const boxStyle = (l: FigmaLayer) => ({ left: l.x, top: l.y, width: l.w, height: l.h });
