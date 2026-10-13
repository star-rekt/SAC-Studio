/** Both halves of the studio, from one command, dying together.
 *
 *  The AI connector is a separate process because it shells out to `claude`
 *  and Vite cannot, but a designer should not have to know that -- and two
 *  terminals is how you end up with an app whose Claude buttons mysteriously
 *  do nothing. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const kids = [
  spawn(process.execPath, ['server/index.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))],
    { stdio: 'inherit' }),
];

const stop = () => { for (const k of kids) k.kill('SIGTERM'); };
for (const k of kids) k.on('exit', code => { stop(); process.exit(code ?? 0); });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
