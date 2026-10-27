/** Desktop hero compositions measured from the three linked Figma boards.
 * Typography and each photograph are separate edit targets; no hero is a
 * flattened screenshot. A second requested hero reuses the board's layout
 * while its brief copy (or a designer's edits) changes independently. */
import type { SheetAsset } from '../../sheet/types';
import { Editable, Ground } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';
import { useEdits, textOf } from '../../edit/store';
import { fitText } from '../../model/textContracts';
import { Flash } from './flash/BoardHero';
import { BumpHero } from './bump/Hero';
import { HeroEndsToday as Bump2HeroEndsToday } from './bump2/HeroEndsToday';

const orange = '#f14222';
const base = (w: number, h: number, bw: number, bh: number): React.CSSProperties => ({
  position: 'absolute', width: bw, height: bh,
  transform: `scale(${w / bw},${h / bh})`, transformOrigin: 'top left',
});
// Figma trims every text box to cap-height (its own 'leading-trim: both;
// text-edge: cap'); the CSS equivalent is text-box-trim/text-box-edge, which
// this Chromium supports. Without it, a normal line-height box is taller
// than Figma's and adds phantom leading above the glyphs, which is what put
// every headline and bolt a visible amount too low.
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
  textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra } as React.CSSProperties);

/** The bolt flanking Flash's title: the library's own "bolt" mark, not a
 *  text-glyph stand-in. It ships in white and in ink -- the board's own
 *  bolt is whichever one matches the title it sits beside, not always white. */
function Bolt({ id, size, pale = true }: { id: string; size: number; pale?: boolean }) {
  return <Media id={id} src={pale ? '/graphics/bolt.svg' : '/graphics/bolt-ink.svg'} alt=""
    style={{ width: size * 40 / 88, height: size, display: 'block' }} />;
}

function photo(asset: SheetAsset, slot: string, src: string,
  style: React.CSSProperties, focus?: { x: number; y: number }, initialScale?: number) {
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  return <Picture id={`${asset.id}/${slot}/photo`} zone={zone} initialSrc={src}
    focus={focus} initialScale={initialScale}
    style={{ ...style, borderRadius: 14, overflow: 'hidden' }} />;
}

function Autumn({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#1b1a17'}}>
    <div style={base(w,h,1440,920)}>
      {photo(asset,'background','/reference/autumn-hero-photo.png',
        {position:'absolute',inset:0,width:1440,height:920,borderRadius:0}, {x:50,y:50})}
      <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-strip.svg"
        alt="Orange brush" style={{position:'absolute',left:900,top:215,width:462,height:86}} />
      {(() => { const urgency = asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY';
        const { fontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 440 });
        return <Editable id={`${asset.id}/urgency`} style={txt(935,222,fontSize!,
          {color:'#fff',fontWeight:800,whiteSpace:'nowrap'})}>{urgency}</Editable>; })()}
      {!asset.scope.topic && <Editable id={`${asset.id}/lead`} style={txt(822,331,148,
        {color:'#fff',fontWeight:800})}>{asset.copy.lead || 'EXTRA'}</Editable>}
      {(() => { const offerText = asset.scope.topic || asset.copy.offer || '20% OFF';
        const { fontSize } = fitText(offerText, 'hero.offer', { widthBudget: 710, fontMax: 153 });
        return <Editable id={`${asset.id}/offer`} style={txt(649,469,fontSize!,
          {color:'#fff',fontWeight:800,whiteSpace:'nowrap'})}>{offerText}</Editable>; })()}
      {(() => {
        // Split so the code WORD can be bold without the label "CODE" also
        // being bold -- Editable is plain-string-only (no mixed-weight runs
        // within one field). Only when a real code exists: the qualifier/
        // no-code fallback is free text, not a label+word pair.
        const codeLabel = asset.copy.code ? 'CODE ' : undefined;
        const codeWord = asset.copy.code || asset.copy.qualifier || 'NO CODE NEEDED';
        const codeText = `${codeLabel ?? ''}${codeWord}`;
        const { fontSize } = fitText(codeText, 'hero.code', { widthBudget: 500, fontMax: 61 });
        return <div style={txt(824,630,fontSize!,{color:'#fff',whiteSpace:'nowrap'})}>
          {codeLabel !== undefined ? <>
            <Editable as="span" id={`${asset.id}/code/label`}>{codeLabel}</Editable>
            <Editable as="span" id={`${asset.id}/code/value`} style={{fontWeight:800}}>{codeWord}</Editable>
          </> : <Editable as="span" id={`${asset.id}/code`}>{codeWord}</Editable>}
        </div>; })()}
      {(() => { const cta = asset.copy.cta || 'Shop Now';
        const { fontSize } = fitText(cta, 'hero.cta', { widthBudget: 420, fontMax: 49 });
        return <Editable id={`${asset.id}/cta`} style={txt(992,745,fontSize!,
          {color:'#fff',background:orange,borderRadius:20,padding:'26px 71px',
            fontWeight:700,whiteSpace:'nowrap'})}>{cta}</Editable>; })()}
    </div>
  </Ground>;
}

export function BoardHero({ asset, templateId }: {asset:SheetAsset;templateId:string}) {
  // Bump 2 only drafted its own "ends today" hero; the launch phase reuses
  // sc26_0060's hero wholesale -- same board, same measurements, no second
  // design for that phase to draw from instead.
  if (templateId === 'sc26_bump2')
    return asset.scope.phase === 'Ends Today'
      ? <Bump2HeroEndsToday asset={asset} />
      : <BumpHero asset={asset} />;
  return templateId === 'sc26_0060' ? <BumpHero asset={asset} />
    : templateId === 'sc26_0058' ? <Autumn asset={asset} />
    : <Flash asset={asset} />; // Flash template-specific hero component
}
