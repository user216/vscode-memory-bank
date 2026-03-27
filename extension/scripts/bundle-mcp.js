/**
 * Build-time script: copies MCP server build artifacts and production
 * dependencies into the extension so they can be shipped inside the VSIX.
 *
 * Since v2, all MCP dependencies are pure JS (no native modules), so we
 * bundle node_modules at build time — no runtime npm install needed.
 *
 * Usage: node scripts/bundle-mcp.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MCP_SRC = path.resolve(__dirname, "../../mcp");
const MCP_DEST = path.resolve(__dirname, "../mcp-server");

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean destination
fs.rmSync(MCP_DEST, { recursive: true, force: true });
fs.mkdirSync(MCP_DEST, { recursive: true });

// Copy compiled JS output
copyDirSync(path.join(MCP_SRC, "build"), path.join(MCP_DEST, "build"));

// Copy package.json for Node.js module resolution
fs.copyFileSync(
  path.join(MCP_SRC, "package.json"),
  path.join(MCP_DEST, "package.json"),
);

// Install production dependencies into the bundle directory
// This captures all pure-JS deps (minisearch, gray-matter, etc.)
execSync("npm install --production --ignore-scripts", {
  cwd: MCP_DEST,
  stdio: "inherit",
  env: { ...process.env, npm_config_loglevel: "error" },
});

// Copy package-lock.json for reproducibility (if it exists)
const lockFile = path.join(MCP_SRC, "package-lock.json");
if (fs.existsSync(lockFile)) {
  fs.copyFileSync(lockFile, path.join(MCP_DEST, "package-lock.json"));
}

console.log("Bundled MCP server + dependencies into extension/mcp-server/");
