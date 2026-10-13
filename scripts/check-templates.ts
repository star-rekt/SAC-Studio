/** The schema gate, as a program. Exits 1 and names the field. */
import { SPECS, faults, coverageOf } from '../src/templates/spec';

let bad = 0;
for (const s of SPECS) {
  const f = faults(s);
  if (f.length) { bad += f.length; for (const x of f) console.error('  ' + x); }
  const open = coverageOf(s).filter(c => !c.declared).map(c => c.klass);
  if (open.length) bad += open.length;
  console.log(`${s.id.padEnd(12)} ${Object.keys(s.classes).length}/7 classes`
    + (open.length ? `  falling through to bar: ${open.join(' ')}` : '  complete'));
}
if (bad) { console.error(`\n${bad} fault(s)`); process.exit(1); }
console.log('\ntemplates clean');
