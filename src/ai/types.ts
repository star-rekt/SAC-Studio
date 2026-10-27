/** What the connector returns. Claims, not facts -- everything here has been
 *  through a model and is reconciled against the deterministic parser before
 *  the studio acts on any of it. */
import type { Angle } from '../model/copy';

export type AiSend = {
  id: string; label: string; angle: Angle; leadOn: string;
  uptoPercent: string; showStack: boolean; pursuit: string; because: string;
  /** Only copy actually stated in the brief; absent lines stay empty.
   *  eyebrow/marquee/qualifier used to be template vocabulary only
   *  ('EXTRA', 'Shop Now', 'NO CODE NEEDED', ...) no matter what the brief
   *  said -- now a brief that states its own urgency line, banner line or
   *  fine-print qualifier can actually get it printed. */
  copy?: { headline?: string; body?: string; cta?: string; subject?: string; preview?: string;
    eyebrow?: string; marquee?: string; qualifier?: string };
  /** Authored send-level direction, not copy to print on the artwork. */
  tb?: string;
  designDirection?: string;
  brands?: string[];
  categories?: string[];
};

export type AiParse = {
  name: string; type: string; offer: string; percent: string; code: string;
  noCode: boolean; duration: string; pursuit: string;
  dates?: string;
  creativeDirection?: string;
  imageryDirection?: string;
  brands?: string[];
  keyMessages?: string[];
  /** Which deliverables the brief asks for, as format names. */
  assets?: string[];
  /** Counts come from the brief, not the examples on the selected board. */
  deliverables?: { format: string; count: number; evidence: string; messages?: string[] }[];
  categories: string[]; phases: string[];
  concepts: { name: string; headline: string }[];
  sends: AiSend[];
};

export type Issue = {
  /** Which numbered rule in server/rules.md it breaks. */
  rule?: number;
  severity: 'high' | 'medium' | 'low';
  what: string; where: string; fix: string;
};

/** One rule, answered. The checklist is the verdict -- 'contrast: marginal'
 *  was an opinion, 'rule 5 fails because the logos sit on pale sagebrush' is
 *  a finding against something written down. */
export type RuleCheck = { n: number; pass: boolean; note: string };

export type Verdict = {
  verdict: 'ship' | 'fix' | 'reject';
  reads: string;
  /** Where the photograph's subject is, which is what rule 3 turns on. */
  subject?: string;
  hierarchy: string;
  rules?: RuleCheck[];
  issues: Issue[];
};

export type Health = { claude: string | null; chrome: string | null; rules?: number };

/** One change to one element. Deliberately only what `Edits` can already
 *  express -- a proposal the studio cannot carry out is not a fix. */
export type Op = {
  id: string;
  move?: { dx: number; dy: number };
  size?: number;
  text?: string;
  /** Pictures only: pan and zoom within the same box. Rule 7 -- moving the
   *  subject is often easier than moving everything else. */
  pic?: { x: number; y: number; scale: number };
  /** Type colour, fill colour, or both. The answer to a contrast failure. */
  colour?: { fg?: string; bg?: string };
  why: string;
};

export type Fixes = {
  ops: Op[];
  /** What a move, a resize or a retype cannot answer, and what it would take.
   *  This is the honest half: most review notes are design changes. */
  cannotFix: { problem: string; needs: string }[];
  /** Operations naming an element that is not on the asset, dropped. */
  dropped: number;
  png: string;
  ms: number;
};
