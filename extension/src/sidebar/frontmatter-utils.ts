import * as vscode from "vscode";

export interface Relation {
  targetId: string;
  relationType: string; // "related" (from frontmatter) or "references" (from cross-refs/wikilinks)
}

/** Extract status from YAML frontmatter or **Status:** metadata. */
export function extractStatus(content: string): string {
  // Try YAML frontmatter first
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const statusLine = fmMatch[1].match(/^status\s*:\s*(.+)$/m);
    if (statusLine) {
      return statusLine[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  // Fall back to **Status:** pattern
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (statusMatch) return statusMatch[1].trim();

  // Fall back to ## Status: heading pattern
  const headingMatch = content.match(/^##\s+Status:\s*(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return "Unknown";
}

/** Extract tags from YAML frontmatter. */
export function extractTags(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return [];

  const tags: string[] = [];
  const lines = fmMatch[1].split(/\r?\n/);
  let inTags = false;

  for (const line of lines) {
    // tags: [inline, array]
    const inlineMatch = line.match(/^tags\s*:\s*\[(.+)\]/);
    if (inlineMatch) {
      return inlineMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, ""));
    }
    // tags:
    if (/^tags\s*:/.test(line)) {
      inTags = true;
      continue;
    }
    if (inTags) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        tags.push(itemMatch[1].trim().replace(/^["']|["']$/g, ""));
      } else {
        inTags = false;
      }
    }
  }

  return tags;
}

/** Extract title from YAML frontmatter or H1 heading. */
export function extractTitle(content: string, fileId: string): string {
  // Try YAML frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const titleLine = fmMatch[1].match(/^title\s*:\s*(.+)$/m);
    if (titleLine) {
      return titleLine[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  // Fall back to H1 heading, strip ID prefix
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const heading = h1Match[1].trim();
    // Strip ID prefix like "TASK-001: " or "ADR-0001: "
    const stripped = heading.replace(/^(TASK-\d+|ADR-\d{4}):\s*/, "");
    if (stripped && stripped !== heading) {
      return stripped;
    }
    // If no prefix was stripped but heading differs from fileId, use it
    if (heading !== fileId) {
      return heading;
    }
  }

  return fileId;
}

/** Extract related IDs from YAML frontmatter `related:` field. */
function extractRelated(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return [];

  const related: string[] = [];
  const lines = fmMatch[1].split(/\r?\n/);
  let inRelated = false;

  for (const line of lines) {
    // related: [inline, array]
    const inlineMatch = line.match(/^related\s*:\s*\[(.+)\]/);
    if (inlineMatch) {
      return inlineMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, ""));
    }
    // related:
    if (/^related\s*:/.test(line)) {
      inRelated = true;
      continue;
    }
    if (inRelated) {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        related.push(itemMatch[1].trim().replace(/^["']|["']$/g, ""));
      } else {
        inRelated = false;
      }
    }
  }

  return related;
}

/** Extract cross-references (TASK-NNN, ADR-NNNN) from body text. */
function extractCrossRefs(content: string, selfId: string): string[] {
  // Get body after frontmatter
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const matches = body.match(/\b(TASK-\d{3}|ADR-\d{4})\b/g);
  if (!matches) return [];
  return [...new Set(matches)].filter((id) => id !== selfId);
}

/** Extract [[wikilinks]] from body text. */
function extractWikilinks(content: string): string[] {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const links: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    links.push(m[1]);
  }
  return [...new Set(links)];
}

/** Build combined relations from frontmatter `related:`, cross-refs, and wikilinks. */
export function buildRelations(content: string, selfId: string): Relation[] {
  const relatedIds = new Set(extractRelated(content));
  const crossRefs = extractCrossRefs(content, selfId);
  const wikilinks = extractWikilinks(content);

  const seen = new Set<string>();
  const relations: Relation[] = [];

  // Related (from frontmatter) takes priority
  for (const id of relatedIds) {
    if (id === selfId || seen.has(id)) continue;
    seen.add(id);
    relations.push({ targetId: id, relationType: "related" });
  }

  // Cross-refs and wikilinks as "references"
  for (const id of [...crossRefs, ...wikilinks]) {
    if (id === selfId || seen.has(id)) continue;
    seen.add(id);
    relations.push({ targetId: id, relationType: "references" });
  }

  return relations;
}

/** Format description string from status and tags. */
export function buildDescription(parts: string[]): string {
  return parts.filter(Boolean).join(" \u00B7 ");
}

/** Tree item for relation children (expandable under tasks/decisions). */
export class RelationItem extends vscode.TreeItem {
  constructor(
    public readonly targetId: string,
    public readonly relationType: string,
    public readonly mbRoot: vscode.Uri,
  ) {
    super(targetId, vscode.TreeItemCollapsibleState.None);

    this.description = relationType;
    this.tooltip = `${relationType}: ${targetId}`;
    this.iconPath = new vscode.ThemeIcon(
      "link",
      new vscode.ThemeColor("charts.purple"),
    );

    const targetFile = targetId.endsWith(".md") ? targetId : `${targetId}.md`;
    this.command = {
      command: "vscode.open",
      title: "Open Related Item",
      arguments: [vscode.Uri.joinPath(mbRoot, targetFile)],
    };

    this.contextValue = "memoryBankRelation";
  }
}
