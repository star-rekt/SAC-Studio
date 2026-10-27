/** The template registry.
 *
 *  Adding a template is adding a FILE to ./specs and a line to the list
 *  below. It is not editing a thousand-line object that four people are
 *  editing at once, which is where this was heading: two templates fitted in
 *  one file and four will not.
 *
 *  Every spec is checked against the vocabulary as the module loads, and a
 *  malformed one stops the studio with the field named. A template is written
 *  by a developer, so a wrong value is a typing mistake, not user input — it
 *  should fail at once rather than render an asset slightly wrong and leave
 *  nobody sure which of four templates said so.
 */
import { faults, BAR, classOf, type TemplateSpec, type Outlook } from './schema';

import sc26_0021 from './specs/sc26_0021';
import sc26_0058 from './specs/sc26_0058';
import sc26_0060 from './specs/sc26_0060';
import sc26_bump2 from './specs/sc26_bump2';

export * from './schema';

export const SPECS: TemplateSpec[] = [
  sc26_0021,
  sc26_0058,
  sc26_0060,
  sc26_bump2,
];

const broken = SPECS.flatMap(faults);
if (broken.length) {
  throw new Error(
    `${broken.length} fault(s) in the templates:\n  ` + broken.join('\n  '));
}

const seen = new Set<string>();
for (const s of SPECS) {
  for (const id of [s.id, ...(s.aliases ?? [])]) {
    if (seen.has(id)) throw new Error(`two templates share the id or alias "${id}"`);
    seen.add(id);
  }
}

export const specById = (id: string) =>
  SPECS.find(s => s.id === id || s.aliases?.includes(id));

/** The outlook in play for a format: its class, with the template's own
 *  departure for that one format laid over it. */
export const outlookFor = (spec: TemplateSpec, format: string): Outlook => {
  const base = spec.classes[classOf(format)] ?? spec.classes.bar ?? BAR;
  const over = spec.formats?.[format];
  return over ? { ...base, ...over } : base;
};

/** The accent in play for a format: the class's own, or the template's. */
export const accentFor = (spec: TemplateSpec, format: string): string =>
  outlookFor(spec, format).accent ?? spec.accent;
