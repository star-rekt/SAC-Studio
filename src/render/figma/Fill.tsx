/** A layer's paint as the board has it: its colour, then each image fill over
 *  it (a paper texture, a grain) with its own opacity and blend, clipped to
 *  the layer's corners. For grounds and bands only -- nothing to edit. */
import type { CSSProperties } from 'react';
import type { FigmaLayer, FigmaLayout } from './layout';

const BLEND: Record<string, CSSProperties['mixBlendMode']> = { MULTIPLY: 'multiply', SCREEN: 'screen',
  LIGHTEN: 'lighten', DARKEN: 'darken', OVERLAY: 'overlay', SOFT_LIGHT: 'soft-light' };

export function Fill({ layer, layout, style }: { layer: FigmaLayer; layout: FigmaLayout; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', overflow: 'hidden', borderRadius: layer.radius, background: layer.fill,
    pointerEvents: 'none', ...style }}>
    {layer.images?.map((i, n) => {
      const src = layout.assets?.[i.ref]?.src;
      return src && <div key={n} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${src})`,
        backgroundSize: i.mode === 'TILE' ? 'auto' : 'cover', backgroundRepeat: i.mode === 'TILE' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center', opacity: i.opacity, mixBlendMode: i.blend ? BLEND[i.blend] : undefined }} />;
    })}
    {layer.shade && <div style={{ position: 'absolute', inset: 0, background: layer.shade }} />}
  </div>;
}
