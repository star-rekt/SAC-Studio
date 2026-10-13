/** Every change a person makes, kept apart from the composed document.
 *
 *  The document is what the brief says. The edits are what the designer did on
 *  top of it. Keeping them separate means re-reading the brief never discards
 *  the work, and every edit can be shown, undone and exported as a diff
 *  against what the brief asked for. */
import { createContext, useContext } from 'react';
import type { Kind } from '../model/media';
import type { UserMedia } from '../model/userMedia';
import type { Item } from '../model/media';

export type Move = { dx: number; dy: number };
export type Pic = { zone?: string; url?: string; x: number; y: number;
                    scale: number; brightness: number; contrast: number; saturate: number;
                    hidden?: boolean };

export const FRESH_PIC: Pic =
  { x: 50, y: 50, scale: 1, brightness: 1, contrast: 1, saturate: 1 };

/** The colour on one element: its type, its fill, or both.
 *
 *  Without this a charcoal pill on a charcoal panel cannot be separated by
 *  anyone -- not the designer and not a proposed fix -- and contrast, which is
 *  the rule assets fail most often, has no remedy at all inside the studio. */
export type Paint = { fg?: string; bg?: string };

export type GraphicLayer = {
  id: string;
  src: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
};
export type CustomTextLayer = { id: string; text: string; left: number; top: number;
  width: number; height: number };

export type Edits = {
  text: Record<string, string>;
  paint: Record<string, Paint>;
  move: Record<string, Move>;
  /** A multiplier on the run's own size, so the design keeps its scale and
   *  the designer still gets the last word on any one line. */
  size: Record<string, number>;
  pic: Record<string, Pic>;
  /** Optional for older campaigns; a manual overlay never rewrites a board. */
  graphics?: Record<string, GraphicLayer[]>;
  customText?: Record<string, CustomTextLayer[]>;
  customBackground?: Record<string, string>;
};

export const EMPTY: Edits = { text: {}, paint: {}, move: {}, size: {}, pic: {},
  graphics: {}, customText: {}, customBackground: {} };

export type Api = {
  edits: Edits;
  library: UserMedia[];
  mode: 'preview' | 'edit';
  selected: string | null;
  select: (id: string | null) => void;
  setText: (id: string, v: string) => void;
  nudge: (id: string, dx: number, dy: number) => void;
  resize: (id: string, scale: number) => void;
  setPic: (id: string, p: Partial<Pic>) => void;
  setPaint: (id: string, p: Paint) => void;
  addLibrary: (item: { name: string; kind: Kind; file: string; tags: string[] }) => Promise<UserMedia>;
  retagLibrary: (id: string, tags: string[]) => Promise<void>;
  removeLibrary: (id: string) => Promise<void>;
  addGraphic: (assetId: string, item: Item, size: [number, number], custom?: boolean) => string;
  removeGraphic: (assetId: string, layerId: string) => void;
  addCustomText: (assetId: string, size: [number, number]) => string;
  removeCustomText: (assetId: string, layerId: string) => void;
  setCustomBackground: (assetId: string, colour: string) => void;
  reset: (id: string) => void;
  resetAll: () => void;
};

export const Ctx = createContext<Api>(null as unknown as Api);
export const useEdits = () => useContext(Ctx);

export const textOf = (e: Edits, id: string, fallback: string) =>
  e.text[id] !== undefined ? e.text[id] : fallback;
export const moveOf = (e: Edits, id: string): Move => e.move[id] ?? { dx: 0, dy: 0 };
export const sizeOf = (e: Edits, id: string): number => e.size[id] ?? 1;
export const picOf = (e: Edits, id: string): Pic => e.pic[id] ?? FRESH_PIC;
export const paintOf = (e: Edits, id: string): Paint => e.paint?.[id] ?? {};
