import * as fs from "node:fs";
import * as path from "node:path";
export const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Abandoned"];
export const DECISION_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded", "Rejected"];
export function getMemoryBankPath() {
    return (process.env.MEMORY_BANK_PATH ||
        path.join(process.cwd(), "memory-bank"));
}
export function slugify(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
}
export function getNextId(dir, prefix, padding) {
    const filterRegex = new RegExp(`^${prefix}\\d{${padding}}`);
    const idRegex = new RegExp(`^${prefix}(\\d{${padding}})`);
    const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => filterRegex.test(f))
        : [];
    let maxNum = 0;
    for (const f of files) {
        const m = f.match(idRegex);
        if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum)
                maxNum = n;
        }
    }
    return `${prefix}${String(maxNum + 1).padStart(padding, "0")}`;
}
const DECISION_INDEX_CONFIG = {
    prefix: "ADR-",
    padding: 4,
    heading: "Decisions Index",
    statusOrder: DECISION_STATUSES,
    defaultStatus: "Proposed",
    showEmptyGroups: true,
};
const TASK_INDEX_CONFIG = {
    prefix: "TASK-",
    padding: 3,
    heading: "Tasks",
    statusOrder: ["In Progress", "Pending", "Completed", "Abandoned"],
    defaultStatus: "Pending",
    showEmptyGroups: false,
};
function updateIndex(dir, config) {
    const indexPath = path.join(dir, "_index.md");
    const filterRegex = new RegExp(`^${config.prefix}\\d{${config.padding}}`);
    const idRegex = new RegExp(`^(${config.prefix}\\d{${config.padding}})`);
    const files = fs
        .readdirSync(dir)
        .filter((f) => filterRegex.test(f) && f.endsWith(".md"));
    const items = [];
    for (const f of files) {
        const content = fs.readFileSync(path.join(dir, f), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
        const idMatch = f.match(idRegex);
        if (idMatch) {
            items.push({
                id: idMatch[1],
                title: titleMatch ? titleMatch[1].trim() : idMatch[1],
                status: statusMatch ? statusMatch[1].trim() : config.defaultStatus,
            });
        }
    }
    const groups = {};
    for (const item of items) {
        if (!groups[item.status])
            groups[item.status] = [];
        groups[item.status].push(item);
    }
    let md = `# ${config.heading}\n\n`;
    for (const status of config.statusOrder) {
        const group = groups[status];
        if (!config.showEmptyGroups && (!group || group.length === 0))
            continue;
        md += `## ${status}\n\n`;
        if (!group || group.length === 0) {
            md += `_None_\n\n`;
        }
        else {
            for (const item of group) {
                md += `- **${item.id}**: ${item.title}\n`;
            }
            md += "\n";
        }
    }
    fs.writeFileSync(indexPath, md);
}
export function updateDecisionIndex(decisionsDir) {
    updateIndex(decisionsDir, DECISION_INDEX_CONFIG);
}
export function updateTaskIndex(tasksDir) {
    updateIndex(tasksDir, TASK_INDEX_CONFIG);
}
//# sourceMappingURL=shared-utils.js.map