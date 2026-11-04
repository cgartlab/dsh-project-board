const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
const lines = source.split('\n');

function block(startMarker) {
  const start = lines.findIndex((line) => line.includes(startMarker));
  if (start < 0) throw new Error('missing dictionary: ' + startMarker);
  const end = lines.findIndex((line, index) => index > start && line.trim() === '};');
  if (end < 0) throw new Error('unterminated dictionary: ' + startMarker);
  return { start, end };
}

const zhBlock = block('const zh = {');
const enBlock = block('const en = {');

function keysOf(range) {
  const text = lines.slice(range.start + 1, range.end).join('\n');
  const keys = new Set();
  const pattern = /'([a-zA-Z][\w.]*)'\s*:/g;
  let match;
  while ((match = pattern.exec(text))) keys.add(match[1]);
  return keys;
}

const zhKeys = keysOf(zhBlock);
const enKeys = keysOf(enBlock);
const used = new Set();
const usePattern = /\bt\('([^']+)'/g;
let match;
while ((match = usePattern.exec(source))) used.add(match[1]);

const missingZh = [...used].filter((key) => !zhKeys.has(key));
const missingEn = [...used].filter((key) => !enKeys.has(key));
const onlyZh = [...zhKeys].filter((key) => !enKeys.has(key));
const onlyEn = [...enKeys].filter((key) => !zhKeys.has(key));
const unused = [...zhKeys].filter((key) => !used.has(key));

console.log('used keys: ' + used.size + ', zh keys: ' + zhKeys.size + ', en keys: ' + enKeys.size);
if (missingZh.length) console.error('missing zh: ' + missingZh.join(', '));
if (missingEn.length) console.error('missing en: ' + missingEn.join(', '));
if (onlyZh.length) console.error('zh-only keys: ' + onlyZh.join(', '));
if (onlyEn.length) console.error('en-only keys: ' + onlyEn.join(', '));
if (unused.length) console.log('unused zh keys: ' + unused.join(', '));

if (missingZh.length || missingEn.length || onlyZh.length || onlyEn.length) process.exitCode = 1;
