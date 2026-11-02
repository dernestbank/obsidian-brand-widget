"use strict";
const {
  Plugin,
  ItemView,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  normalizePath,
  addIcon,
} = require("obsidian");
const VIEW = "brand-widget-view";
const ICON = "brand-widget";
const ICON_SVG =
  '<rect x="14" y="14" width="72" height="72" rx="16" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 27 65 42 50 57 35 42Z" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round"/><path d="M31 71h14m10 0h14" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>';
const DEFAULTS = {
  name: "Your brand",
  motto: "Make this workspace yours.",
  logoPath: "",
  logoBackground: "white",
  accent: "#183b70",
  width: 240,
  statusWidth: 110,
  showStatus: true,
  startup: true,
  home: "",
  links: [],
  backgroundPath: "",
  backgroundOverlay: 75,
  backgroundFit: "cover",
  motion: "none",
  motionInterval: 30,
  animateStatus: false,
};
function normalize(data = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
  const s = Object.assign({}, DEFAULTS, data);
  for (const key of ["showStatus", "startup", "animateStatus"])
    s[key] = typeof s[key] === "boolean" ? s[key] : DEFAULTS[key];
  for (const k of ["name", "motto", "logoPath", "home", "backgroundPath"])
    s[k] = typeof s[k] === "string" ? s[k] : DEFAULTS[k];
  s.accent = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : DEFAULTS.accent;
  s.width = Math.max(100, Math.min(400, Number(s.width) || 240));
  s.statusWidth = Math.max(40, Math.min(200, Number(s.statusWidth) || 110));
  s.logoBackground = ["white", "theme", "transparent"].includes(
    s.logoBackground,
  )
    ? s.logoBackground
    : "white";
  s.motion = ["none", "spin", "bounce", "dissolve", "float"].includes(s.motion)
    ? s.motion
    : "none";
  s.motionInterval = Math.max(
    10,
    Math.min(120, Number(s.motionInterval) || 30),
  );
  s.backgroundOverlay = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(s.backgroundOverlay))
        ? Number(s.backgroundOverlay)
        : 75,
    ),
  );
  s.backgroundFit = ["cover", "contain"].includes(s.backgroundFit)
    ? s.backgroundFit
    : "cover";
  s.links = Array.isArray(s.links)
    ? s.links
        .filter(
          (x) =>
            x && typeof x.label === "string" && typeof x.target === "string",
        )
        .map((x) => ({ label: x.label, target: x.target }))
    : [];
  return s;
}
function targetKind(target) {
  const t = target.trim();
  if (/^https?:\/\//i.test(t)) {
    try {
      new URL(t);
      return "web";
    } catch {
      return "invalid";
    }
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(t) ||
    t.startsWith("//") ||
    t.includes("..\\") ||
    t.includes("../")
  )
    return "invalid";
  return t ? "note" : "empty";
}
class BrandView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Brand-widget";
  }
  getIcon() {
    return ICON;
  }
  async onOpen() {
    this.render();
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.addClass("brand-widget-panel");
    this.plugin.background(el);
    this.plugin.brand(el, false);
    if (this.plugin.settings.motto)
      el.createEl("p", {
        text: this.plugin.settings.motto,
        cls: "brand-widget-motto",
      });
    const nav = el.createDiv({ cls: "brand-widget-links" });
    for (const link of this.plugin.settings.links) {
      if (!link.label.trim() || !link.target.trim()) continue;
      const button = nav.createEl("button", {
        text: link.label,
        attr: { title: link.target },
      });
      button.addEventListener("click", () =>
        this.plugin.openTarget(link.target),
      );
    }
  }
}
class BrandSettings extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const el = this.containerEl;
    el.empty();
    const p = this.plugin,
      s = p.settings;
    new Setting(el).setName("Identity").setHeading();
    const text = (name, key, desc) =>
      new Setting(el)
        .setName(name)
        .setDesc(desc || "")
        .addText((t) =>
          t.setValue(s[key]).onChange(async (val) => {
            s[key] = val;
            await p.save();
          }),
        );
    text("Brand name", "name");
    text("Motto", "motto");
    text(
      "Logo path",
      "logoPath",
      "Path to an image inside this vault. Or choose a file below.",
    );
    new Setting(el)
      .setName("Choose logo")
      .setDesc(
        "Copies your image into Brand Widget Assets; the original stays in place.",
      )
      .addButton((b) =>
        b.setButtonText("Choose image").onClick(() => {
          const input = el.ownerDocument.createElement("input");
          input.type = "file";
          input.accept =
            "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              await p.importLogo(file);
              this.display();
            } catch (e) {
              new Notice("Could not import logo: " + e.message);
            }
          };
          input.click();
        }),
      );
    new Setting(el).setName("Logo background").addDropdown((d) =>
      d
        .addOptions({
          white: "White — dark logo",
          theme: "Theme background",
          transparent: "Transparent",
        })
        .setValue(s.logoBackground)
        .onChange(async (val) => {
          s.logoBackground = val;
          await p.save();
        }),
    );
    new Setting(el).setName("Widget background").setHeading();
    text(
      "Background image path",
      "backgroundPath",
      "Local vault image path. Leave blank to use your theme.",
    );
    new Setting(el)
      .setName("Choose background image")
      .addButton((b) =>
        b.setButtonText("Choose image").onClick(() => {
          const input = el.ownerDocument.createElement("input");
          input.type = "file";
          input.accept =
            "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              await p.importLogo(file, "backgroundPath");
              this.display();
            } catch (e) {
              new Notice("Could not import background: " + e.message);
            }
          };
          input.click();
        }),
      )
      .addButton((b) =>
        b.setButtonText("Clear background").onClick(async () => {
          s.backgroundPath = "";
          await p.save();
          this.display();
        }),
      );
    new Setting(el)
      .setName("Readability overlay")
      .setDesc("Theme-colored overlay: 0% shows the full image; 100% hides it.")
      .addSlider((x) =>
        x
          .setLimits(0, 100, 5)
          .setValue(s.backgroundOverlay)
          .setDynamicTooltip()
          .onChange(async (v) => {
            s.backgroundOverlay = v;
            await p.save();
          }),
      );
    new Setting(el).setName("Background fit").addDropdown((x) =>
      x
        .addOptions({ cover: "Fill panel", contain: "Show whole image" })
        .setValue(s.backgroundFit)
        .onChange(async (v) => {
          s.backgroundFit = v;
          await p.save();
        }),
    );
    new Setting(el).setName("Optional logo motion").setHeading();
    new Setting(el)
      .setName("Animation")
      .setDesc(
        "One short effect per cycle, followed by a long rest. Off by default.",
      )
      .addDropdown((x) =>
        x
          .addOptions({
            none: "Off",
            spin: "Slow spin",
            bounce: "Gentle bounce",
            dissolve: "Soft dissolve",
            float: "Subtle float",
          })
          .setValue(s.motion)
          .onChange(async (v) => {
            s.motion = v;
            await p.save();
          }),
      );
    new Setting(el)
      .setName("Cycle interval (seconds)")
      .setDesc(
        "10–120 seconds. The effect occupies the first 15% of each cycle.",
      )
      .addSlider((x) =>
        x
          .setLimits(10, 120, 5)
          .setValue(s.motionInterval)
          .setDynamicTooltip()
          .onChange(async (v) => {
            s.motionInterval = v;
            await p.save();
          }),
      );
    new Setting(el)
      .setName("Also animate status-bar logo")
      .setDesc(
        "Keep off for a quieter status bar. Motion pauses on hover or keyboard focus and respects system reduced-motion preferences.",
      )
      .addToggle((x) =>
        x.setValue(s.animateStatus).onChange(async (v) => {
          s.animateStatus = v;
          await p.save();
        }),
      );
    new Setting(el).setName("Accent color").addColorPicker((c) =>
      c.setValue(s.accent).onChange(async (val) => {
        s.accent = val;
        await p.save();
      }),
    );
    for (const [label, key, min, max] of [
      ["Sidebar logo width", "width", 100, 400],
      ["Status-bar logo width", "statusWidth", 40, 200],
    ])
      new Setting(el).setName(label).addSlider((x) =>
        x
          .setLimits(min, max, 10)
          .setValue(s[key])
          .setDynamicTooltip()
          .onChange(async (val) => {
            s[key] = val;
            await p.save();
          }),
      );
    for (const [label, key] of [
      ["Show status-bar badge", "showStatus"],
      ["Open sidebar widget on startup", "startup"],
    ])
      new Setting(el).setName(label).addToggle((t) =>
        t.setValue(s[key]).onChange(async (val) => {
          s[key] = val;
          await p.save();
        }),
      );
    text(
      "Status-bar click destination",
      "home",
      "Vault note path or HTTPS URL. Leave empty to show the widget.",
    );
    new Setting(el).setName("Quick links").setHeading();
    el.createEl("p", {
      text: "Use a vault note path (including an optional #heading) or an HTTP(S) URL. Link labels and targets are plain text.",
    });
    s.links.forEach((link, i) => {
      new Setting(el)
        .setName("Link " + (i + 1))
        .addText((t) =>
          t
            .setPlaceholder("Label")
            .setValue(link.label)
            .onChange(async (x) => {
              link.label = x;
              await p.save();
            }),
        )
        .addText((t) =>
          t
            .setPlaceholder("Note path or https://…")
            .setValue(link.target)
            .onChange(async (x) => {
              link.target = x;
              await p.save();
            }),
        )
        .addExtraButton((b) =>
          b
            .setIcon("arrow-up")
            .setTooltip("Move up")
            .onClick(async () => {
              if (i) {
                [s.links[i - 1], s.links[i]] = [s.links[i], s.links[i - 1]];
                await p.save();
                this.display();
              }
            }),
        )
        .addExtraButton((b) =>
          b
            .setIcon("trash")
            .setTooltip("Remove link")
            .onClick(async () => {
              s.links.splice(i, 1);
              await p.save();
              this.display();
            }),
        );
    });
    new Setting(el).addButton((b) =>
      b.setButtonText("Add quick link").onClick(async () => {
        s.links.push({ label: "", target: "" });
        await p.save();
        this.display();
      }),
    );
    new Setting(el).addButton((b) =>
      b.setButtonText("Show widget").onClick(() => p.openPanel()),
    );
  }
}
class BrandWidget extends Plugin {
  async onload() {
    addIcon(ICON, ICON_SVG);
    this.settings = normalize((await this.loadData()) || {});
    this.registerView(VIEW, (leaf) => new BrandView(leaf, this));
    this.addSettingTab(new BrandSettings(this.app, this));
    this.addCommand({
      id: "show-widget",
      name: "Show sidebar widget",
      callback: () => this.openPanel(),
    });
    this.addRibbonIcon(ICON, "Brand-widget", () => this.openPanel());
    this.badge = this.addStatusBarItem();
    this.badge.addClass("brand-widget-status");
    this.badge.setAttribute("role", "button");
    this.badge.tabIndex = 0;
    const open = () =>
      this.settings.home
        ? this.openTarget(this.settings.home)
        : this.openPanel();
    this.registerDomEvent(this.badge, "click", open);
    this.registerDomEvent(this.badge, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    this.registerEvent(
      this.app.vault.on("rename", (file, old) => {
        for (const key of ["logoPath", "backgroundPath"])
          if (old === this.settings[key]) {
            this.settings[key] = file.path;
            void this.save();
          }
      }),
    );
    for (const event of ["create", "modify", "delete"])
      this.registerEvent(
        this.app.vault.on(event, (file) => {
          if (
            file.path === this.settings.logoPath ||
            file.path === this.settings.backgroundPath
          )
            this.refresh();
        }),
      );
    this.refresh();
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.startup) void this.openPanel(false);
    });
  }
  async save() {
    const snapshot = JSON.parse(JSON.stringify(this.settings));
    this.saveQueue = (this.saveQueue || Promise.resolve())
      .catch(() => {})
      .then(() => this.saveData(snapshot));
    await this.saveQueue;
    this.refresh();
  }
  async importLogo(file, key = "logoPath") {
    if (!["logoPath", "backgroundPath"].includes(key))
      throw new Error("Invalid image destination");
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name))
      throw new Error("Unsupported image format");
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Choose an image smaller than 10 MB");
    const folder = "Brand Widget Assets";
    if (!this.app.vault.getAbstractFileByPath(folder))
      await this.app.vault.createFolder(folder);
    const safe = file.name.replace(/[^a-z0-9._-]/gi, "-");
    let path = normalizePath(folder + "/" + safe);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path))
      path = normalizePath(folder + "/" + n++ + "-" + safe);
    await this.app.vault.createBinary(path, await file.arrayBuffer());
    this.settings[key] = path;
    await this.save();
  }
  background(el) {
    const s = this.settings;
    const file = s.backgroundPath
      ? this.app.vault.getAbstractFileByPath(s.backgroundPath)
      : null;
    const valid =
      file instanceof TFile && /\.(png|jpe?g|webp|gif|svg)$/i.test(file.path);
    el.style.setProperty(
      "--brand-widget-bg",
      valid
        ? "url(" + JSON.stringify(this.app.vault.getResourcePath(file)) + ")"
        : "none",
    );
    el.style.setProperty(
      "--brand-widget-overlay",
      valid ? String(s.backgroundOverlay / 100) : "1",
    );
    el.style.setProperty("--brand-widget-bg-fit", s.backgroundFit);
  }
  brand(el, small) {
    const s = this.settings;
    el.style.setProperty("--brand-widget-accent", s.accent);
    el.style.setProperty("--brand-widget-width", s.width + "px");
    el.style.setProperty("--brand-widget-status-width", s.statusWidth + "px");
    el.style.setProperty("--brand-widget-cycle", s.motionInterval + "s");
    const effect = !small || s.animateStatus ? s.motion : "none";
    el.setAttribute("data-brand-motion", effect);
    const file = s.logoPath
      ? this.app.vault.getAbstractFileByPath(s.logoPath)
      : null;
    if (
      file instanceof TFile &&
      /\.(png|jpe?g|webp|gif|svg)$/i.test(file.path)
    ) {
      const frame = el.createDiv({
        cls: "brand-widget-logo-frame brand-widget-bg-" + s.logoBackground,
      });
      const img = frame.createEl("img", {
        cls: small ? "brand-widget-status-logo" : "brand-widget-logo",
        attr: {
          src: this.app.vault.getResourcePath(file),
          alt: s.name || "Brand logo",
        },
      });
      img.addEventListener("error", () => {
        frame.empty();
        frame.createEl("strong", { text: s.name || "Brand-widget" });
      });
    } else
      el.createEl("strong", {
        text: s.name || "Brand-widget",
        cls: "brand-widget-name",
      });
    if (!small && file)
      el.createEl("span", { text: s.name, cls: "brand-widget-caption" });
  }
  refresh() {
    if (this.badge) {
      this.badge.empty();
      this.badge.style.display = this.settings.showStatus ? "" : "none";
      this.badge.setAttribute(
        "aria-label",
        this.settings.name + " — open brand destination",
      );
      this.badge.setAttribute("title", this.settings.name);
      this.brand(this.badge, true);
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW))
      if (leaf.view instanceof BrandView) leaf.view.render();
  }
  async openTarget(target) {
    const kind = targetKind(target);
    if (kind === "web")
      window.open(target.trim(), "_blank", "noopener,noreferrer");
    else if (kind === "note")
      await this.app.workspace.openLinkText(target.trim(), "");
    else if (kind === "invalid")
      new Notice("Use a vault note path or an HTTP(S) URL.");
  }
  async openPanel(reveal = true) {
    if (!this.openingPanel) {
      this.openingPanel = (async () => {
        let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
        if (!leaf) {
          leaf = this.app.workspace.getRightLeaf(true);
          if (!leaf) return;
          await leaf.setViewState({ type: VIEW, active: true });
        }
        return leaf;
      })();
    }
    try {
      const leaf = await this.openingPanel;
      if (leaf && reveal) await this.app.workspace.revealLeaf(leaf);
    } finally {
      this.openingPanel = null;
    }
  }
}
module.exports = BrandWidget;
module.exports.normalizeSettings = normalize;
module.exports.targetKind = targetKind;
