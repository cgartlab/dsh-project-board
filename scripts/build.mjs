// Build the plugin's artifacts from src/:
//   src/index.ts      -> client.js  (single-file client bundle the harness injects)
//   src/host-entry.ts -> index.js   (host half; ESM, no-op)
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.name} ${pkg.version} — generated from src/ by scripts/build.mjs; do not edit */`;

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'client.js',
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'info'
});

await build({
  entryPoints: ['src/host-entry.ts'],
  outfile: 'index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'info'
});
