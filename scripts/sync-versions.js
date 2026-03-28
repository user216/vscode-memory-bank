/**
 * Centralized version management for vscode-memory-bank.
 *
 * Single source of truth: mcp/package.json + extension/package.json.
 * This script propagates version numbers to all dependent files:
 *   - MEMORY.md section headers
 *   - extension/mcp-server/package.json (bundled copy)
 *
 * Usage:
 *   node scripts/sync-versions.js                    # report current + check consistency
 *   node scripts/sync-versions.js --bump ext         # bump extension patch
 *   node scripts/sync-versions.js --bump mcp         # bump MCP patch
 *   node scripts/sync-versions.js --bump both        # bump both patches
 *   node scripts/sync-versions.js --set-ext 0.7.0    # set extension to specific version
 *   node scripts/sync-versions.js --set-mcp 2.4.0    # set MCP to specific version
 *   node scripts/sync-versions.js --sync             # just propagate current versions to all files
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MCP_PKG = path.join(ROOT, "mcp", "package.json");
const EXT_PKG = path.join(ROOT, "extension", "package.json");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const MEMORY = path.join(
  process.env.HOME,
  ".claude/projects/-home-narayanaya-vscode-memory-bank/memory/MEMORY.md"
);
const BUNDLED_MCP_PKG = path.join(ROOT, "extension", "mcp-server", "package.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readVersion(pkgPath) {
  return JSON.parse(fs.readFileSync(pkgPath, "utf-8")).version;
}

function writeVersion(pkgPath, version) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const old = pkg.version;
  pkg.version = version;

  // Also update the view container title in extension/package.json
  if (pkgPath === EXT_PKG && pkg.contributes?.viewsContainers?.activitybar) {
    const container = pkg.contributes.viewsContainers.activitybar.find(
      (c) => c.id === "memory-bank"
    );
    if (container) {
      container.title = `Memory Bank v${version}`;
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return old;
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Replace the FIRST (most recent) version reference for each component in a file.
 * Uses semver-matching regex so it works regardless of what the old version was.
 * Only replaces the first match to avoid rewriting historical CHANGELOG entries.
 */
function syncFileVersions(filePath, mcpVer, extVer) {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;
  const SV = "\\d+\\.\\d+\\.\\d+"; // semver pattern

  // MCP Server version — first occurrence of "MCP Server v<semver>"
  content = replaceFirst(content, new RegExp(`(MCP Server v)${SV}`), `$1${mcpVer}`);

  // Extension version — first occurrence of each pattern
  content = replaceFirst(content, new RegExp(`(Extension v)${SV}`), `$1${extVer}`);
  content = replaceFirst(content, new RegExp(`(Extension \\(v)${SV}`), `$1${extVer}`);
  content = replaceFirst(content, new RegExp(`(Extension Architecture \\(v)${SV}`), `$1${extVer}`);

  // Plugin/Copilot Plugin version — tracks extension version
  content = replaceFirst(content, new RegExp(`(Plugin v)${SV}`), `$1${extVer}`);
  content = replaceFirst(content, new RegExp(`(Plugin \\(v)${SV}`), `$1${extVer}`);

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

/** Replace only the first match of a regex in a string. */
function replaceFirst(str, regex, replacement) {
  return str.replace(regex, replacement);
}


// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

let mcpVer = readVersion(MCP_PKG);
let extVer = readVersion(EXT_PKG);
const oldMcpVer = mcpVer;
const oldExtVer = extVer;

if (args.length === 0) {
  // Report mode
  console.log("Current versions:");
  console.log(`  MCP server:  ${mcpVer}  (mcp/package.json)`);
  console.log(`  Extension:   ${extVer}  (extension/package.json)`);

  // Check bundled copy
  if (fs.existsSync(BUNDLED_MCP_PKG)) {
    const bundledVer = readVersion(BUNDLED_MCP_PKG);
    if (bundledVer !== mcpVer) {
      console.log(`  Bundled MCP: ${bundledVer}  ⚠️  STALE (should be ${mcpVer})`);
    }
  }
  console.log("\nUsage:");
  console.log("  node scripts/sync-versions.js --bump ext          # bump extension patch");
  console.log("  node scripts/sync-versions.js --bump mcp          # bump MCP patch");
  console.log("  node scripts/sync-versions.js --bump both         # bump both patches");
  console.log("  node scripts/sync-versions.js --set-ext 0.7.0     # set extension version");
  console.log("  node scripts/sync-versions.js --set-mcp 2.4.0     # set MCP version");
  console.log("  node scripts/sync-versions.js --sync              # propagate to all files");
  process.exit(0);
}

// Parse args
let doSync = false;
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--bump":
      const target = args[++i];
      if (target === "ext" || target === "both") {
        extVer = bumpPatch(extVer);
      }
      if (target === "mcp" || target === "both") {
        mcpVer = bumpPatch(mcpVer);
      }
      doSync = true;
      break;
    case "--set-ext":
      extVer = args[++i];
      doSync = true;
      break;
    case "--set-mcp":
      mcpVer = args[++i];
      doSync = true;
      break;
    case "--sync":
      doSync = true;
      break;
    default:
      console.error(`Unknown argument: ${args[i]}`);
      process.exit(1);
  }
}

if (!doSync) process.exit(0);

// Apply version changes to package.json files
const changes = [];

if (mcpVer !== oldMcpVer) {
  writeVersion(MCP_PKG, mcpVer);
  changes.push(`MCP server:  ${oldMcpVer} → ${mcpVer}`);
}

if (extVer !== oldExtVer) {
  writeVersion(EXT_PKG, extVer);
  changes.push(`Extension:   ${oldExtVer} → ${extVer}`);
}

// Sync bundled MCP package.json
if (fs.existsSync(BUNDLED_MCP_PKG)) {
  const bundledVer = readVersion(BUNDLED_MCP_PKG);
  if (bundledVer !== mcpVer) {
    writeVersion(BUNDLED_MCP_PKG, mcpVer);
    changes.push(`Bundled MCP: ${bundledVer} → ${mcpVer}`);
  }
}

// Sync view container title in extension/package.json (even when version didn't change)
{
  const pkg = JSON.parse(fs.readFileSync(EXT_PKG, "utf-8"));
  const container = pkg.contributes?.viewsContainers?.activitybar?.find(
    (c) => c.id === "memory-bank"
  );
  const expectedTitle = `Memory Bank v${extVer}`;
  if (container && container.title !== expectedTitle) {
    container.title = expectedTitle;
    fs.writeFileSync(EXT_PKG, JSON.stringify(pkg, null, 2) + "\n");
    changes.push(`View title:  "${container.title}" → "${expectedTitle}"`);
  }
}

// Propagate to MEMORY.md (CHANGELOG.md is append-only — versions written at entry creation time)
const filesToSync = [
  { path: MEMORY, name: "MEMORY.md" },
];

for (const { path: filePath, name } of filesToSync) {
  if (syncFileVersions(filePath, mcpVer, extVer)) {
    changes.push(`Updated version references in ${name}`);
  }
}

// Report
if (changes.length > 0) {
  console.log("Version sync complete:");
  for (const c of changes) {
    console.log(`  ${c}`);
  }
} else {
  console.log("All versions already in sync.");
}

console.log(`\nCurrent: MCP ${mcpVer} | Extension ${extVer}`);
