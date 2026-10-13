/** A deliberately neutral board for a deliverable absent from the chosen
 * design template. It is a layered editor, not another visual template. */
import type { SheetAsset } from '../sheet/types';
import { useEdits, type Api } from '../edit/store';
import { Editable } from '../edit/Editable';
import { asDataUrl } from '../edit/Media';
import { LIBRARY } from '../model/media';
import { tagsFromFilename } from '../model/userMedia';
import { stack } from '../fonts';

export async function addDroppedCustomMedia(asset: SheetAsset, api: Api, e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation();
    const id = e.dataTransfer.getData('application/x-sac-media');
    const item = [...api.library, ...LIBRARY].find(media => media.id === id);
    if (item) { api.addGraphic(asset.id, item, asset.size, true); return; }
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const saved = await api.addLibrary({ name: file.name.replace(/\.[^.]+$/, ''),
      kind: 'photo', file: await asDataUrl(file), tags: tagsFromFilename(file.name) });
    api.addGraphic(asset.id, saved, asset.size, true);
}

export function CustomBoard({ asset }: { asset: SheetAsset }) {
  const api = useEdits();
  const texts = api.edits.customText?.[asset.id] ?? [];
  const [width, height] = asset.size;
  return <div className="sheet custom-board" data-custom-board={asset.format}
    onDragOver={e => e.preventDefault()}
    onDrop={e => { void addDroppedCustomMedia(asset, api, e); }}
    style={{ width, height, position:'relative', overflow:'hidden',
      background: api.edits.customBackground?.[asset.id] ?? '#ffffff' }}>
    {texts.map(layer => <Editable key={layer.id}
      id={`${asset.id}/custom-text/${layer.id}`}
      style={{ position:'absolute', left:layer.left, top:layer.top,
        width:layer.width, minHeight:layer.height, zIndex:60,
        color:'#222222', fontFamily:stack('Sofia Pro'), fontSize:54,
        lineHeight:1.15, fontWeight:700, whiteSpace:'pre-wrap' }}>
      {layer.text}
    </Editable>)}
  </div>;
}
