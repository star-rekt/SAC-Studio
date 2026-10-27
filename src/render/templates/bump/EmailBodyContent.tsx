/** Shared content for every Bump "email body" send -- everything below the
 *  hero: body copy + Shop Now, a "Your Top Picks" product grid, a See More
 *  CTA, a second section header + brand grid, and the footer. Confirmed via
 *  Figma metadata that this whole stack is near-identical in proportions
 *  across sends 1/2/3 -- only the hero, the body copy, and the second
 *  section header's title genuinely differ per send, so those three are
 *  the only things each `EmailBodyN.tsx` passes in. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { stack } from '../../../fonts';
import { useEdits, textOf, picOf } from '../../../edit/store';
import { BrandMark } from '../BrandMark';
import { BumpEmailBodyHeader } from './EmailBodyHeader';
import { fitText } from '../../../model/textContracts';

const ink = '#333333';

function SectionHeader({ title }: { title: string }) {
  // Centered text, allowed to grow -- it's anchored by its CENTER (via the
  // flex row centering it), not a left edge, so shrinking only has to kick
  // in if the title would genuinely overflow the section's own width.
  const { fontSize } = fitText(title, 'body.sectionHeader', { widthBudget: 1100, fontMax: 85, charFactor: .62 });
  return <div style={{ width: 1200, height: 198, position: 'relative', overflow: 'hidden', background: '#F14222' }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: stack('Quiet Sans'), fontWeight: 800, fontSize, color: '#fff',
        letterSpacing: -0.85, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{title}</span>
    </div>
  </div>;
}

// Real product photography placeholders, not a flat grey div -- a flat div
// has no `Media` id, so the library's swap panel had nothing to open; a
// designer couldn't change the "Top Picks" image at all, only the text
// under it.
const PRODUCT_PLACEHOLDERS = ['/reference/badge-jacket-blue.png', '/reference/badge-boot-brown.jpg',
  '/reference/badge-shoe-beige.jpg', '/reference/badge-jacket-black.png'];

function ProductCard({ id, n }: { id: string; n: number }) {
  const { edits } = useEdits();
  const brand = textOf(edits, `${id}/product/${n}/brand`, 'Brand Name');
  const name = textOf(edits, `${id}/product/${n}/name`, 'Product Name');
  const price = textOf(edits, `${id}/product/${n}/price`, '$Sale Price');
  // Brand/name are fixed-position, one-line labels under a fixed-width
  // image -- a long real brand/product name shrinks to fit rather than
  // wrapping (which would push the price/Shop Now below it down and out
  // of alignment with the other 3 cards in the row).
  const brandSize = fitText(brand, 'body.productBrand', { widthBudget: 475, fontMax: 28 }).fontSize;
  const nameSize = fitText(name, 'body.productName', { widthBudget: 475, fontMax: 28 }).fontSize;
  return <div style={{ width: 475, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
    <Media id={`${id}/product/${n}`} src={PRODUCT_PLACEHOLDERS[n % PRODUCT_PLACEHOLDERS.length]}
      alt={name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', background: '#eee' }} />
    <Editable id={`${id}/product/${n}/brand`} style={{ width: '100%', fontFamily: stack('Quiet Sans'),
      fontWeight: 700, fontSize: brandSize, color: ink, textAlign: 'center', whiteSpace: 'nowrap' }}>{brand}</Editable>
    <Editable id={`${id}/product/${n}/name`} style={{ width: '100%', fontFamily: stack('Quiet Sans'),
      fontSize: nameSize, color: ink, textAlign: 'center', whiteSpace: 'nowrap' }}>{name}</Editable>
    <Editable id={`${id}/product/${n}/price`} style={{ width: '100%', fontFamily: stack('Quiet Sans'),
      fontWeight: 700, fontSize: 28, color: ink, textAlign: 'center' }}>{price}</Editable>
    <Editable id={`${id}/product/${n}/shop`} style={{ width: '100%', fontFamily: stack('Quiet Sans'),
      fontSize: 28, color: ink, textAlign: 'center', textDecoration: 'underline' }}>Shop Now</Editable>
  </div>;
}

const BRAND_GRID = ['patagonia', 'mountain-hardwear', 'the-north-face', 'outdoor-research', 'smartwool', 'rab'];

export function EmailBodyContent({ asset, bodyCopy, secondHeader, brandTiles = 6 }: {
  asset: SheetAsset; bodyCopy: string; secondHeader: string;
  /** How many placeholder tiles the brand grid shows -- sends differ (6 vs 4). */
  brandTiles?: number;
}) {
  const { edits, mode } = useEdits();
  const id = asset.id;
  const copy = textOf(edits, `${id}/body`, bodyCopy);
  const header1 = textOf(edits, `${id}/header1`, 'Your Top Picks');
  const header2 = textOf(edits, `${id}/header2`, secondHeader);
  // The brief's own brand roster when it names one -- a 9-brand brief gets
  // 9 tiles, not capped at this send's 6/6/4 design default, which only
  // applies when the brief itself doesn't name specific brands.
  const brands = asset.media.brands?.length ? asset.media.brands : BRAND_GRID.slice(0, brandTiles);
  // A tile's own "Remove image from this asset" control (the same one every
  // Media slot already has) now removes the WHOLE tile in the exported/
  // preview render, not just blanks the picture inside an otherwise-still-
  // there box -- that's the real "go from 9 to 8" a designer wants, and
  // un-hiding it again is "back to 9" or "add a 10th" once the brief names
  // one more brand. In edit mode a hidden tile stays in the grid so its own
  // "click to restore" affordance (Media's existing one) is still reachable.
  const visibleBrands = brands
    .map((brand, n) => ({ brand, n }))
    .filter(({ n }) => mode === 'edit' || !picOf(edits, `${id}/brand/${n}`).hidden);

  return <div style={{ width: 1200 }}>
    <BumpEmailBodyHeader asset={asset} />

    <div style={{ width: 1200, padding: '50px 46px 100px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 75, background: '#fff' }}>
      <Editable id={`${id}/body`} style={{ fontFamily: stack('Quiet Sans'), fontSize: 54, color: ink,
        textAlign: 'center', width: 1042, lineHeight: 1.3 }}>{copy}</Editable>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Media id={`${id}/body-cta/mark`} src="/graphics/pill.svg" fill={ink}
          style={{ position: 'absolute', inset: 0 }} />
        <Editable id={`${id}/body-cta`} style={{ position: 'relative', display: 'grid', placeItems: 'center',
          padding: '39px 100px', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontWeight: 700, fontSize: 64, letterSpacing: -0.64, whiteSpace: 'nowrap' }}>Shop Now</Editable>
      </div>
    </div>

    <SectionHeader title={header1} />

    <div style={{ width: 1200, padding: '5px 100px', background: '#fff', display: 'flex',
      flexWrap: 'wrap', gap: '100px 50px', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map(n => <ProductCard key={n} id={id} n={n} />)}
    </div>

    <div style={{ width: 1200, padding: '0 100px', height: 250, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#fff' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Media id={`${id}/see-more/mark`} src="/graphics/pill.svg" fill={ink}
          style={{ position: 'absolute', inset: 0 }} />
        <Editable id={`${id}/see-more`} style={{ position: 'relative', display: 'grid', placeItems: 'center',
          padding: '40px 100px', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontWeight: 700, fontSize: 50, whiteSpace: 'nowrap' }}>See More</Editable>
      </div>
    </div>

    <SectionHeader title={header2} />

    <div style={{ width: 1200, padding: '52px 48px', background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
        {Array.from({ length: Math.ceil(visibleBrands.length / 2) }, (_, row) =>
          <div key={row} style={{ display: 'flex', gap: 49, justifyContent: 'center' }}>
          {/* `/brand/${n}` with a numeric index, not the brand's own name --
              that's the exact shape `offeredFor()` matches to offer brand
              swaps at all; a name-keyed id (`/brand/black-diamond`) isn't
              recognised as a brand slot, so the library panel had nothing
              to show and it looked like a locked, unchangeable image. */}
          {visibleBrands.slice(row * 2, row * 2 + 2).map(({ brand, n }) =>
            <div key={brand} style={{ width: 527, height: 527, background: '#333', borderRadius: 25,
              position: 'relative', overflow: 'hidden' }}>
              <BrandMark id={`${id}/brand/${n}`} name={brand}
                fallback={`/logos/brand-${BRAND_GRID[n % BRAND_GRID.length]}.svg`}
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                  width: '70%', height: '40%', objectFit: 'contain' } as React.CSSProperties} />
            </div>)}
        </div>)}
      </div>
    </div>

    <div style={{ width: 1200, height: 460, background: '#fff', position: 'relative' }}>
      {/* `/logos/sac-logo.svg` is the REVERSED cut -- white glyphs, meant for
          a dark ground -- which rendered blank on this plain white footer.
          `/logos/sac-logo-light.svg` is the dark-on-light lockup and already has
          "powered by Backcountry" baked in, so it needs no backing tile and
          no separate "Backcountry" text added on top. */}
      <Media id={`${id}/footer/logo`} src="/logos/sac-logo-light.svg" alt="Steep & Cheap, powered by Backcountry"
        style={{ position: 'absolute', left: 65, top: 36, width: 239, height: 120, objectFit: 'contain' }} />
      <Media id={`${id}/footer/facebook`} src="/logos/social-facebook.png" alt="Facebook"
        style={{ position: 'absolute', left: 986, top: 45, width: 59, height: 59 }} />
      <Media id={`${id}/footer/instagram`} src="/logos/social-instagram.png" alt="Instagram"
        style={{ position: 'absolute', left: 1066, top: 45, width: 59, height: 59 }} />
      <Editable id={`${id}/footer/unsubscribe`} style={{ position: 'absolute', left: 897, top: 329,
        width: 256, textAlign: 'right', fontFamily: stack('Quiet Sans'), fontWeight: 600, fontSize: 25,
        color: ink, textDecoration: 'underline' }}>Unsubscribe</Editable>
      <Editable id={`${id}/footer/contact`} style={{ position: 'absolute', left: 897, top: 363,
        width: 256, textAlign: 'right', fontFamily: stack('Quiet Sans'), fontWeight: 600, fontSize: 25,
        color: ink, textDecoration: 'underline' }}>Talk to a Gearhead</Editable>
      <Editable id={`${id}/footer/address`} style={{ position: 'absolute', left: 65, top: 329,
        width: 612, fontFamily: stack('Quiet Sans'), fontWeight: 600, fontSize: 25,
        color: ink }}>2607 South 3200 West, Suite A, Salt Lake City, UT</Editable>
      <Editable id={`${id}/footer/copyright`} style={{ position: 'absolute', left: 65, top: 363,
        width: 612, fontFamily: stack('Quiet Sans'), fontWeight: 600, fontSize: 25,
        color: ink }}>&copy; 2026 SteepAndCheap.com. All rights reserved</Editable>
    </div>
  </div>;
}
