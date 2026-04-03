import * as path from "node:path";
import matter from "gray-matter";
const METADATA_RE = /\*\*(\w[\w\s]*?):\*\*\s*(.+)/g;
const CROSS_REF_RE = /\b(ADR-\d{4}|TASK-\d{3})\b/g;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const TAG_RE = /#([a-zA-Z][\w-]*)/g;
export function deriveId(filePath) {
    const stem = path.basename(filePath, ".md");
    // TASK-001-initial-scaffolding → TASK-001
    const taskMatch = stem.match(/^(TASK-\d{3})/);
    if (taskMatch)
        return taskMatch[1];
    // ADR-0001-additive-compatibility → ADR-0001
    const adrMatch = stem.match(/^(ADR-\d{4})/);
    if (adrMatch)
        return adrMatch[1];
    // projectbrief.md → projectbrief
    return stem;
}
export function deriveType(filePath, frontmatterType) {
    // YAML frontmatter type takes precedence
    if (frontmatterType) {
        const validTypes = ["core", "task", "decision", "structure"];
        if (validTypes.includes(frontmatterType)) {
            return frontmatterType;
        }
    }
    // Path-based detection (v1 compat)
    if (filePath.includes("tasks/"))
        return "task";
    if (filePath.includes("decisions/"))
        return "decision";
    // Filename-based detection (v2 flat directory)
    const basename = path.basename(filePath);
    if (basename.match(/^TASK-\d{3}/))
        return "task";
    if (basename.match(/^ADR-\d{4}/))
        return "decision";
    // ADR-0015/ADR-0025: only projectbrief is "core"; README is "structure"
    const stem = basename.replace(/\.md$/, "");
    if (stem === "projectbrief")
        return "core";
    if (stem === "README")
        return "structure";
    return "structure";
}
export function deriveTitle(id, content) {
    // Try to get the first H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match)
        return h1Match[1].trim();
    // Fall back to ID
    return id;
}
export function extractMetadata(content) {
    const metadata = {};
    let match;
    // Reset regex state
    METADATA_RE.lastIndex = 0;
    while ((match = METADATA_RE.exec(content)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        metadata[key] = value;
    }
    return metadata;
}
export function extractSections(content) {
    const sections = {};
    const lines = content.split("\n");
    let currentSection = "_preamble";
    let sectionLines = [];
    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+)$/);
        if (headingMatch) {
            // Save previous section
            sections[currentSection] = sectionLines.join("\n").trim();
            currentSection = headingMatch[1].trim();
            sectionLines = [];
        }
        else {
            sectionLines.push(line);
        }
    }
    // Save last section
    if (sectionLines.length > 0) {
        sections[currentSection] = sectionLines.join("\n").trim();
    }
    return sections;
}
export function extractCrossRefs(content) {
    const refs = new Set();
    let match;
    CROSS_REF_RE.lastIndex = 0;
    while ((match = CROSS_REF_RE.exec(content)) !== null) {
        refs.add(match[1]);
    }
    return Array.from(refs);
}
export function extractWikilinks(content) {
    const links = new Set();
    let match;
    WIKILINK_RE.lastIndex = 0;
    while ((match = WIKILINK_RE.exec(content)) !== null) {
        links.add(match[1].trim());
    }
    return Array.from(links);
}
export function extractInlineTags(content) {
    const tags = new Set();
    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(content)) !== null) {
        tags.add(match[1]);
    }
    return Array.from(tags);
}
/**
 * 3-tier status extraction: YAML frontmatter → **Status:** bold → ## Status: heading.
 * Returns the first non-empty match, or null if none found.
 */
export function extractStatus(bodyContent, frontmatterData) {
    // Tier 1: YAML frontmatter
    if (typeof frontmatterData.status === "string" && frontmatterData.status) {
        return frontmatterData.status;
    }
    // Tier 2: **Status:** bold inline metadata
    const inlineMetadata = extractMetadata(bodyContent);
    if (inlineMetadata["Status"]) {
        return inlineMetadata["Status"];
    }
    // Tier 3: ## Status: heading
    const headingMatch = bodyContent.match(/^##\s+Status:\s*(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim();
    }
    return null;
}
export function parseMarkdownFile(filePath, content) {
    const id = deriveId(filePath);
    // Try YAML frontmatter first
    let frontmatterData = {};
    let bodyContent = content;
    try {
        const parsed = matter(content);
        if (Object.keys(parsed.data).length > 0) {
            frontmatterData = parsed.data;
            bodyContent = parsed.content;
        }
    }
    catch {
        // Not valid frontmatter — use raw content
    }
    const type = deriveType(filePath, frontmatterData.type);
    const title = deriveTitle(id, bodyContent);
    // Extract metadata from both sources
    const inlineMetadata = extractMetadata(bodyContent);
    const metadata = { ...inlineMetadata };
    // Merge frontmatter into metadata
    for (const [key, value] of Object.entries(frontmatterData)) {
        if (typeof value === "string") {
            metadata[key] = value;
        }
    }
    const sections = extractSections(bodyContent);
    const crossRefs = extractCrossRefs(bodyContent);
    const wikilinks = extractWikilinks(bodyContent);
    // Tags: from frontmatter + inline
    const frontmatterTags = Array.isArray(frontmatterData.tags)
        ? frontmatterData.tags
        : [];
    const inlineTags = extractInlineTags(bodyContent);
    const tags = [...new Set([...frontmatterTags, ...inlineTags])];
    // Related: from frontmatter
    const related = Array.isArray(frontmatterData.related)
        ? frontmatterData.related
        : [];
    // Combine cross-refs with wikilinks for full reference list
    const allRefs = [...new Set([...crossRefs, ...wikilinks])];
    // Extract dates — frontmatter takes precedence
    // gray-matter parses YAML dates as Date objects, so coerce to ISO date string
    const fmCreated = frontmatterData.created;
    const fmUpdated = frontmatterData.updated;
    const createdAt = (fmCreated instanceof Date ? fmCreated.toISOString().slice(0, 10) : fmCreated) || metadata["Added"] || metadata["Date"] || null;
    const updatedAt = (fmUpdated instanceof Date ? fmUpdated.toISOString().slice(0, 10) : fmUpdated) || metadata["Updated"] || metadata["Date"] || null;
    // Extract status — frontmatter takes precedence, then **Status:**, then ## Status: heading
    const status = extractStatus(bodyContent, frontmatterData);
    return {
        id,
        type,
        title,
        status,
        filePath,
        content,
        metadata,
        sections,
        crossRefs: allRefs,
        tags,
        related,
        createdAt,
        updatedAt,
    };
}
export function isIndexFile(filePath) {
    return path.basename(filePath) === "_index.md";
}
//# sourceMappingURL=parser.js.map