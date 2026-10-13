/** One asset, drawn. The single place that decides which renderer an asset
 *  gets, so the studio view and the screenshot the judge looks at cannot be
 *  two different pictures of the same thing. */
import { EmailBody } from './Email';
import { AssetView } from './Asset';
import type { Doc } from '../model/compose';
import { accentFor, type TemplateSpec } from '../templates/spec';
import type { Template } from '../templates/registry';
import type { SheetAsset, Sheet } from '../sheet/types';
import { directionsFor, familyOf, type Direction } from '../templates/directions';
import { BumpEmailHero } from './templates/BumpEmail';
import { AutumnEmailHero } from './templates/AutumnEmail';
import { FlashEmailHero } from './templates/FlashEmail';
import { AutumnSocial } from './templates/AutumnSocial';
import { BumpSocial } from './templates/BumpSocial';
import { BadgingMock, CampaignBanner, GlobalText } from './templates/SiteCommerce';
import { BoardHero } from './templates/BoardHero';
import { FlashSocial } from './templates/FlashSocial';
import { BumpTile } from './templates/BumpTile';
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

function OneBase({ asset, doc, template, outlook, treatment }: Props & { treatment: Direction }) {
  if (asset.custom) return <CustomBoard asset={asset} />;
  const i = asset.scope.send ? doc.sends.findIndex(s => s.id === asset.scope.send) : -1;
  if (asset.format === 'email-body' && i >= 0) {
    const heroSpec = template.formats.find(f => f.format === 'email-hero');
    const heroAsset: SheetAsset = heroSpec ? {
      ...asset, id: `${asset.id}/hero`, format: 'email-hero', size: heroSpec.size,
      sections: undefined,
    } : asset;
    const hero = outlook.id === 'sc26_0060'
      ? <BumpEmailHero doc={doc} i={i} variant={asset.variant} />
      : outlook.id === 'sc26_0058'
      ? <AutumnEmailHero doc={doc} i={i} />
      : outlook.id === 'sc26_0021'
      ? <FlashEmailHero doc={doc} i={i} variant={asset.variant} />
      : heroSpec
      ? <AssetView spec={heroSpec} asset={heroAsset} template={outlook} dir={treatment} />
      : undefined;
    return <EmailBody doc={doc} i={i} hero={hero} templateId={outlook.id} />;
  }
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_0060')
    return <BumpEmailHero doc={doc} i={i} variant={asset.variant} />;
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_0058')
    return <AutumnEmailHero doc={doc} i={i} />;
  if (asset.format === 'email-hero' && i >= 0 && outlook.id === 'sc26_0021')
    return <FlashEmailHero doc={doc} i={i} variant={asset.variant} />;
  if (outlook.id === 'sc26_0058' && asset.format.startsWith('paid-social-'))
    return <AutumnSocial asset={asset} />;
  if (outlook.id === 'sc26_0060' && asset.format.startsWith('paid-social-'))
    return <BumpSocial asset={asset} direction={treatment} />;
  if (outlook.id === 'sc26_0021' && asset.format.startsWith('paid-social-'))
    return <FlashSocial asset={asset} />;
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
