/**
 * Auto-bump patch version if a VSIX with the current version already exists.
 * Prevents building two different artifacts with the same version number.
 * Reads version from .env (single source of truth), delegates to sync-versions.js.
 *
 * Run automatically via `npm run package`.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const match = envContent.match(/^EXT_VERSION=(.+)$/m);
const version = match ? match[1].trim() : null;

if (!version) {
  console.error("ERROR: Could not read EXT_VERSION from .env");
  process.exit(1);
}

const vsixName = `vscode-memory-bank-${version}.vsix`;
const vsixPath = path.join(__dirname, "..", vsixName);

if (fs.existsSync(vsixPath)) {
  const syncScript = path.join(__dirname, "..", "..", "scripts", "sync-versions.js");
  console.log(`${vsixName} already exists — auto-bumping patch version...`);
  execSync(`node "${syncScript}" --bump ext`, { stdio: "inherit" });
} else {
  console.log(`Version ${version} — no existing VSIX, keeping as-is.`);
}
