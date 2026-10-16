/** Email heroes measured on the Bump board. Five layouts, one editable React
 *  vocabulary. Only photographs and decorative art are reference exports. */
import type { Doc } from '../../model/compose';
import { copyFor } from '../../model/copy';
import { Editable } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { useEdits } from '../../edit/store';
import { emailVariant } from '../../templates/variants';
import { stack } from '../../fonts';
import { BrandMark } from './BrandMark';

const green = '#79AC41', ink = '#333333';
const display = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: stack('Quiet Sans'), fontSize: size, fontWeight: 800,
  letterSpacing: -size * .01, lineHeight: .91, color: ink, ...extra,
});
const at = (left: number, top: number, width?: number): React.CSSProperties =>
  ({ position: 'absolute', left, top, width });
function Image({ id, src, x, y, w, h, zone }: {
  id: string; src: string; x: number; y: number; w: number; h: number;
  zone: Doc['sends'][number]['photo'];
}) {
  const api = useEdits();
  const edit = api.edits.pic[`${id}/photo`];
  const swapped = !!(edit?.url || edit?.zone);
  const stepped = src.includes('bump-window');
  // The board exported the initial photo and its contour as one transparent
  // PNG. Once replaced, use that export only as an alpha mask so the chosen
  // photo stays editable without turning the stepped frame into a rectangle.
  const mask: React.CSSProperties = swapped && stepped ? {
    maskImage: `url(${src})`, maskSize: '100% 100%', maskRepeat: 'no-repeat',
    filter: 'drop-shadow(0 0 3px #79AC41)',
  } : {};
  return <Picture id={`${id}/photo`} zone={zone} initialSrc={src}
    style={{ ...at(x, y, w), height: h, ...mask }} />;
}

function Button({ id, x, y, w = 470, text = 'Shop Now' }: {
  id: string; x: number; y: number; w?: number; text?: string;
}) {
  return <Editable id={id} style={{ ...at(x, y, w), height: 120, display: 'grid',
    placeItems: 'center', borderRadius: 30, background: ink, color: '#fff',
    fontFamily: stack('Quiet Sans'), fontSize: 64, fontWeight: 700,
    textAlign: 'center' }}>{text}</Editable>;
}

function Brands({ id, top, names }: { id: string; top: number; names?: string[] }) {
  const logos: [string, number, number][] = [
    ['bump-tnf.svg', 80, 145], ['bump-patagonia.svg', 344, 210],
    ['bump-mhw.svg', 704, 175],
  ];
  return <div style={{ ...at(0, top, 1200), height: 95 }}>
    {logos.map(([file, x, w], n) => <BrandMark key={file} id={`${id}/brand/${n}`}
      name={names?.[n]} fallback={`/reference/${file}`}
      style={{ ...at(x, 8, w), height: 76, objectFit: 'contain' }} />)}
    <Editable id={`${id}/more`} style={{ ...at(986, 25, 160), ...display(31) }}>&amp; More</Editable>
  </div>;
}

function Offer({ id, x, y, lead, offer, size = 162, align = 'left' }: {
  id: string; x: number; y: number; lead: string; offer: string;
  size?: number; align?: 'left' | 'right' | 'center';
}) {
  const actual = Math.min(size, Math.round((1120 - x) / (Math.max(lead.length, offer.length) * .48)));
  return <Editable id={`${id}/offer`} as="h1" style={{ ...at(x, y,
    align === 'right' ? 1120 - x : undefined), ...display(actual,
    { margin: 0, textAlign: align, whiteSpace: 'pre-line', lineHeight: .685 }) }}>{`${lead}\n${offer}`}</Editable>;
}
function Code({ id, x, y, text, size = 100 }: {
  id: string; x: number; y: number; text: string; size?: number;
}) {
  const m = text.match(/^CODE\s+(.+)$/i);
  const actual = Math.min(size, Math.round((1160 - x) / (Math.max(text.length, 1) * .62)));
  return <div style={{ ...at(x, y), whiteSpace: 'nowrap', fontFamily: stack('Quiet Sans'),
    fontSize: actual, lineHeight: 1, color: ink }}>
    {m ? 'CODE ' : ''}<Editable id={`${id}/code`} as="span"
      style={{ color: green, fontWeight: 700 }}>{m ? m[1] : text}</Editable>
  </div>;
}
function BodyCopy({ id, text, cta, y, buttonY, width = 1000 }: {
  id: string; text: string; cta: string; y: number; buttonY: number; width?: number;
}) {
  return <>
    <Editable id={`${id}/body`} style={{ ...at((1200-width)/2, y, width),
      fontFamily: stack('Quiet Sans'), fontSize: 48, lineHeight: 1.22,
      color: ink, textAlign: 'center' }}>{text}</Editable>
    <Button id={`${id}/cta2`} x={365} y={buttonY} text={cta} />
  </>;
}

