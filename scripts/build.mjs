// Build the plugin's single client bundle: src/index.ts -> client.js
// The harness loads client.js as a plain script that calls window.__ModuleLoader__.load().
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
