/**
 * Auto-bump patch version if a VSIX with the current version already exists.
 * Prevents building two different artifacts with the same version number.
 * Delegates to sync-versions.js to update all version references.
 *
 * Run automatically via `npm run package`.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const vsixName = `vscode-memory-bank-${pkg.version}.vsix`;
const vsixPath = path.join(__dirname, "..", vsixName);

if (fs.existsSync(vsixPath)) {
  const syncScript = path.join(__dirname, "..", "..", "scripts", "sync-versions.js");
  console.log(`${vsixName} already exists — auto-bumping patch version...`);
  execSync(`node "${syncScript}" --bump ext`, { stdio: "inherit" });
} else {
  console.log(`Version ${pkg.version} — no existing VSIX, keeping as-is.`);
}
