const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const read = (n) => fs.readFileSync(path.join(root, n), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const pkg = JSON.parse(read("package.json"));
const versions = JSON.parse(read("versions.json"));
assert.equal(manifest.id, "brand-widget");
assert.equal(manifest.version, pkg.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.ok(
  manifest.description.length <= 250 && manifest.description.endsWith("."),
);
assert.equal(manifest.author, "dernestbank");
for (const f of ["main.js", "styles.css", "README.md", "LICENSE", "icon.svg"])
  assert.ok(read(f).length > 0);
assert.ok(
  !fs.existsSync(path.join(root, "data.json")),
  "Personal settings must not be in the repository",
);
for (const f of ["main.js", "README.md", "manifest.json", "styles.css"])
  assert.ok(
    !/Bello Nurses|C:\\Users\\|bellonurses\.org/i.test(read(f)),
    f + " contains private branding or a local path",
  );
console.log(
  "Release metadata, required files, version alignment and private-data checks passed.",
);
