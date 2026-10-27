/** Bump email-body nav header: site-chrome nav links (men/women/new
 *  arrivals/shop all) + wordmark logo, sitting above the hero in every send.
 *  Frame 1200x170 (own box, nested at top:583 by the parent email body).
 *  Reconstructed from a corrupted Figma MCP dump (cross-referenced 3
 *  independently-corrupted copies of the same node -- each one dropped
 *  different characters, so every gap in one was intact in another) and
 *  converted to this codebase's conventions. */
import type { SheetAsset } from '../../../sheet/types';
import { Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { stack } from '../../../fonts';

const NAV_LINKS = ['Men', 'Women', 'New Arrivals', 'Shop All'];

export function BumpEmailBodyHeader({ asset }: { asset: SheetAsset }) {
  return <Ground id={`${asset.id}/header`} className="sheet" style={{
    width: 1200, height: 170, position: 'relative', background: '#fff' }}>
    <div style={{ position: 'absolute', left: 461.79, top: '50%', transform: 'translateY(calc(-50% - 5.14px))',
      display: 'flex', alignItems: 'center', gap: 77, whiteSpace: 'nowrap',
      fontFamily: stack('Quiet Sans'), fontWeight: 600, fontSize: 30 }}>
      {NAV_LINKS.map((label, n) =>
        <span key={n} style={{ color: n === 3 ? '#79ac41' : '#000' }}>{label}</span>)}
    </div>
    {/* `sac-logo.svg` is the reversed (white) cut for a dark ground --
        invisible on this white nav bar, which is why it rendered blank.
        `sac-logo-light.svg` is the real dark-on-light lockup (pulled off
        the design system board, Figma node 759:29603) this header needs. */}
    <Media id={`${asset.id}/header/logo`} src="/logos/sac-logo-light.svg" alt="Steep & Cheap, powered by Backcountry"
      style={{ position: 'absolute', left: 92, top: 29.86, width: 219.795, height: 100, objectFit: 'contain' }} />
  </Ground>;
}
