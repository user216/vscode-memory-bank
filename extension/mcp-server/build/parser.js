import * as path from "node:path";
const METADATA_RE = /\*\*(\w[\w\s]*?):\*\*\s*(.+)/g;
const CROSS_REF_RE = /\b(ADR-\d{4}|TASK-\d{3})\b/g;
const HEADING_RE = /^##\s+(.+)$/gm;
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
export function deriveType(filePath) {
    if (filePath.includes("tasks/"))
        return "task";
    if (filePath.includes("decisions/"))
        return "decision";
    return "core";
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
export function parseMarkdownFile(filePath, content) {
    const id = deriveId(filePath);
    const type = deriveType(filePath);
    const title = deriveTitle(id, content);
    const metadata = extractMetadata(content);
    const sections = extractSections(content);
    const crossRefs = extractCrossRefs(content);
    // Extract dates from metadata
    const createdAt = metadata["Added"] || metadata["Date"] || null;
    const updatedAt = metadata["Updated"] || metadata["Date"] || null;
    // Extract status from metadata
    const status = metadata["Status"] || null;
    return {
        id,
        type,
        title,
        status,
        filePath,
        content,
        metadata,
        sections,
        crossRefs,
        createdAt,
        updatedAt,
    };
}
export function isIndexFile(filePath) {
    return path.basename(filePath) === "_index.md";
}
//# sourceMappingURL=parser.js.map