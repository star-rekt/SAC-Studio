/** The file the studio exports, and the only contract between the two.
 *
 *  Everything travels inside it: the layers, the photographs as base64, the
 *  vector marks as SVG. That is what lets the plugin ask for no network
 *  access at all -- it can be shared rather than only run from a checkout,
 *  and a campaign can be mailed, archived, or opened next year.
 */
/** The shape a slot is cut to, where it is not a rectangle. */
export type Clip = { path: string; view: [number, number];
                     stroke?: string; strokeWidth?: number };

/** `parent`: the clip layer (its `n`) this layer is drawn inside and cut by. */
export type Layer = ({ parent?: number } & (
  | { n: number; name: string; group?: string; type: 'clip';
      /** An element that cuts what's inside it. Its true box and turn, its
       *  corners, and its outline when it isn't a rectangle. */
      x: number; y: number; width: number; height: number; radius?: number; rotation?: number;
      path?: { path: string; view: [number, number] }; stroke?: string; strokeWidth?: number }
  | { n: number; name: string; group?: string; type: 'image'; src: string;
      x: number; y: number; width: number; height: number; radius?: number; rotation?: number;
      /** The shape the box is cut to, where it is not a rectangle. Without it
       *  the signature window arrives in Figma as a rectangular photograph
       *  and the staircase that makes the design is simply gone. */
      clip?: Clip;
      /** CSS brightness() the studio draws it with: a white logo shown charcoal. */
      brightness?: number;
      draw: { x: number; y: number; width: number; height: number } }
  | { n: number; name: string; group?: string; type: 'rect'; fill: string;
      opacity?: number; radius?: number; rotation?: number;
      /** A mark from the graphics library, cut to its own path rather than
       *  its bounding box. */
      clip?: { path: string; view: [number, number] };
      x: number; y: number; width: number; height: number }
  | { n: number; name: string; group?: string; type: 'text'; text: string;
      font: string; weight: number; size: number; lineHeight: number;
      letterSpacing: number; colour: string; align: string; underline?: boolean;
      rotation?: number;
      /** Ranges of `text` set differently (a paragraph's bold green code word). */
      runs?: { from: number; to: number; weight?: number; colour?: string }[];
      x: number; y: number; width: number; height: number }));

export type Variant = {
  id: string; name: string; width: number; height: number; layers: Layer[];
};

export type Doc = {
  schema: 'sac-studio/1';
  project: { id: string; name: string; revision: string };
  fontsNeeded: string[];
  variants: Variant[];
  /** src -> base64. Decode in the plugin to avoid a huge number-array message. */
  assets: Record<string, string>;
  /** src -> svg source, for marks that should arrive as editable paths. */
  vectors: Record<string, string>;
};
