/** One asset, drawn. The single place that decides which renderer an asset
 *  gets, so the studio view and the screenshot the judge looks at cannot be
 *  two different pictures of the same thing. */
import { EmailBody } from './Email';
import { AssetView } from './Asset';
import type { Doc } from '../model/compose';
import { accentFor, type TemplateSpec } from '../templates/spec';
import type { Template } from '../templates/registry';
import type { SheetAsset, Sheet } from '../sheet/types';
import { assetId } from '../sheet/types';
import { directionsFor, familyOf, type Direction } from '../templates/directions';
import { FlashEmailHero } from './templates/flash/FlashEmail';
import { FlashEmailBody } from './templates/flash/FlashEmailBody';
import { BumpEmailHeader1 } from './templates/bump/EmailHeader1';
import { BumpEmailHero as BumpEmailHeader2 } from './templates/bump/EmailHero';
import { BumpEmailHeader3 } from './templates/bump/EmailHeader3';
import { BumpEmailBody1 } from './templates/bump/EmailBody1';
import { BumpEmailBody2 } from './templates/bump/EmailBody2';
import { BumpEmailBody3 } from './templates/bump/EmailBody3';
import { BumpSocial1x1 } from './templates/bump/Social1x1';
import { BumpSocial4x5 } from './templates/bump/Social4x5';
import { BumpSocial9x16 } from './templates/bump/Social9x16';
import { BumpSocial1x1 as Bump2Social1x1 } from './templates/bump2/BumpSocial1x1';
import { BumpSocial4x5 as Bump2Social4x5 } from './templates/bump2/BumpSocial4x5';
import { BumpSocial9x16 as Bump2Social9x16 } from './templates/bump2/BumpSocial9x16';
import { Bump2EmailBody, Bump2EmailHero, type Design as Bump2Design } from './templates/bump2/EmailBody';
import { NamedSale, namedSaleHas } from './templates/named-sale/NamedSale';
import { emailVariant } from '../templates/variants';
import { BadgingMock, CampaignBanner, GlobalText } from './templates/SiteCommerce';
import { BoardHero } from './templates/BoardHero';
import { FlashSocial } from './templates/flash/FlashSocial';
import { BumpTile } from './templates/bump/BumpTile';
import { DerivedSite, DerivedTile } from './templates/BoardExtras';
import { useEdits } from '../edit/store';
import { Media } from '../edit/Media';
import { Movable } from '../edit/Editable';
import { SuggestedImage } from '../edit/Picture';
import { matchImage } from '../model/matchImage';
import { CustomBoard, addDroppedCustomMedia } from './CustomBoard';

type Props = {
  asset: SheetAsset; doc: Doc; template: Template; outlook: TemplateSpec;
  direction?: Sheet['direction'];
  formatDirections?: Sheet['formatDirections'];
};

export function One(props: Props) {
  const api = useEdits();
  const graphics = api.edits.graphics?.[props.asset.id] ?? [];
  const family = familyOf(props.asset.format);
  const choice = props.formatDirections?.[props.asset.format]
    ?? (family ? props.direction?.[family] : undefined) ?? 'a';
  const treatment = directionsFor(accentFor(props.outlook, props.asset.format))
    .find(value => value.id === choice)!;
  const changed = treatment.id !== 'a';
  const base = <SuggestedImage.Provider value={matchImage(props.asset, api.library)}>
    <OneBase {...props} treatment={treatment} />
  </SuggestedImage.Provider>;
  if (!graphics.length && !changed) return base;
  return <div className="layered-sheet" data-design-direction={treatment.id}
    onDragOver={props.asset.custom ? e => e.preventDefault() : undefined}
    onDrop={props.asset.custom ? e => { void addDroppedCustomMedia(props.asset, api, e); } : undefined}
    style={{ position:'relative', width:props.asset.size[0],
      height: props.asset.custom ? props.asset.size[1] : undefined,
      overflow: changed || props.asset.custom ? 'hidden' : undefined,
      borderRadius: changed ? treatment.radius : undefined,
      clipPath: changed && treatment.shape === 'notch'
        ? 'polygon(0 0,100% 0,100% calc(100% - 70px),calc(100% - 70px) 100%,0 100%)'
        : undefined }}>
    {base}
    {changed && <div aria-hidden="true" style={{ position:'absolute', inset:0,
      border:`8px solid ${treatment.accent}`, borderRadius:treatment.radius,
      boxSizing:'border-box', zIndex:90, pointerEvents:'none' }} />}
    {graphics.map(layer => {
      const slot = `${props.asset.id}/graphic/${layer.id}/mark`;
      return <Movable key={layer.id} id={`${slot}/group`}
        style={{ position:'absolute', left:layer.left, top:layer.top,
          width:layer.width, height:layer.height, zIndex:50 }}>
        <Media id={slot} src={layer.src} alt={layer.name}
          style={{ width:layer.width, height:layer.height, objectFit:'contain' }} />
      </Movable>;
    })}
  </div>;
}

