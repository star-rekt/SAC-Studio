/** The shell every template compiled from a Figma frame renders in: the
 *  sheet's ground, the frame's photo at Figma's own crop, and the copy
 *  wrapped for smart placement -- so a compiled template gets photo framing
 *  and copy placement (docs/smart-placement.md) without opting in.
 *
 *  Children are the frame's layers, placed in the frame's own px (the shell
 *  scales the frame to the sheet). Everything passed as children is copy;
 *  marks the copy must avoid but that never move (a marquee band) go in
 *  `fixed`. A sheet taller than its frame (an email hero with its brand
 *  strip under it) passes `frameHeight` and draws the rest in `after`. */
import type { ReactNode } from 'react';
import { Ground } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { CopyBlock } from '../../edit/autoPlace';
import { useEdits } from '../../edit/store';
import type { Zone } from '../../model/compose';
import { cropOf, boxOf, type FigmaLayout, type FigmaLayer } from './layout';

export function FigmaFrame({ id, size, layout, zone, photo, background, frameHeight, ground, fixed, after, centred, attrs, sheetStyle, children }: {
  /** The asset's id: the sheet is `<id>/fill`, the copy block `<id>/copy`. */
  id: string;
  /** The sheet's px size. */
  size: [number, number];
  layout: FigmaLayout;
  zone: Zone;
  /** The frame's photo: its edit id, the design's own image, and that
   *  image's px size (for the crop). It fills the frame, or with `layer`
   *  sits in that layer's box, corners and crop (a rounded photo card). */
  photo?: { id: string; src: string; size: [number, number]; layer?: FigmaLayer };
  /** The sheet colour behind the photo. */
  background?: string;
  /** How much of the sheet's height the frame fills; all of it by default. */
  frameHeight?: number;
  /** Layers drawn under the photo (a paper texture round a photo card). */
  ground?: ReactNode;
  /** Layers that stay put and that the copy keeps clear of. */
  fixed?: ReactNode;
  /** Sheet content below the frame, in the sheet's own px. */
  after?: ReactNode;
  /** Keep the copy exactly where it was designed; only the photo is framed. */
  centred?: boolean;
  attrs?: Record<string, string>;
  /** Extra sheet styling (a design direction's clip shape). */
  sheetStyle?: React.CSSProperties;
  children: ReactNode;
}) {
  const { edits } = useEdits();
  const [w, h] = size;
  const [fw, fh] = layout.size;
  const at = photo?.layer;
  const cropped = at ? at.crop : layout.frame.crop;
  const crop = photo && cropped ? cropOf(cropped, at ? [at.w, at.h] : [fw, fh], photo.size) : undefined;
  return <Ground id={`${id}/fill`} className="sheet" {...attrs} style={{ width: w, height: h, position: 'relative',
    overflow: 'hidden', background: background ?? layout.frame.fill, ...sheetStyle }}>
    <div style={{ position: 'absolute', width: fw, height: fh, pointerEvents: 'none',
      transform: `scale(${w / fw},${(frameHeight ?? h) / fh})`, transformOrigin: 'top left' }}>
      {ground}
      {photo && <Picture id={photo.id} zone={zone} initialSrc={photo.src}
        focus={crop?.focus} initialScale={crop?.initialScale} initialRotate={crop?.rotate}
        style={at ? { ...boxOf(at), borderRadius: at.radius, overflow: 'hidden' }
          : { position: 'absolute', inset: 0, width: fw, height: fh, overflow: 'hidden' }} />}
      {fixed}
      <CopyBlock id={`${id}/copy`} edits={edits} fixed={centred}>{children}</CopyBlock>
    </div>
    {after}
  </Ground>;
}
