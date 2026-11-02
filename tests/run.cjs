const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
class El {
  constructor() {
    this.children = [];
    this.style = { setProperty() {} };
    this.classList = { add() {} };
  }
  empty() {
    this.children = [];
  }
  addClass() {}
  setAttribute() {}
  addEventListener() {}
  createEl(tag, o = {}) {
    const e = new El();
    e.tag = tag;
    e.text = o.text;
    e.cls = o.cls;
    this.children.push(e);
    return e;
  }
  createDiv(o) {
    return this.createEl("div", o);
  }
}
class Plugin {
  async loadData() {
    return {};
  }
  async saveData(d) {
    this.saved = d;
  }
  registerView(type, f) {
    this.factory = f;
  }
  addSettingTab() {}
  addCommand(c) {
    this.command = c;
  }
  addRibbonIcon() {}
  addStatusBarItem() {
    return new El();
  }
  registerDomEvent() {}
  registerEvent() {}
}
class ItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.contentEl = new El();
  }
}
class TFile {
  constructor(path) {
    this.path = path;
  }
}
const notices = [];
const context = {
  module: { exports: {} },
  require: (n) => {
    assert.equal(n, "obsidian");
    return {
      addIcon: (id, svg) => {
        assert.equal(id, "brand-widget");
        assert.match(svg, /<rect/);
      },
      setIcon: () => {},
      Plugin,
      ItemView,
      TFile,
      PluginSettingTab: class {},
      Setting: class {},
      Notice: class {
        constructor(s) {
          notices.push(s);
        }
      },
      normalizePath: (s) => s,
    };
  },
  URL,
  window: { open: (...args) => (context.opened = args) },
};
vm.runInNewContext(fs.readFileSync(__dirname + "/../main.js", "utf8"), context);
const Brand = context.module.exports;
assert.equal(
  Brand.normalizeSettings({ accent: "red", width: 10000, links: null }).width,
  400,
);
assert.equal(Brand.normalizeSettings({ accent: "red" }).accent, "#183b70");
for (const x of [
  "javascript:alert(1)",
  "file:///secret",
  "obsidian://open",
  "//example.com",
  "../outside",
])
  assert.equal(Brand.targetKind(x), "invalid");
assert.equal(Brand.targetKind("https://example.com"), "web");
assert.equal(Brand.targetKind("Notes/Home#Today"), "note");
assert.equal(
  Brand.normalizeSettings({
    motion: "bad",
    motionInterval: 999,
    backgroundOverlay: -5,
    backgroundFit: "bad",
  }).motion,
  "none",
);
assert.equal(
  Brand.normalizeSettings({ motionInterval: 999 }).motionInterval,
  120,
);
assert.equal(
  Brand.normalizeSettings({ motionInterval: -2 }).motionInterval,
  10,
);
assert.equal(
  Brand.normalizeSettings({ backgroundOverlay: -5 }).backgroundOverlay,
  0,
);
assert.equal(
  Brand.normalizeSettings({ backgroundOverlay: 0 }).backgroundOverlay,
  0,
);
assert.equal(Brand.normalizeSettings({}).animateStatus, false);
assert.equal(Brand.normalizeSettings(null).name, "Your brand");
assert.equal(Brand.normalizeSettings({ showStatus: "false" }).showStatus, true);

const css = fs.readFileSync(__dirname + "/../styles.css", "utf8");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /animation-play-state:\s*paused/);
(async () => {
  const leaves = [];
  const plugin = new Brand();
  plugin.app = {
    vault: { getAbstractFileByPath: () => null, on: () => ({}) },
    workspace: {
      getLeavesOfType: () => leaves,
      onLayoutReady: (f) => {
        plugin.ready = f;
      },
      getRightLeaf: () => ({
        setViewState: async () => {
          const view = plugin.factory({});
          leaves.push({ view });
          await view.onOpen();
        },
      }),
      revealLeaf: async () => {},
      openLinkText: async (t) => {
        plugin.note = t;
      },
    },
  };
  await plugin.onload();
  assert.equal(plugin.badge.children[0].text, "Your brand");
  await Promise.all([plugin.openPanel(), plugin.openPanel()]);
  assert.equal(leaves.length, 1);
  await plugin.openPanel();
  assert.equal(leaves.length, 1);
  await plugin.openTarget("Notes/Home");
  assert.equal(plugin.note, "Notes/Home");
  await plugin.openTarget("javascript:bad");
  assert.equal(notices.length, 1);
  await plugin.openTarget("https://example.com");
  assert.equal(context.opened[2], "noopener,noreferrer");
  plugin.settings.showStatus = false;
  await plugin.save();
  assert.equal(plugin.badge.style.display, "none");
  plugin.settings.logoPath = "missing.png";
  plugin.refresh();
  assert.equal(plugin.badge.children[0].text, "Your brand");
  plugin.app.vault.getAbstractFileByPath = (path) => new TFile(path);
  plugin.app.vault.getResourcePath = (file) => "app://vault/" + file.path;
  plugin.settings.logoPath = "logo.png";
  plugin.settings.backgroundPath = "bg.png";
  plugin.settings.motion = "bounce";
  plugin.settings.motionInterval = 30;
  plugin.brand(new El(), false);
  plugin.background(new El());
  plugin.refresh();
  assert.equal(plugin.badge.children[0].children[0].tag, "img");
  await assert.rejects(
    plugin.importLogo({ name: "unsafe.exe", size: 1 }),
    /Unsupported/,
  );
  await assert.rejects(
    plugin.importLogo({ name: "huge.png", size: 11 * 1024 * 1024 }),
    /smaller/,
  );
  const paths = new Map();
  plugin.app.vault.getAbstractFileByPath = (name) => paths.get(name) || null;
  plugin.app.vault.createFolder = async (name) => {
    paths.set(name, { path: name });
  };
  plugin.app.vault.createBinary = async (name, bytes) => {
    paths.set(name, new TFile(name));
    assert.equal(bytes.byteLength, 4);
  };
  const localImage = {
    name: "demo logo.png",
    size: 4,
    arrayBuffer: async () => new ArrayBuffer(4),
  };
  await plugin.importLogo(localImage);
  assert.equal(plugin.settings.logoPath, "Brand Widget Assets/demo-logo.png");
  await plugin.importLogo(localImage, "backgroundPath");
  assert.equal(
    plugin.settings.backgroundPath,
    "Brand Widget Assets/1-demo-logo.png",
  );
  await assert.rejects(
    plugin.importLogo(localImage, "unexpected"),
    /Invalid image destination/,
  );
  const saved = [];
  plugin.saveData = async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    saved.push(data.name);
  };
  plugin.settings.name = "First";
  const first = plugin.save();
  plugin.settings.name = "Second";
  const second = plugin.save();
  await Promise.all([first, second]);
  assert.deepEqual(saved, ["First", "Second"]);
  console.log(
    "Passed: image import, collision handling, import destination validation and serialized settings saves.",
  );
  console.log(
    "Passed: motion bounds and defaults, zero-opacity overlay, reduced-motion CSS, hover pause, image rendering and background rendering.",
  );
  console.log(
    "Passed: settings normalization, unsafe URL rejection, internal/external navigation, lifecycle, one-panel behavior, missing-logo fallback and status toggle.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
