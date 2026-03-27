#!/usr/bin/env node
/**
 * Build verification tests for the extension packaging pipeline.
 *
 * Validates that:
 * 1. bundle-mcp.js produces mcp-server/ with node_modules
 * 2. .vscodeignore does NOT exclude mcp-server/node_modules
 * 3. Critical MCP dependencies are present after bundling
 * 4. config-generator produces correct output
 *
 * Run: node test/bundle-verify.test.js
 * Requires: npm run build:all first
 */
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const { describe, it, before, after } = require("node:test");
const os = require("os");

const EXT_ROOT = path.resolve(__dirname, "..");
const MCP_SERVER = path.join(EXT_ROOT, "mcp-server");
const VSCODEIGNORE = path.join(EXT_ROOT, ".vscodeignore");

// ── Bundle verification ────────────────────────────────────────────

describe("MCP server bundling", () => {
  before(() => {
    if (!fs.existsSync(MCP_SERVER)) {
      throw new Error(
        "mcp-server/ not found. Run `npm run build:all` before running tests.",
      );
    }
  });

  it("bundles build/index.js", () => {
    assert.ok(
      fs.existsSync(path.join(MCP_SERVER, "build", "index.js")),
      "mcp-server/build/index.js must exist",
    );
  });

  it("bundles package.json", () => {
    assert.ok(
      fs.existsSync(path.join(MCP_SERVER, "package.json")),
      "mcp-server/package.json must exist",
    );
  });

  it("bundles node_modules/", () => {
    assert.ok(
      fs.existsSync(path.join(MCP_SERVER, "node_modules")),
      "mcp-server/node_modules/ must exist after bundling",
    );
  });

  it("includes @modelcontextprotocol/sdk", () => {
    const sdkPath = path.join(
      MCP_SERVER,
      "node_modules",
      "@modelcontextprotocol",
      "sdk",
      "package.json",
    );
    assert.ok(
      fs.existsSync(sdkPath),
      "@modelcontextprotocol/sdk must be bundled in mcp-server/node_modules",
    );
  });

  it("includes minisearch", () => {
    const msPath = path.join(
      MCP_SERVER,
      "node_modules",
      "minisearch",
      "package.json",
    );
    assert.ok(
      fs.existsSync(msPath),
      "minisearch must be bundled in mcp-server/node_modules",
    );
  });

  it("includes gray-matter", () => {
    const gmPath = path.join(
      MCP_SERVER,
      "node_modules",
      "gray-matter",
      "package.json",
    );
    assert.ok(
      fs.existsSync(gmPath),
      "gray-matter must be bundled in mcp-server/node_modules",
    );
  });
});

// ── .vscodeignore verification ─────────────────────────────────────

describe(".vscodeignore", () => {
  let ignoreContent;

  before(() => {
    ignoreContent = fs.readFileSync(VSCODEIGNORE, "utf-8");
  });

  it("does NOT exclude mcp-server/node_modules", () => {
    const lines = ignoreContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const excludesMcpNodeModules = lines.some(
      (line) =>
        line === "mcp-server/node_modules/**" ||
        line === "mcp-server/node_modules/",
    );

    assert.ok(
      !excludesMcpNodeModules,
      ".vscodeignore must NOT exclude mcp-server/node_modules/** — " +
        "this causes ERR_MODULE_NOT_FOUND after installation",
    );
  });

  it("excludes extension's own node_modules", () => {
    assert.ok(
      ignoreContent.includes("node_modules/**"),
      ".vscodeignore should exclude the extension's own node_modules/**",
    );
  });

  it("excludes src/", () => {
    assert.ok(
      ignoreContent.includes("src/**"),
      ".vscodeignore should exclude src/** (TypeScript sources)",
    );
  });
});

// ── Config generator verification ──────────────────────────────────

describe("config-generator", () => {
  // Test using the compiled output
  const configGenPath = path.join(EXT_ROOT, "out", "mcp", "config-generator.js");
  let configGen;
  let tmpDir;

  before(() => {
    if (!fs.existsSync(configGenPath)) {
      throw new Error(
        "out/mcp/config-generator.js not found. Run `npm run build:ext` first.",
      );
    }
    configGen = require(configGenPath);
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mb-cfg-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function beforeEach(fn) {
    // node:test doesn't have beforeEach at top level in describe,
    // so we call setup in each test
  }
  function afterEach(fn) {}

  it("buildMcpConfigSnippet returns valid JSON with correct structure", () => {
    const snippet = configGen.buildMcpConfigSnippet(
      "/path/to/index.js",
      "/path/to/memory-bank",
    );
    const parsed = JSON.parse(snippet);

    assert.ok(parsed["memory-bank"], "snippet must have memory-bank key");
    assert.equal(parsed["memory-bank"].command, "node");
    assert.deepEqual(parsed["memory-bank"].args, ["/path/to/index.js"]);
    assert.equal(
      parsed["memory-bank"].env.MEMORY_BANK_PATH,
      "/path/to/memory-bank",
    );
  });

  it("generateCopilotMcpConfig creates .vscode/mcp.json when missing", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mb-cfg-test-"));
    try {
      await configGen.generateCopilotMcpConfig(tmp, "/ext/mcp-server/build/index.js");

      const cfg = JSON.parse(
        fs.readFileSync(path.join(tmp, ".vscode", "mcp.json"), "utf-8"),
      );
      assert.ok(cfg.servers["memory-bank"], "must create memory-bank entry");
      assert.deepEqual(cfg.servers["memory-bank"].args, [
        "/ext/mcp-server/build/index.js",
      ]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("generateCopilotMcpConfig updates stale path in existing config", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mb-cfg-test-"));
    try {
      // Write an existing config with an old version path
      const vscodeDir = path.join(tmp, ".vscode");
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(vscodeDir, "mcp.json"),
        JSON.stringify({
          servers: {
            "memory-bank": {
              command: "node",
              args: ["/old/path/vscode-memory-bank-0.3.0/mcp-server/build/index.js"],
              env: { MEMORY_BANK_PATH: "${workspaceFolder}/my-custom-path" },
            },
          },
        }),
      );

      // Run with new path
      await configGen.generateCopilotMcpConfig(
        tmp,
        "/new/path/vscode-memory-bank-0.3.1/mcp-server/build/index.js",
      );

      const cfg = JSON.parse(
        fs.readFileSync(path.join(vscodeDir, "mcp.json"), "utf-8"),
      );

      // Path must be updated
      assert.deepEqual(cfg.servers["memory-bank"].args, [
        "/new/path/vscode-memory-bank-0.3.1/mcp-server/build/index.js",
      ]);

      // Custom env must be preserved
      assert.equal(
        cfg.servers["memory-bank"].env.MEMORY_BANK_PATH,
        "${workspaceFolder}/my-custom-path",
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("generateCopilotMcpConfig preserves other servers in config", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mb-cfg-test-"));
    try {
      const vscodeDir = path.join(tmp, ".vscode");
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(vscodeDir, "mcp.json"),
        JSON.stringify({
          servers: {
            "other-server": {
              command: "python",
              args: ["server.py"],
            },
          },
        }),
      );

      await configGen.generateCopilotMcpConfig(tmp, "/ext/index.js");

      const cfg = JSON.parse(
        fs.readFileSync(path.join(vscodeDir, "mcp.json"), "utf-8"),
      );

      assert.ok(cfg.servers["other-server"], "must preserve other servers");
      assert.equal(cfg.servers["other-server"].command, "python");
      assert.ok(cfg.servers["memory-bank"], "must add memory-bank");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
