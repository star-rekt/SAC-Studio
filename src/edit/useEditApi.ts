/** Every edit a person can make, as the `Api` the renderers and panels use
 *  (`Ctx`): retyping, moving, resizing, photos, colours, the library, added
 *  graphics and text layers, resets. Edits are kept by the caller (the
 *  campaign's own), the selection and the alignment group here. */
import { useCallback, useState } from 'react';
import { EMPTY, FRESH_PIC, type Api, type Edits, type Pic, type Paint } from './store';
import type { Item } from '../model/media';
import { addUserMedia, retagUserMedia, deleteUserMedia, type UserMedia } from '../model/userMedia';
import { analysisFor } from '../model/analysePhoto';

export function useEditApi({ edits, setEdits, library, setLibrary, mode = 'edit' }: {
  edits: Edits;
  setEdits: (f: (e: Edits) => Edits) => void;
  library: UserMedia[];
  setLibrary: (f: (items: UserMedia[]) => UserMedia[]) => void;
  mode?: Api['mode'];
}): Api {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string[]>([]);
  // A plain select starts a fresh single-item edit, not an addition to a group.
  const select = useCallback((id: string | null) => { setSelected(id); setSelectedGroup([]); }, []);
  return {
    edits, mode, selected, selectedGroup, library, select,
    toggleGroup: id => setSelectedGroup(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]),
    addToGroup: ids => { if (ids.length) setSelectedGroup(g => [...g, ...ids.filter(id => !g.includes(id))]); },
    setGroup: ids => setSelectedGroup(ids),
    clearGroup: () => setSelectedGroup([]),
    // The sentinel means 'back to what the template says', which is not an
    // empty string and must not be stored as one.
    setText: (id, v) => setEdits(e => {
      if (v !== '\u0000CLEAR') return { ...e, text: { ...e.text, [id]: v } };
      if (!(id in e.text)) return e;
      const text = { ...e.text }; delete text[id];
      return { ...e, text };
    }),
    nudge: (id, dx, dy) => setEdits(e => ({ ...e, move: { ...e.move, [id]: { dx, dy } } })),
    resize: (id, scale) => setEdits(e => ({ ...e, size: { ...e.size, [id]: scale } })),
    setPic: (id, p: Partial<Pic>) => setEdits(e => ({ ...e, pic: { ...e.pic, [id]: { ...(e.pic[id] ?? FRESH_PIC), ...p } } })),
    setPaint: (id, p: Paint) => setEdits(e => ({ ...e, paint: { ...e.paint, [id]: { ...(e.paint?.[id] ?? {}), ...p } } })),
    addLibrary: async item => {
      const saved = await addUserMedia(item);
      setLibrary(items => [...items, saved]);
      // Analysed now, in the background, so placing it later costs nothing.
      if (saved.kind === 'photo') void analysisFor(saved.file);
      return saved;
    },
    retagLibrary: async (id, tags) => {
      const saved = await retagUserMedia(id, tags);
      setLibrary(items => items.map(item => item.id === id ? saved : item));
    },
    removeLibrary: async id => {
      if (await deleteUserMedia(id)) setLibrary(items => items.filter(item => item.id !== id));
    },
    addGraphic: (assetId: string, item: Item, size: [number, number], custom = false) => {
      const id = crypto.randomUUID();
      // On a custom board a picture fills it; anywhere else it's a mark, placed small.
      const fill = custom && !['mark', 'brand', 'wordmark'].includes(item.kind);
      const width = fill ? size[0] : Math.min(180, Math.round(size[0] * .2));
      const layer = { id, src: item.file, name: item.name,
        left: fill ? 0 : Math.round(size[0] * .08), top: fill ? 0 : Math.round(size[1] * .08),
        width, height: fill ? size[1] : width };
      setEdits(e => ({ ...e, graphics: { ...e.graphics, [assetId]: [...(e.graphics?.[assetId] ?? []), layer] } }));
      const slot = `${assetId}/graphic/${id}/mark`;
      select(slot);
      return slot;
    },
    removeGraphic: (assetId, layerId) => {
      const slot = `${assetId}/graphic/${layerId}/mark`;
      setEdits(e => {
        const graphics = { ...e.graphics, [assetId]: (e.graphics?.[assetId] ?? []).filter(l => l.id !== layerId) };
        const move = { ...e.move }, size = { ...e.size }, pic = { ...e.pic }, paint = { ...e.paint };
        delete move[`${slot}/group`]; delete size[slot]; delete pic[slot]; delete paint[slot];
        return { ...e, graphics, move, size, pic, paint };
      });
      select(null);
    },
    addCustomText: (assetId, size) => {
      const id = crypto.randomUUID();
      const layer = { id, text: 'Type here', left: Math.round(size[0] * .08), top: Math.round(size[1] * .12),
        width: Math.round(size[0] * .8), height: 150 };
      setEdits(e => ({ ...e, customText: { ...e.customText, [assetId]: [...(e.customText?.[assetId] ?? []), layer] } }));
      const slot = `${assetId}/custom-text/${id}`;
      select(slot);
      return slot;
    },
    removeCustomText: (assetId, layerId) => {
      const slot = `${assetId}/custom-text/${layerId}`;
      setEdits(e => {
        const customText = { ...e.customText, [assetId]: (e.customText?.[assetId] ?? []).filter(l => l.id !== layerId) };
        const text = { ...e.text }, move = { ...e.move }, size = { ...e.size }, paint = { ...e.paint };
        delete text[slot]; delete move[slot]; delete size[slot]; delete paint[slot];
        return { ...e, customText, text, move, size, paint };
      });
      select(null);
    },
    setCustomBackground: (assetId, colour) => {
      if (/^#[0-9a-fA-F]{6}$/.test(colour)) setEdits(e => ({ ...e, customBackground: { ...e.customBackground, [assetId]: colour } }));
    },
    reset: id => setEdits(e => {
      const drop = <T,>(m: Record<string, T> = {}) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id));
      return { ...e, text: drop(e.text), move: drop(e.move), pic: drop(e.pic), size: drop(e.size), paint: drop(e.paint) };
    }),
    resetAll: () => setEdits(() => EMPTY),
  };
}
