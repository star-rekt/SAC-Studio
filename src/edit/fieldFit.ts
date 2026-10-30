/** Copy fit on screen: whether a text field's copy fits as drawn -- green,
 *  yellow (contracts, up to 10%) or red (past 10%, wraps, or overflows) --
 *  measured from the element the asset drew (the Build window's copy list). */
import type { Contract } from '../model/textContracts';
import { contractFit, lineFit, blockFit, wrapLines, type FieldFit } from '../model/copyFit';

let canvas: HTMLCanvasElement | null = null;
const context = () => (canvas ??= document.createElement('canvas')).getContext('2d')!;
const px = (v: string) => parseFloat(v) || 0;

/** One field's fit, from the element as the stage drew it. */
export function measureField(el: HTMLElement, text: string): FieldFit {
  const fitted = el.closest<HTMLElement>('[data-fit]');
  const ctx = context();
  if (fitted) {
    const c = JSON.parse(fitted.dataset.fit!) as Contract;
    // Parts of one fitted line (CODE and its value) may each carry the same
    // contract: the line is all of them together.
    const peers = fitted.parentElement
      ? [...fitted.parentElement.children].filter(e => (e as HTMLElement).dataset?.fit === fitted.dataset.fit) : [fitted];
    const whole = fitted === el && peers.length < 2 ? text : peers.map(e => e.textContent ?? '').join('');
    const upper = getComputedStyle(fitted).textTransform === 'uppercase';
    return contractFit(whole, c, c.font ? (s, size) => {
      ctx.font = `${c.font!.weight} ${size}px ${c.font!.family}`;
      return ctx.measureText(upper ? s.toUpperCase() : s).width;
    } : undefined);
  }
  const cs = getComputedStyle(el);
  // An inline run (CODE / its value) has no box of its own: its line is its parent's.
  const host = cs.display === 'inline' && el.parentElement ? el.parentElement : el;
  const hs = getComputedStyle(host);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const spacing = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
  const transform = (s: string) => cs.textTransform === 'uppercase' ? s.toUpperCase() : s;
  const width = (s: string) => ctx.measureText(transform(s)).width + spacing * s.length;
  if (/nowrap|^pre$/.test(hs.whiteSpace) || host !== el) {
    const parent = host.offsetParent as HTMLElement | null;
    const room = parent ? parent.clientWidth - host.offsetLeft : host.clientWidth;
    const others = host !== el ? width(host.textContent ?? '') - width(el.textContent ?? '') : 0;
    return lineFit(text, width(text), Math.max(1, room - others));
  }
  const inner = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const perChar = width(text) / Math.max(1, text.length) || 1;
  const designLines = wrapLines(el.dataset.default ?? text, inner, width);
  return blockFit(text, wrapLines(text, inner, width), designLines, Math.floor(inner / perChar));
}