export function BumpEmailHero({ doc, i, variant }: { doc: Doc; i: number; variant: string }) {
  const s = doc.sends[i], id = `${s.id}/bump-email`;
  const design = emailVariant('sc26_0060', variant, i)!;
  const copy = copyFor(s, doc.brief);
  const ticket = copy.ticket;
  const offer = { lead: ticket.lead, offer: ticket.offer };
  const code = ticket.foot;
  const urgency = /\bENDS|FINAL|LAST\b/i.test(copy.marquee) ? copy.marquee
    : doc.brief.duration || copy.marquee || 'LIMITED TIME';
  const urgencySize = (size: number) => Math.min(size, Math.round(445 / (urgency.length * .72)));
  const noCode = doc.brief.noCode;
  const base: React.CSSProperties = { width: 1200, height: design.height, position: 'relative',
    overflow: 'hidden', backgroundColor: '#f5ecdf',
    backgroundImage: 'linear-gradient(#f5ecdfaa,#f5ecdfaa),url(/reference/bump-paper.png)',
    backgroundSize: 'cover,612px 408px' };
  const v = design.id;
  return <div className="sheet" style={base} data-design-variant={v}>
    {v === 'four-days' && <>
      <Image id={id} src="/reference/bump-window.png" x={511} y={70} w={618} h={623} zone={s.photo} />
      <Editable id={`${id}/urgency`} style={{ ...at(79, 70), ...display(urgencySize(53),
        { color: green, letterSpacing: 5 }) }}>{urgency}</Editable>
      <Offer id={id} x={77} y={147} {...offer} />
      {!noCode && <Code id={id} x={77} y={414} text={code} />}
      <Button id={`${id}/cta`} x={67} y={noCode ? 490 : 571} text={copy.cta} />
      <Brands id={id} top={752} names={doc.brief.brands} />
      <BodyCopy id={id} text={copy.body} cta={copy.cta} y={894} buttonY={1188} />
    </>}
    {v === 'ends-soon' && <>
      <Image id={id} src="/reference/bump-window-ends-soon.png" x={76} y={55} w={506} h={574} zone={s.photo} />
      <Editable id={`${id}/urgency`} style={{ ...at(204, 32), ...display(urgencySize(51),
        { color: '#fff', background: green, padding: '4px 10px', borderRadius: 9 }) }}>{urgency}</Editable>
      <Offer id={id} x={388} y={86} size={160} align="right" {...offer} />
      {!noCode && <Code id={id} x={388} y={359} size={92} text={code} />}
      <Button id={`${id}/cta`} x={650} y={noCode ? 420 : 495} text={copy.cta} />
      <Brands id={id} top={685} names={doc.brief.brands} />
      <BodyCopy id={id} text={copy.body} cta={copy.cta} y={855} buttonY={1163} />
    </>}
    {v === 'ends-tomorrow' && <>
      <div style={{ ...at(67, 55, 1066), height: 883, overflow: 'hidden', border: `7px solid ${green}`,
        borderRadius: 30, boxSizing: 'border-box' }}>
        <Image id={id} src="/reference/bump-leaves.jpg" x={0} y={0} w={1052} h={869} zone={s.photo} />
      </div>
      <Media id={`${id}/panel/mark`} src="/graphics/panel-step.svg" alt="Offer panel"
        title="Click to recolour, resize or swap the panel shape from the library"
        style={{ position: 'absolute', left: 219, top: 178, width: 762, height: 640 }} />
      <Editable id={`${id}/urgency`} style={{ ...at(340, 214), ...display(urgencySize(49),
        { color: green, letterSpacing: 3 }) }}>{urgency}</Editable>
      <Offer id={id} x={313} y={292} size={139} {...offer} />
      {!noCode && <Code id={id} x={260} y={535} size={82} text={code} />}
      <Button id={`${id}/cta`} x={383} y={noCode ? 590 : 657} w={434} text={copy.cta} />
      <Brands id={id} top={967} names={doc.brief.brands} />
      <BodyCopy id={id} text={copy.body} cta={copy.cta} y={1100} buttonY={1340} />
    </>}
    {v === 'ends-today' && <>
      <Image id={id} src="/reference/bump-window-ends-today.png" x={50} y={45} w={1098} h={1140} zone={s.photo} />
      <Editable id={`${id}/urgency`} style={{ ...at(76, 295), ...display(urgencySize(54),
        { color: green, letterSpacing: 5 }) }}>{urgency}</Editable>
      <Offer id={id} x={65} y={374} size={167} {...offer} />
      {!noCode && <Code id={id} x={65} y={648} size={103} text={code} />}
      <Button id={`${id}/cta`} x={76} y={noCode ? 728 : 809} w={482} text={copy.cta} />
      <BodyCopy id={id} text={copy.body} cta={copy.cta} y={1247} buttonY={1478} width={1044} />
    </>}
    {v === 'last-chance' && <>
      <Media id={`${id}/mark`} src="/reference/bump-last-chance-lines.svg" alt="Last-chance line art"
        style={{ ...at(50, 50, 1094), height: 1222 }} />
      <Editable id={`${id}/urgency`} style={{ ...at(724, 100), ...display(urgencySize(53),
        { color: green, letterSpacing: 3 }) }}>{copy.angle === 'ends-today' ? 'LAST CHANCE' : urgency}</Editable>
      <Offer id={id} x={78} y={342} size={158} {...offer} />
      {!noCode && <Code id={id} x={78} y={641} size={91} text={code} />}
      <Editable id={`${id}/ends`} style={{ ...at(78, 753), ...display(54,
        { letterSpacing: 3 }) }}>{copy.angle === 'ends-today' ? 'ENDS TODAY' : urgency}</Editable>
      <Button id={`${id}/cta`} x={644} y={1120} text={copy.cta} />
    </>}
  </div>;
}
