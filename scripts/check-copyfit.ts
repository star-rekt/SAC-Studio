/** Copy fit's maths, checked without a browser: a contracted field turns
 *  yellow exactly when fitText starts shrinking it and red exactly past a
 *  10% shrink; a fixed line is red only past its room; a block only past
 *  its designed line count.
 *
 *  Exits 1 and names every failure, the same contract every other
 *  `check:*` script keeps. */
import { fitText } from '../src/model/textContracts.ts';
import { contractFit, lineFit, blockFit, wrapLines } from '../src/model/copyFit.ts';

const faults: string[] = [];
const expect = (ok: boolean, what: string) => { if (!ok) faults.push(what); };
const text = (n: number) => 'X'.repeat(n);

// 1. Contracted: green exactly while fitText draws it at its designed size.
const opts = { widthBudget: 420, fontMax: 49, fontMin: 20, charFactor: 0.55 };
const { contract } = fitText('Shop Now', 'hero.cta', opts);
const at = (n: number) => contractFit(text(n), contract);
const ideal = at(1).ideal, max = at(1).max;
expect(ideal === Math.floor(420 / (49 * 0.55)), `ideal ${ideal}`);
expect(at(ideal).status === 'ok' && fitText(text(ideal), 'k', opts).fontSize === 49, `at ideal (${ideal}) should be green at full size`);
expect(at(ideal + 1).status === 'contract' && fitText(text(ideal + 1), 'k', opts).fontSize < 49,
  `one over ideal should be yellow and actually shrink`);
expect(at(max).status === 'contract', `at max (${max}) should still be yellow`);
expect(at(max + 1).status === 'wrap', `one over max should be red`);
expect(fitText(text(max), 'k', opts).fontSize >= Math.floor(49 * 0.9), `at max the size is within 10%`);

// 1b. Two lines in one field (EXTRA / 20% OFF): judged by the worse line.
expect(contractFit(`${text(3)}\n${text(max + 1)}`, contract).status === 'wrap', 'a long second line makes the field red');
expect(contractFit(`${text(3)}\n${text(ideal)}`, contract).status === 'ok', 'two fitting lines are green');

// 2. A minimum size above the 10% line caps the yellow range there.
const tight = fitText('x', 'k', { widthBudget: 400, fontMax: 40, fontMin: 38, charFactor: 0.5 }).contract;
expect(contractFit(text(1), tight).max === Math.floor(400 / (38 * 0.5)), 'min size above 90% caps max');

// 3. Measured contracts use the real width.
const measured = { key: 'm', budget: 300, designSize: 40, minSize: 20, font: { family: 'x', weight: 800 } };
const perChar = (s: string, size: number) => s.length * size * 0.6; // 24px per char at 40
expect(contractFit(text(12), measured, perChar).status === 'ok', 'measured 12 chars (288px) fits');
expect(contractFit(text(13), measured, perChar).status === 'contract', 'measured 13 chars (312px) contracts');
expect(contractFit(text(14), measured, perChar).status === 'wrap', 'measured 14 chars (336px) is past 10%');

// 4. Fixed single line.
expect(lineFit(text(10), 200, 200).status === 'ok', 'line exactly filling its room is green');
expect(lineFit(text(11), 220, 200).status === 'wrap' && lineFit(text(11), 220, 200).ideal === 10, 'line past its room is red, ideal 10');

// 5. Fixed block: lines against the design's own line count.
const m = (s: string) => s.length * 10;
expect(wrapLines('aaaa bbbb cccc', 90, m) === 2, 'wraps "aaaa bbbb" | "cccc" at 90px');
expect(wrapLines('one\ntwo', 1000, m) === 2, 'hard break counts');
expect(blockFit('x', 2, 2, 9).status === 'ok' && blockFit('x', 3, 2, 9).status === 'wrap', 'block red past design lines');

if (faults.length) {
  console.error(`copyfit: ${faults.length} failure(s)\n - ${faults.join('\n - ')}`);
  process.exit(1);
}
console.log('copyfit clean: contract boundaries match fitText, measured fields, lines, blocks');
