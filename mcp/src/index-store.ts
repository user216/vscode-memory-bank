import * as fs from "node:fs";
import * as path from "node:path";
import MiniSearch from "minisearch";
import { parseMarkdownFile, isIndexFile, extractCrossRefs } from "./parser.js";
import type { ParsedItem } from "./types.js";

export interface LinkEntry {
  target: string;
  relation: string;
}

export interface IncomingLinkEntry {
  source: string;
  relation: string;
}

export interface IndexStore {
  items: Map<string, ParsedItem>;
  search: MiniSearch;
  outgoing: Map<string, LinkEntry[]>;
  incoming: Map<string, IncomingLinkEntry[]>;
  tags: Map<string, Set<string>>;
  memoryBankPath: string;
}

let store: IndexStore | null = null;

export function getStore(): IndexStore {
  if (!store) {
    throw new Error("Store not initialized. Call initStore() first.");
  }
  return store;
}

export function initStore(memoryBankPath: string): IndexStore {
  const search = new MiniSearch({
    fields: ["title", "content"],
    storeFields: ["id", "title", "type"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  store = {
    items: new Map(),
    search,
    outgoing: new Map(),
    incoming: new Map(),
    tags: new Map(),
    memoryBankPath,
  };

  // Scan and index all markdown files
  const files = collectMarkdownFiles(memoryBankPath);
  for (const filePath of files) {
    const relativePath = path.relative(memoryBankPath, filePath);
    if (isIndexFile(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMarkdownFile(relativePath, content);
    addItemToStore(store, parsed);
  }

  // Build cross-reference links
  syncCrossRefs(store);

  console.error(`Store initialized: ${store.items.size} items from ${memoryBankPath}`);
  return store;
}

/**
 * Clear and rebuild an existing store from disk.
 * Preserves the same object reference (watcher-safe).
 */
export function resetStore(s: IndexStore): void {
  s.items.clear();
  s.search.removeAll();
  s.outgoing.clear();
  s.incoming.clear();
  s.tags.clear();

  const files = collectMarkdownFiles(s.memoryBankPath);
  for (const filePath of files) {
    const relativePath = path.relative(s.memoryBankPath, filePath);
    if (isIndexFile(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMarkdownFile(relativePath, content);
    addItemToStore(s, parsed);
  }
  syncCrossRefs(s);
  console.error(`Store reset: ${s.items.size} items from ${s.memoryBankPath}`);
}

export function addItemToStore(s: IndexStore, parsed: ParsedItem): void {
  // Remove existing entry if present (for re-indexing)
  if (s.items.has(parsed.id)) {
    removeItemFromStore(s, parsed.id);
  }

  s.items.set(parsed.id, parsed);

  // Add to MiniSearch
  s.search.add({
    id: parsed.id,
    title: parsed.title,
    content: parsed.content,
    type: parsed.type,
  });

  // Add tags
  for (const tag of parsed.tags) {
    if (!s.tags.has(tag)) {
      s.tags.set(tag, new Set());
    }
    s.tags.get(tag)!.add(parsed.id);
  }

  // Add related links from frontmatter
  for (const relatedId of parsed.related) {
    addLinkToStore(s, parsed.id, relatedId, "related");
  }
}

export function removeItemFromStore(s: IndexStore, id: string): void {
  const existing = s.items.get(id);
  if (!existing) return;

  // Remove from MiniSearch
  try {
    s.search.remove({ id, title: existing.title, content: existing.content, type: existing.type });
  } catch {
    // Item might not be in search index
  }

  // Remove tags
  for (const tag of existing.tags) {
    const tagSet = s.tags.get(tag);
    if (tagSet) {
      tagSet.delete(id);
      if (tagSet.size === 0) {
        s.tags.delete(tag);
      }
    }
  }

  // Remove all outgoing links
  const outLinks = s.outgoing.get(id) || [];
  for (const link of outLinks) {
    const inLinks = s.incoming.get(link.target);
    if (inLinks) {
      const idx = inLinks.findIndex((l) => l.source === id && l.relation === link.relation);
      if (idx !== -1) inLinks.splice(idx, 1);
      if (inLinks.length === 0) s.incoming.delete(link.target);
    }
  }
  s.outgoing.delete(id);

  // Remove all incoming links
  const inLinks = s.incoming.get(id) || [];
  for (const link of inLinks) {
    const outLinksForSource = s.outgoing.get(link.source);
    if (outLinksForSource) {
      const idx = outLinksForSource.findIndex((l) => l.target === id && l.relation === link.relation);
      if (idx !== -1) outLinksForSource.splice(idx, 1);
      if (outLinksForSource.length === 0) s.outgoing.delete(link.source);
    }
  }
  s.incoming.delete(id);

  s.items.delete(id);
}

export function addLinkToStore(
  s: IndexStore,
  source: string,
  target: string,
  relation: string,
): boolean {
  // Check for duplicate
  const existing = s.outgoing.get(source) || [];
  if (existing.some((l) => l.target === target && l.relation === relation)) {
    return false; // Already exists
  }

  // Add outgoing
  if (!s.outgoing.has(source)) {
    s.outgoing.set(source, []);
  }
  s.outgoing.get(source)!.push({ target, relation });

  // Add incoming
  if (!s.incoming.has(target)) {
    s.incoming.set(target, []);
  }
  s.incoming.get(target)!.push({ source, relation });

  return true;
}

export function removeLinkFromStore(
  s: IndexStore,
  source: string,
  target: string,
  relation: string,
): boolean {
  const outLinks = s.outgoing.get(source);
  if (!outLinks) return false;

  const outIdx = outLinks.findIndex((l) => l.target === target && l.relation === relation);
  if (outIdx === -1) return false;

  outLinks.splice(outIdx, 1);
  if (outLinks.length === 0) s.outgoing.delete(source);

  const inLinks = s.incoming.get(target);
  if (inLinks) {
    const inIdx = inLinks.findIndex((l) => l.source === source && l.relation === relation);
    if (inIdx !== -1) inLinks.splice(inIdx, 1);
    if (inLinks.length === 0) s.incoming.delete(target);
  }

  return true;
}

export function reindexFile(s: IndexStore, filePath: string): void {
  const relativePath = path.relative(s.memoryBankPath, filePath);
  if (isIndexFile(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseMarkdownFile(relativePath, content);

  addItemToStore(s, parsed);

  // Re-sync cross-refs for this item
  syncCrossRefsForItem(s, parsed);

  console.error(`Re-indexed: ${relativePath}`);
}

export function generateExcerpt(content: string, query: string, maxLength = 200): string {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0 && !["and", "or", "not"].includes(t));
  const lower = content.toLowerCase();

  // Find first occurrence of any search term
  let bestPos = 0;
  for (const term of terms) {
    // Strip prefix wildcard asterisk for matching
    const cleanTerm = term.replace(/\*$/, "");
    const pos = lower.indexOf(cleanTerm);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  // Extract window around match
  const start = Math.max(0, bestPos - 50);
  const end = Math.min(content.length, start + maxLength);
  let excerpt = content.slice(start, end).trim();

  // Add ellipsis
  if (start > 0) excerpt = "..." + excerpt;
  if (end < content.length) excerpt += "...";

  // Highlight matches with >>> / <<<
  for (const term of terms) {
    const cleanTerm = term.replace(/\*$/, "");
    if (cleanTerm.length === 0) continue;
    const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped}\\w*)`, "gi");
    excerpt = excerpt.replace(re, ">>>$1<<<");
  }

  return excerpt;
}

function syncCrossRefs(s: IndexStore): void {
  const existingIds = new Set(s.items.keys());

  for (const item of s.items.values()) {
    const refs = extractCrossRefs(item.content);
    for (const ref of refs) {
      if (ref !== item.id && existingIds.has(ref)) {
        addLinkToStore(s, item.id, ref, "references");
      }
    }
  }
}

function syncCrossRefsForItem(s: IndexStore, parsed: ParsedItem): void {
  // Remove old auto-detected references from this item
  const outLinks = s.outgoing.get(parsed.id);
  if (outLinks) {
    const refsToRemove = outLinks.filter((l) => l.relation === "references");
    for (const ref of refsToRemove) {
      removeLinkFromStore(s, parsed.id, ref.target, "references");
    }
  }

  // Add new references
  const existingIds = new Set(s.items.keys());
  for (const ref of parsed.crossRefs) {
    if (ref !== parsed.id && existingIds.has(ref)) {
      addLinkToStore(s, parsed.id, ref, "references");
    }
  }
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith(".")) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

export function watchMemoryBank(s: IndexStore): fs.FSWatcher {
  const watcher = fs.watch(
    s.memoryBankPath,
    { recursive: true },
    (eventType, filename) => {
      if (!filename || !filename.endsWith(".md")) return;

      const fullPath = path.join(s.memoryBankPath, filename);

      if (!fs.existsSync(fullPath)) {
        // File deleted — remove from index
        const id = path.basename(filename, ".md").match(/^(TASK-\d{3}|ADR-\d{4})/)?.[1]
          || path.basename(filename, ".md");
        if (s.items.has(id)) {
          removeItemFromStore(s, id);
          console.error(`Removed from index: ${filename}`);
        }
        return;
      }

      if (isIndexFile(fullPath)) return;

      console.error(`File changed: ${filename}, re-indexing...`);
      try {
        reindexFile(s, fullPath);
      } catch (err) {
        console.error(`Error indexing ${filename}:`, err);
      }
    },
  );

  console.error(`Watching for changes in ${s.memoryBankPath}`);
  return watcher;
}
