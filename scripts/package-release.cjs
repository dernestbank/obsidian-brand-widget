const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { zipSync } = require("fflate");
require("./check-release.cjs");
const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
);
const out = path.join(root, "dist", manifest.version);
fs.mkdirSync(out, { recursive: true });
const names = ["main.js", "manifest.json", "styles.css"];
const zip = {};
const sums = [];
for (const name of names) {
  const bytes = fs.readFileSync(path.join(root, name));
  fs.writeFileSync(path.join(out, name), bytes);
  sums.push(
    crypto.createHash("sha256").update(bytes).digest("hex") + "  " + name,
  );
  zip["brand-widget/" + name] = bytes;
}
for (const name of ["README.md", "LICENSE"])
  zip["brand-widget/" + name] = fs.readFileSync(path.join(root, name));
fs.writeFileSync(
  path.join(out, "brand-widget-" + manifest.version + ".zip"),
  zipSync(zip),
);
fs.writeFileSync(path.join(out, "SHA256SUMS.txt"), sums.join("\n") + "\n");
console.log(
  "Release assets written to dist/" +
    manifest.version +
    ". Upload the three loose plugin files to a matching GitHub release.",
);