function bumpEmailHero(asset: SheetAsset, sendIndex: number) {
  const variant = emailVariant('sc26_0060', asset.variant, sendIndex);
  // Always keyed as the standalone "email-hero" asset would be, regardless of
  // whether this is rendered on its own or embedded inside email-body -- the
  // two must share one edit-storage id, or edits made in one tab vanish from
  // the other despite being literally the same component.
  const heroAsset: SheetAsset = { ...asset, id: assetId('email-hero', asset.scope, asset.variant),
    format: 'email-hero', size: [1200, variant?.height ?? 826] };
  if (variant?.id === 'send-2') return <BumpEmailHeader2 asset={heroAsset} />;
  if (variant?.id === 'send-3') return <BumpEmailHeader3 asset={heroAsset} />;
  return <BumpEmailHeader1 asset={heroAsset} />;
}

function bumpEmailBody(asset: SheetAsset, sendIndex: number, hero: React.ReactNode) {
  const variant = emailVariant('sc26_0060', asset.variant, sendIndex);
  if (variant?.id === 'send-2') return <BumpEmailBody2 asset={asset} hero={hero} />;
  if (variant?.id === 'send-3') return <BumpEmailBody3 asset={asset} hero={hero} />;
  return <BumpEmailBody1 asset={asset} hero={hero} />;
}

function bumpSocial(asset: SheetAsset, direction: Direction) {
  if (asset.format === 'paid-social-4x5') return <BumpSocial4x5 asset={asset} direction={direction} />;
  if (asset.format === 'paid-social-9x16') return <BumpSocial9x16 asset={asset} direction={direction} />;
  return <BumpSocial1x1 asset={asset} direction={direction} />;
}

// Bump 2's socials don't take a `direction` prop (no alternate treatment was
// drafted for them yet); the signature stays parallel to `bumpSocial` so the
// call site doesn't need its own branch.
function bump2Social(asset: SheetAsset) {
  if (asset.format === 'paid-social-4x5') return <Bump2Social4x5 asset={asset} />;
  if (asset.format === 'paid-social-9x16') return <Bump2Social9x16 asset={asset} />;
  return <Bump2Social1x1 asset={asset} />;
}

// Bump 2's five email designs are each self-contained (inbox lines, hero,
// sections and footer in one board frame, unlike sc26_0060's separate
// hero+body split), so the body draws its own hero; a send's "email-hero"
// asset, where the brief asks for one, is that hero alone, sharing its edits.
// A send without a chosen design cycles through the board's five.
const bump2Design = (asset: SheetAsset, sendIndex: number) =>
  (Number(emailVariant('sc26_bump2', asset.variant, sendIndex)?.id.replace('design-', '')) || 1) as Bump2Design;
function bump2EmailBody(asset: SheetAsset, sendIndex: number) {
  return <Bump2EmailBody asset={asset} design={bump2Design(asset, sendIndex)} />;
}

