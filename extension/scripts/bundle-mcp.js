/**
 * Build-time script: copies MCP server build artifacts into the extension
 * so they can be shipped inside the VSIX.
 *
 * Usage: node scripts/bundle-mcp.js
 */
const fs = require("fs");
const path = require("path");

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

// Copy package files so npm install can run at runtime
fs.copyFileSync(
  path.join(MCP_SRC, "package.json"),
  path.join(MCP_DEST, "package.json"),
);
fs.copyFileSync(
  path.join(MCP_SRC, "package-lock.json"),
  path.join(MCP_DEST, "package-lock.json"),
);

console.log("Bundled MCP server into extension/mcp-server/");
