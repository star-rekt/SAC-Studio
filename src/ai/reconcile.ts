/** Putting the model's reading of a brief next to the parser's, with the
 *  source used for each disagreement shown to the designer.
 *
 *  The two are good at opposite things. `brief.ts` is exact on anything with a
 *  shape -- E-numbers, percentages, a code, a date range -- and it can say how
 *  many sends the brief DECLARES, which is a count the model has no privileged
 *  access to. The model is the only one of the two that can read 'the bundle
 *  is the plus' and know that means a stacked lockup, and the only one that
 *  does not break the week a marketer writes 'wraps up Sunday' instead of
 *  'ends today'.
 *
 *  So neither validates the other on everything. Each leads where it is
 *  strongest; any disagreement remains visible for review.
 */
import { readBrief } from '../model/brief';
import { readSends } from '../model/sections';
import { copyFor } from '../model/copy';
import type { AiParse } from './types';

export type State = 'agree' | 'differ' | 'only-code' | 'only-claude';

export type Check = {
  field: string;
  code: string;
  claude: string;
  state: State;
  /** Which reading the studio uses when they disagree, and why. */
  wins?: 'code' | 'claude';
  note?: string;
};

export type Report = {
  checks: Check[];
  agree: number;
  differ: number;
  /** The one hard check: the brief declares its own send count, so a parse
   *  that does not produce that many has provably missed something. */
  sends: { declared: number; code: number; claude: number; missing: string[] };
};

const norm = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
const show = (v: unknown) =>
  Array.isArray(v) ? (v.length ? v.join(', ') : '—')
  : v === '' || v == null ? '—' : String(v);

function row(field: string, code: unknown, claude: unknown,
             wins: 'code' | 'claude', note?: string): Check {
  const c = show(code), a = show(claude);
  const state: State =
    norm(c) === norm(a) ? 'agree'
    : c === '—' ? 'only-claude'
    : a === '—' ? 'only-code'
    : 'differ';
  return state === 'agree' ? { field, code: c, claude: a, state }
                           : { field, code: c, claude: a, state, wins, note };
}

export function reconcile(ai: AiParse, briefText: string): Report {
  const b = readBrief(briefText, '', briefText);
  const sends = readSends(briefText);

  const checks: Check[] = [
    // Shaped facts: the parser is exact on these and a model that disagrees is
    // the one to doubt.
    row('campaign type', b.type, ai.type, 'code', 'matched against the reference boards'),
    row('extra %', b.percent, ai.percent, 'claude',
      'Claude wins when the brief explicitly says extra N%; brand markdown is not the campaign discount'),
    row('code', b.noCode ? 'no code' : b.code, ai.noCode ? 'no code' : ai.code, 'code'),
    row('dates', b.duration, ai.duration, 'code'),
    row('date range', b.dates, ai.dates, 'claude'),
    row('named brands', b.brands, ai.brands, 'claude'),
    row('creative direction', b.creativeDirection, ai.creativeDirection, 'claude'),
    row('phases', b.phases, ai.phases, 'code'),
    row('categories', `${b.categories.length} tiles`, `${ai.categories.length} tiles`, 'code',
        'the tile count sets how many CPLP assets get built'),
    // Written facts: the parser guesses these from keywords and the model reads
    // them, so the model leads and the parser is the sanity check.
    row('sale name', b.name, ai.name, 'claude'),
    row('headline offer', b.offer, ai.offer, 'claude'),
    row('concepts', b.concepts.map(c => c.name), ai.concepts.map(c => c.name), 'claude'),
  ];

  for (const s of sends) {
    const mine = copyFor(s, b).angle;
    const theirs = ai.sends.find(x => x.id === s.id);
    checks.push(row(`${s.id} angle`, mine, theirs?.angle ?? '', 'claude',
      theirs?.because));
    const code = b.sends.find(x => x.id === s.id)?.pursuit ?? '';
    if (code || theirs?.pursuit)
      checks.push(row(`${s.id} imagery`, code, theirs?.pursuit ?? '', 'claude',
        'decides which photograph this send gets'));
  }

  // A send the parser never saw at all. This is the failure the plugin shipped
  // with for a week -- seven sends in the brief, one asset out -- so it is
  // called out separately rather than buried in the rows above.
  for (const a of ai.sends)
    if (!sends.some(s => s.id === a.id))
      checks.push({ field: `${a.id}`, code: '—', claude: a.label || a.angle,
        state: 'only-claude', wins: 'claude',
        note: 'the parser did not find this send' });

  return {
    checks,
    agree: checks.filter(c => c.state === 'agree').length,
    differ: checks.filter(c => c.state !== 'agree').length,
    sends: { declared: b.sendsDeclared, code: sends.length,
             claude: ai.sends.length, missing: b.sendsMissing },
  };
}