function OneBase({ asset, doc, template, outlook, treatment }: Props & { treatment: Direction }) {
  if (asset.custom) return <CustomBoard asset={asset} />;
  const i = asset.scope.send ? doc.sends.findIndex(s => s.id === asset.scope.send) : -1;
  if (asset.format === 'email-body' && i >= 0) {
    // Named Sale's fifteen email designs are whole emails (hero to footer).
    if (outlook.id === 'named_sale')
      return <NamedSale asset={asset} design={emailVariant('named_sale', asset.variant, i)?.id} />;
    const heroSpec = template.formats.find(f => f.format === 'email-hero');
    const heroAsset: SheetAsset = heroSpec ? {
      ...asset, id: `${asset.id}/hero`, format: 'email-hero', size: heroSpec.size,
      sections: undefined,
    } : asset;
    const hero = outlook.id === 'sc26_0060'
      ? bumpEmailHero(asset, i)
      : outlook.id === 'sc26_0021'
      ? <FlashEmailHero doc={doc} i={i} variant={asset.variant} />
      : heroSpec
      ? <AssetView spec={heroSpec} asset={heroAsset} template={outlook} dir={treatment} />
      : undefined;
    // Bump's full marketing email (body copy, product grid, brand grid, its
    // own footer) is its own component, not the generic section-driven
    // `<EmailBody>` -- that one only draws what the brief's own `sections`
    // list spells out, which is empty for any brief that just says "Email"
    // without writing out per-send bullets, leaving the body blank below
    // the hero.
    if (outlook.id === 'sc26_0060') return bumpEmailBody(asset, i, hero);
    if (outlook.id === 'sc26_bump2') return bump2EmailBody(asset, i);
    if (outlook.id === 'sc26_0021') return <FlashEmailBody doc={doc} i={i} hero={hero} />;
    return <EmailBody doc={doc} i={i} hero={hero} templateId={outlook.id} />;
  }
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_0060')
    return bumpEmailHero(asset, i);
  // Named Sale's email hero: the send's email design's own hero section.
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'named_sale')
    return <NamedSale asset={asset} design={emailVariant('named_sale', asset.variant, i)?.id} />;
  // A brief that asks for an email hero on its own gets the chosen design's hero.
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_bump2')
    return <Bump2EmailHero asset={asset} design={bump2Design(asset, i)} />;
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_0021')
    return <FlashEmailHero doc={doc} i={i} variant={asset.variant} />;
  if (outlook.id === 'sc26_0060' && asset.format.startsWith('paid-social-'))
    return bumpSocial(asset, treatment);
  if (outlook.id === 'sc26_bump2' && asset.format.startsWith('paid-social-'))
    return bump2Social(asset);
  if (outlook.id === 'sc26_0021' && asset.format.startsWith('paid-social-'))
    return <FlashSocial asset={asset} />;
  // Named Sale's hero and socials, each the board design chosen for the asset.
  if (outlook.id === 'named_sale' && namedSaleHas(asset.format))
    return <NamedSale asset={asset} design={asset.variant} />;
  if (asset.format === 'hero-desktop')
    return <BoardHero asset={asset} templateId={outlook.id} />;
  if (outlook.id === 'sc26_0060' && asset.format === 'cplp-tile')
    return <BumpTile asset={asset} />;
  if (asset.format === 'cplp-tile')
    return <DerivedTile asset={asset} templateId={outlook.id} />;
  if (['hero-mobile','logo-strip','compact-mobile','text-banner',
       'text-banner-mobile','text-link'].includes(asset.format))
    return <DerivedSite asset={asset} templateId={outlook.id} direction={treatment} />;
  if (asset.format === 'cb')
    return <CampaignBanner asset={asset} templateId={outlook.id} direction={treatment} />;
  if (asset.format === 'gt')
    return <GlobalText asset={asset} templateId={outlook.id} />;
  if (asset.format === 'pdp-badging-mock' || asset.format === 'plp-badging-mock')
    return <BadgingMock asset={asset} templateId={outlook.id} direction={treatment} />;
  const spec = template.formats.find(f => f.format === asset.format);
  return spec
    ? <AssetView spec={spec} asset={asset} template={outlook} dir={treatment} />
    : <div className="gap">no measured geometry for {asset.format}</div>;
}
