const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/* Dictionaries live in the TypeScript sources; the bundle is generated, so read the truth
   from src/ and then prove the built artifact really embeds every key. */
function readDictionary(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const keys = new Set();
  const pattern = /'([a-zA-Z][\w.]*)'\s*:/g;
  let match;
  while ((match = pattern.exec(source))) keys.add(match[1]);
  return keys;
}

const zhKeys = readDictionary('src/i18n/zh.ts');
const enKeys = readDictionary('src/i18n/en.ts');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sources = walk(path.join(root, 'src'), []);
const sourceText = sources.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

/* Direct t('key') calls. */
const used = new Set();
const usePattern = /\bt\('([^']+)'/g;
let match;
while ((match = usePattern.exec(sourceText))) used.add(match[1]);

/* Keys referenced indirectly, e.g. toggleRow('notify', 'enabled', 'settings.notifyEnabled'). */
const NON_I18N_LITERALS = new Set(['settings.section']);
const indirect = new Set();
const indirectPattern = /'([a-z][a-zA-Z]*\.[a-zA-Z][\w.]*)'/g;
while ((match = indirectPattern.exec(sourceText))) {
  const key = match[1];
  if (NON_I18N_LITERALS.has(key)) continue;
  if (key.endsWith('.')) continue;
  if (/\.(png|jpg|jpeg|gif|webp|svg|json|js|css|html|yaml|yml)$/.test(key)) continue;
  if (zhKeys.has(key) || enKeys.has(key)) indirect.add(key);
  else if (/^(settings|status|col|time|toast|hud|nav|panel|view|kind|card|count|notif|session|menu|rename|preset|rightTab|appearance|board)\.[a-zA-Z]/.test(key)) {
    console.error('unknown i18n key used as a literal: ' + key);
    process.exitCode = 1;
  }
}

const missingZh = [...used].filter((key) => !zhKeys.has(key));
const missingEn = [...used].filter((key) => !enKeys.has(key));
const onlyZh = [...zhKeys].filter((key) => !enKeys.has(key));
const onlyEn = [...enKeys].filter((key) => !zhKeys.has(key));

const bundlePath = path.join(root, 'client.js');
const bundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8') : null;
const missingFromBundle = bundle ? [...zhKeys].filter((key) => !bundle.includes("'" + key + "'") && !bundle.includes('"' + key + '"')) : [];

console.log('used keys: ' + used.size + ', indirect: ' + indirect.size + ', zh keys: ' + zhKeys.size + ', en keys: ' + enKeys.size);
if (missingZh.length) console.error('missing zh: ' + missingZh.join(', '));
if (missingEn.length) console.error('missing en: ' + missingEn.join(', '));
if (onlyZh.length) console.error('only in zh: ' + onlyZh.join(', '));
if (onlyEn.length) console.error('only in en: ' + onlyEn.join(', '));
if (!bundle) console.error('client.js is missing; run `npm run build` first');
if (missingFromBundle.length) console.error('dictionary keys missing from the built client.js (run `npm run build`): ' + missingFromBundle.slice(0, 12).join(', '));
if (missingZh.length || missingEn.length || onlyZh.length || onlyEn.length || !bundle || missingFromBundle.length) process.exitCode = 1;
