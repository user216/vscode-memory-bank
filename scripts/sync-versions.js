/**
 * Centralized version management for vscode-memory-bank.
 *
 * Single source of truth: .env (EXT_VERSION, MCP_VERSION).
 * This script propagates version numbers to all dependent files:
 *   - extension/package.json + mcp/package.json (version field)
 *   - extension/package.json viewsContainers title
 *   - extension/mcp-server/package.json (bundled copy)
 *   - MEMORY.md section headers
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
const ENV_FILE = path.join(ROOT, ".env");
const MCP_PKG = path.join(ROOT, "mcp", "package.json");
const EXT_PKG = path.join(ROOT, "extension", "package.json");
const MEMORY = path.join(
  process.env.HOME,
  ".claude/projects/-home-narayanaya-vscode-memory-bank/memory/MEMORY.md"
);
const BUNDLED_MCP_PKG = path.join(ROOT, "extension", "mcp-server", "package.json");

// ---------------------------------------------------------------------------
// .env helpers
// ---------------------------------------------------------------------------

/** Parse .env file → { EXT_VERSION, MCP_VERSION } */
function readEnv(envPath) {
  const content = fs.readFileSync(envPath, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

/** Write vars back to .env, preserving key order and comments. */
function writeEnv(envPath, vars) {
  const lines = [];
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(envPath, lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// package.json helpers
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

// Read versions from .env (single source of truth)
const env = readEnv(ENV_FILE);
let extVer = env.EXT_VERSION;
let mcpVer = env.MCP_VERSION;

if (!extVer || !mcpVer) {
  console.error("ERROR: .env must contain EXT_VERSION and MCP_VERSION");
  process.exit(1);
}

const oldMcpVer = mcpVer;
const oldExtVer = extVer;

if (args.length === 0) {
  // Report mode
  console.log("Source of truth (.env):");
  console.log(`  EXT_VERSION: ${extVer}`);
  console.log(`  MCP_VERSION: ${mcpVer}`);

  // Check package.json drift
  const extPkgVer = readVersion(EXT_PKG);
  const mcpPkgVer = readVersion(MCP_PKG);
  if (extPkgVer !== extVer) {
    console.log(`\n  ⚠️  extension/package.json has ${extPkgVer} (expected ${extVer})`);
  }
  if (mcpPkgVer !== mcpVer) {
    console.log(`\n  ⚠️  mcp/package.json has ${mcpPkgVer} (expected ${mcpVer})`);
  }

  // Check bundled copy
  if (fs.existsSync(BUNDLED_MCP_PKG)) {
    const bundledVer = readVersion(BUNDLED_MCP_PKG);
    if (bundledVer !== mcpVer) {
      console.log(`  ⚠️  Bundled MCP: ${bundledVer} (expected ${mcpVer})`);
    }
  }

  if (extPkgVer === extVer && mcpPkgVer === mcpVer) {
    console.log("\n  All downstream files in sync.");
  } else {
    console.log("\n  Run with --sync to fix drift.");
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

const changes = [];

// 1. Update .env if versions changed
if (mcpVer !== oldMcpVer || extVer !== oldExtVer) {
  writeEnv(ENV_FILE, { EXT_VERSION: extVer, MCP_VERSION: mcpVer });
  if (extVer !== oldExtVer) changes.push(`.env EXT:     ${oldExtVer} → ${extVer}`);
  if (mcpVer !== oldMcpVer) changes.push(`.env MCP:     ${oldMcpVer} → ${mcpVer}`);
}

// 2. Propagate to package.json files (always — ensures sync)
{
  const curExt = readVersion(EXT_PKG);
  if (curExt !== extVer) {
    writeVersion(EXT_PKG, extVer);
    changes.push(`Extension:   ${curExt} → ${extVer}`);
  } else {
    // Still sync the view container title
    const pkg = JSON.parse(fs.readFileSync(EXT_PKG, "utf-8"));
    const container = pkg.contributes?.viewsContainers?.activitybar?.find(
      (c) => c.id === "memory-bank"
    );
    const expectedTitle = `Memory Bank v${extVer}`;
    if (container && container.title !== expectedTitle) {
      container.title = expectedTitle;
      fs.writeFileSync(EXT_PKG, JSON.stringify(pkg, null, 2) + "\n");
      changes.push(`View title:  → "${expectedTitle}"`);
    }
  }
}

{
  const curMcp = readVersion(MCP_PKG);
  if (curMcp !== mcpVer) {
    writeVersion(MCP_PKG, mcpVer);
    changes.push(`MCP server:  ${curMcp} → ${mcpVer}`);
  }
}

// 3. Sync bundled MCP package.json
if (fs.existsSync(BUNDLED_MCP_PKG)) {
  const bundledVer = readVersion(BUNDLED_MCP_PKG);
  if (bundledVer !== mcpVer) {
    writeVersion(BUNDLED_MCP_PKG, mcpVer);
    changes.push(`Bundled MCP: ${bundledVer} → ${mcpVer}`);
  }
}

// 4. Propagate to MEMORY.md
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
