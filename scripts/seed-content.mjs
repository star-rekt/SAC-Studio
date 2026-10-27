// Prepares content-seed/: a shallow clone of the mirror repo's pushed state,
// bundled into the installer so a fresh install has a real git working copy
// on first run (desktop/main.cjs then keeps it current with `git fetch`).
// Requires the build artifacts this packaging run produced to already be
// committed and pushed to the mirror -- this clones what's on the remote,
// not the local working tree.
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const REMOTE = process.env.SAC_STUDIO_MIRROR_URL ?? 'https://github.com/star-rekt/SAC-Studio.git';
const BRANCH = 'main';
const SEED_DIR = 'content-seed';

await rm(SEED_DIR, { recursive: true, force: true });
execFileSync('git', ['clone', '--depth', '1', '--single-branch', '--branch', BRANCH, REMOTE, SEED_DIR],
  { stdio: 'inherit' });
console.log(`content-seed ready from ${REMOTE}#${BRANCH}`);
