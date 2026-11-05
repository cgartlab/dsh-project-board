const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8');

function createLocalStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear()
  };
}

function createElementStub() {
  return {
    textContent: '',
    style: {},
    dataset: {},
    setAttribute() {},
    removeAttribute() {},
    appendChild() {},
    remove() {},
    addEventListener() {},
    removeEventListener() {}
  };
}

function createDocumentStub() {
  const head = createElementStub();
  return {
    head,
    body: createElementStub(),
    documentElement: createElementStub(),
    scrollingElement: createElementStub(),
    visibilityState: 'visible',
    hasFocus: () => true,
    createElement: createElementStub,
    createElementNS: createElementStub,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {}
  };
}

function createReactStub() {
  const noop = () => {};
  return {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, noop],
    useEffect: noop,
    useLayoutEffect: noop,
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    Fragment: 'Fragment'
  };
}

function loadModule(platform = 'test') {
  let captured = null;
  const localStorage = createLocalStorage();
  const document = createDocumentStub();
  const window = {
    document,
    localStorage,
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    navigator: { platform: platform },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => { fn(0); return 0; },
    cancelAnimationFrame: () => {},
    __ModuleLoader__: { load: (spec) => { captured = spec; } }
  };
  const sandbox = { window, document, localStorage, console, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, requestAnimationFrame: window.requestAnimationFrame };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'client.js' });
  assert.ok(captured, 'module loader receives the plugin spec');
  const module = captured.factory((id) => {
    if (id === 'react') return createReactStub();
    throw new Error('unexpected runtime dependency: ' + id);
  });
  return { module, window, document, localStorage };
}

function createContext(window, document) {
  const translations = {};
  const registrations = [];
  const effects = [];
  const ctx = {
    locale: {
      register(namespace, dicts) { translations[namespace] = dicts; },
      bind(namespace) {
        return (key, params) => {
          const table = (translations[namespace] || {})[key] ? (translations[namespace] || {}) : null;
          let text = table ? table[key] : key;
          if (params) {
            for (const [name, value] of Object.entries(params)) text = text.split('{' + name + '}').join(String(value));
          }
          return text;
        };
      }
    },
    effect(factory) { const dispose = factory(); if (typeof dispose === 'function') effects.push(dispose); return () => {}; },
    get() { return undefined; },
    sidebarRightTabs: { register() { return () => {}; } },
    slots: {
      inject(name, factory) { return factory(); },
      register(spec, component) { registrations.push({ spec, component }); return () => {}; }
    }
  };
  return { ctx, translations, registrations, effects };
}

test('client bundle loads and mounts against stubbed host services', () => {
  const { module, window, document } = loadModule();
  assert.ok(Array.isArray(module.inject), 'module declares inject list');
  for (const service of ['slots', 'locale', 'remote', 'remote.session', 'sidebarRight', 'layout']) {
    assert.ok(module.inject.includes(service), 'inject list includes ' + service);
  }

  const { ctx, translations, registrations } = createContext(window, document);
  module.apply(ctx);

  assert.ok(translations.projectBoard, 'locale dictionaries registered');
  assert.ok(Object.keys(translations.projectBoard.zh || {}).length > 100, 'zh dictionary is populated');
  assert.ok(Object.keys(translations.projectBoard.en || {}).length > 100, 'en dictionary is populated');

  const ids = registrations.map((entry) => entry.spec.id);
  const expected = [
    'project-board',
    'project-board-header-right',
    'project-board-shortcut-hints',
    'project-board-buttons',
    'project-board-palette',
    'project-board-session-menu',
    'project-board-rename',
    'project-board-hud',
    'project-board-toast',
    'project-board-notifier',
    'project-board-notification-dock',
    'project-board-settings'
  ];
  for (const id of expected) assert.ok(ids.includes(id), 'registered slot ' + id);
  for (const entry of registrations) assert.equal(typeof entry.component, 'function', 'slot ' + entry.spec.id + ' has a component');
});

test('zh and en dictionaries expose the same keys', () => {
  const { module, window, document } = loadModule();
  const { ctx, translations } = createContext(window, document);
  module.apply(ctx);
  const zh = Object.keys(translations.projectBoard.zh).sort();
  const en = Object.keys(translations.projectBoard.en).sort();
  assert.deepEqual(zh, en);
});

/** Render the header slot and return the serialized element tree for label assertions. */
function headerLabels(platform) {
  const { module, window, document } = loadModule(platform);
  const { ctx, translations, registrations } = createContext(window, document);
  module.apply(ctx);
  const noop = () => {};
  // DSH store hooks return the selected snapshot, not a React [value, setter] tuple.
  const hook = (selector) => (selector ? selector(undefined) : undefined);
  const entry = registrations.find((item) => item.spec.name === 'conversation.header.leading');
  assert.ok(entry, 'header slot registered');
  const wrapped = entry.component({
    t: ctx.locale.bind('projectBoard'),
    useSettings: hook, useSessions: hook, useSessionStatus: hook,
    useWorkspaces: hook, usePalette: hook, useHeaderDrag: hook,
    palette: { set: noop }, openBoard: noop, saveSettings: noop, headerDrag: {}
  });
  // HeaderLeading is a thin wrapper around HeaderButtons; render one level deeper.
  const tree = typeof wrapped.type === 'function' ? wrapped.type(wrapped.props) : wrapped;
  return { text: JSON.stringify(tree), translations };
}

test('macOS shows Option (⌥) shortcut labels; other platforms keep Alt', () => {
  const mac = headerLabels('MacIntel');
  assert.match(mac.text, /⌥\+K/, 'macOS keycap uses ⌥');
  assert.doesNotMatch(mac.text, /Alt\+K/, 'macOS keycap does not say Alt');
  assert.match(mac.translations.projectBoard.zh['settings.shortcut.hint'], /Option/);
  assert.match(mac.translations.projectBoard.en['settings.shortcut.hint'], /Option/);

  const win = headerLabels('Win32');
  assert.match(win.text, /Alt\+K/, 'Windows keycap uses Alt');
  assert.doesNotMatch(win.text, /⌥/, 'Windows keycap does not use macOS symbols');
});

test('bindings stay platform-neutral so saved shortcuts keep working', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
  assert.match(source, /shortcuts:\s*\{\s*palette:\s*'alt\+KeyK'/);
  assert.match(source, /if \(event\.altKey\) parts\.push\('alt'\)/);
  assert.match(source, /part === 'ctrl' \? 'control' : part/);
});
