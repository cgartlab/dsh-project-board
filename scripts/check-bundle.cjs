const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error('FAIL ' + message);
}

function checkFile(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) { fail('missing file: ' + relative); return false; }
  return true;
}

function checkJson(relative) {
  const target = path.join(root, relative);
  if (!checkFile(relative)) return null;
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    fail('invalid JSON: ' + relative + ' (' + error.message + ')');
    return null;
  }
}

for (const script of ['client.js', 'index.js']) {
  if (!checkFile(script)) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(root, script)], { encoding: 'utf8' });
  if (result.status !== 0) fail('syntax error in ' + script + ': ' + (result.stderr || '').trim());
}

checkJson('locale/zh.json');
checkJson('locale/en.json');

const pkg = checkJson('package.json');
if (pkg) {
  if (!pkg.name) fail('package.json: missing name');
  if (!pkg.version) fail('package.json: missing version');
  if (pkg.type !== 'module') fail('package.json: type must be "module"');
  if (!pkg.license) fail('package.json: missing license');
  if (!pkg.dsh || !pkg.dsh.client || pkg.dsh.client.platform !== 'web') fail('package.json: dsh.client.platform must be "web"');
  if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) fail('package.json: dsh.bundle.patch is required');
  else if (!checkFile(pkg.dsh.bundle.patch)) fail('bundle patch missing: ' + pkg.dsh.bundle.patch);
  for (const key of ['exports', 'files']) {
    if (!pkg[key]) fail('package.json: missing ' + key);
  }
  if (pkg.exports) {
    for (const [entry, target] of Object.entries(pkg.exports)) {
      const value = typeof target === 'string' ? target : (target && target.default);
      if (!value) continue;
      if (value.includes('*')) continue;
      if (!checkFile(value)) fail('exports["' + entry + '"] points at a missing file: ' + value);
    }
  }
}

if (!checkFile('cordis.patch.yml')) fail('missing cordis.patch.yml');
if (!checkFile('LICENSE')) fail('missing LICENSE');

// The package name is the plugin's identity in three places at once: package.json,
// the client module loader id, and the loader entry inside cordis.patch.yml. Renaming
// the repository is only finished when all three agree, so check the drift here.
if (pkg && pkg.name && checkFile('client.js')) {
  const clientSource = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
  const loaderId = /__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/.exec(clientSource);
  if (!loaderId) fail('client.js: cannot read the module loader id');
  else if (loaderId[1] !== pkg.name) fail('client.js module id "' + loaderId[1] + '" does not match package.json name "' + pkg.name + '"');
  for (const match of clientSource.matchAll(/'(@local\/[^']+)'/g)) {
    if (!match[1].startsWith(pkg.name)) fail('client.js still references the old package id "' + match[1] + '"');
  }
  const patchPath = path.join(root, 'cordis.patch.yml');
  if (fs.existsSync(patchPath)) {
    const patch = fs.readFileSync(patchPath, 'utf8');
    if (!patch.includes("'" + pkg.name + "'")) fail('cordis.patch.yml does not insert package name "' + pkg.name + '"');
  }
}

if (failures.length > 0) {
  console.error('\n' + failures.length + ' check(s) failed');
  process.exitCode = 1;
} else {
  console.log('bundle checks passed');
}
