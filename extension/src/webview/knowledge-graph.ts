import * as vscode from "vscode";

export interface GraphNode {
  id: string;
  type: string;
  title: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class KnowledgeGraphPanel {
  public static currentPanel: KnowledgeGraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly mbRoot: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    mbRoot: vscode.Uri,
  ): void {
    const column = vscode.ViewColumn.Beside;

    if (KnowledgeGraphPanel.currentPanel) {
      KnowledgeGraphPanel.currentPanel.panel.reveal(column);
      KnowledgeGraphPanel.currentPanel.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "memoryBankGraph",
      "Memory Bank — Knowledge Graph",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    KnowledgeGraphPanel.currentPanel = new KnowledgeGraphPanel(
      panel,
      extensionUri,
      mbRoot,
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    mbRoot: vscode.Uri,
  ) {
    this.panel = panel;
    this.mbRoot = mbRoot;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg.command === "openFile") {
          const fileUri = vscode.Uri.joinPath(this.mbRoot, msg.path);
          vscode.window.showTextDocument(fileUri);
        }
      },
      null,
      this.disposables,
    );

    this.refresh();
  }

  public async refresh(): Promise<void> {
    const graph = await this.buildGraph();
    this.panel.webview.html = this.getHtml(graph);
  }

  private async buildGraph(): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const itemsById = new Map<string, GraphNode>();

    // Scan core files
    const coreFiles = [
      "projectbrief.md",
      "productContext.md",
      "systemPatterns.md",
      "techContext.md",
      "activeContext.md",
      "progress.md",
    ];

    for (const filename of coreFiles) {
      const id = filename.replace(".md", "");
      const uri = vscode.Uri.joinPath(this.mbRoot, filename);
      try {
        await vscode.workspace.fs.stat(uri);
        const node: GraphNode = { id, type: "core", title: id };
        nodes.push(node);
        itemsById.set(id, node);
      } catch {
        // file missing
      }
    }

    // Scan tasks
    const tasksDir = vscode.Uri.joinPath(this.mbRoot, "tasks");
    try {
      const taskEntries = await vscode.workspace.fs.readDirectory(tasksDir);
      for (const [name, type] of taskEntries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) continue;
        const uri = vscode.Uri.joinPath(tasksDir, name);
        const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
        const id = this.deriveId(name);
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch?.[1] ?? id;
        const node: GraphNode = { id, type: "task", title };
        nodes.push(node);
        itemsById.set(id, node);

        // Extract cross-references
        this.extractRefs(content, id, itemsById, edges);
      }
    } catch { /* no tasks dir */ }

    // Scan decisions
    const decisionsDir = vscode.Uri.joinPath(this.mbRoot, "decisions");
    try {
      const decEntries = await vscode.workspace.fs.readDirectory(decisionsDir);
      for (const [name, type] of decEntries) {
        if (type !== vscode.FileType.File || name === "_index.md" || !name.endsWith(".md")) continue;
        const uri = vscode.Uri.joinPath(decisionsDir, name);
        const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
        const id = this.deriveId(name);
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch?.[1] ?? id;
        const node: GraphNode = { id, type: "decision", title };
        nodes.push(node);
        itemsById.set(id, node);

        this.extractRefs(content, id, itemsById, edges);
      }
    } catch { /* no decisions dir */ }

    // Now extract refs from core files too
    for (const filename of coreFiles) {
      const uri = vscode.Uri.joinPath(this.mbRoot, filename);
      try {
        const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
        const id = filename.replace(".md", "");
        this.extractRefs(content, id, itemsById, edges);
      } catch { /* skip */ }
    }

    return { nodes, edges };
  }

  private deriveId(filename: string): string {
    const stem = filename.replace(".md", "");
    const taskMatch = stem.match(/^(TASK-\d+)/);
    if (taskMatch) return taskMatch[1];
    const adrMatch = stem.match(/^(ADR-\d+)/);
    if (adrMatch) return adrMatch[1];
    return stem;
  }

  private extractRefs(
    content: string,
    sourceId: string,
    itemsById: Map<string, GraphNode>,
    edges: GraphEdge[],
  ): void {
    const refPattern = /\b(TASK-\d+|ADR-\d{4})\b/g;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = refPattern.exec(content)) !== null) {
      const targetId = match[1];
      if (targetId === sourceId) continue;
      const key = `${sourceId}->${targetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (itemsById.has(targetId)) {
        edges.push({ source: sourceId, target: targetId, relation: "references" });
      }
    }
  }

  private getHtml(graph: GraphData): string {
    const graphJson = JSON.stringify(graph);
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Knowledge Graph</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); overflow: hidden; }
  canvas { display: block; width: 100vw; height: 100vh; }
  #legend { position: absolute; top: 12px; right: 12px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px 12px; font-size: 12px; }
  #legend div { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
  #legend .dot { width: 10px; height: 10px; border-radius: 50%; }
  #tooltip { position: absolute; display: none; background: var(--vscode-editorHoverWidget-background); border: 1px solid var(--vscode-editorHoverWidget-border); border-radius: 3px; padding: 4px 8px; font-size: 12px; pointer-events: none; }
</style>
</head>
<body>
<canvas id="canvas"></canvas>
<div id="legend">
  <div><span class="dot" style="background:#4fc1ff"></span> Core</div>
  <div><span class="dot" style="background:#6a9955"></span> Task</div>
  <div><span class="dot" style="background:#dcdcaa"></span> Decision</div>
</div>
<div id="tooltip"></div>
<script>
const vscode = acquireVsCodeApi();
const graph = ${graphJson};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); });

const COLORS = { core: '#4fc1ff', task: '#6a9955', decision: '#dcdcaa' };
const RADIUS = 22;

// Position nodes in a force-directed-ish layout using initial circle placement + iterations
const nodes = graph.nodes.map((n, i) => {
  const angle = (2 * Math.PI * i) / graph.nodes.length;
  const r = Math.min(W, H) * 0.32;
  return { ...n, x: W/2 + r * Math.cos(angle), y: H/2 + r * Math.sin(angle), vx: 0, vy: 0 };
});
const nodeMap = new Map(nodes.map(n => [n.id, n]));
const edges = graph.edges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));

// Simple force simulation
function simulate() {
  for (let iter = 0; iter < 200; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx*dx + dy*dy) || 1;
        let force = 8000 / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }
    // Attraction along edges
    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      let dx = t.x - s.x;
      let dy = t.y - s.y;
      let dist = Math.sqrt(dx*dx + dy*dy) || 1;
      let force = (dist - 120) * 0.02;
      let fx = (dx / dist) * force;
      let fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    }
    // Center gravity
    for (const n of nodes) {
      n.vx += (W/2 - n.x) * 0.001;
      n.vy += (H/2 - n.y) * 0.001;
      n.x += n.vx * 0.5;
      n.y += n.vy * 0.5;
      n.vx *= 0.9;
      n.vy *= 0.9;
      n.x = Math.max(RADIUS + 5, Math.min(W - RADIUS - 5, n.x));
      n.y = Math.max(RADIUS + 5, Math.min(H - RADIUS - 5, n.y));
    }
  }
}
simulate();

// Drag state
let dragging = null;
let offsetX = 0, offsetY = 0;

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Draw edges
  ctx.lineWidth = 1.5;
  for (const e of edges) {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    ctx.strokeStyle = 'rgba(150,150,150,0.5)';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();

    // Arrow
    const angle = Math.atan2(t.y - s.y, t.x - s.x);
    const ax = t.x - RADIUS * Math.cos(angle);
    const ay = t.y - RADIUS * Math.sin(angle);
    ctx.fillStyle = 'rgba(150,150,150,0.7)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8*Math.cos(angle-0.3), ay - 8*Math.sin(angle-0.3));
    ctx.lineTo(ax - 8*Math.cos(angle+0.3), ay - 8*Math.sin(angle+0.3));
    ctx.closePath();
    ctx.fill();

    // Edge label
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    ctx.fillStyle = 'rgba(150,150,150,0.8)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.relation, mx, my - 4);
  }

  // Draw nodes
  for (const n of nodes) {
    ctx.fillStyle = COLORS[n.type] || '#ccc';
    ctx.beginPath();
    ctx.arc(n.x, n.y, RADIUS, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#1e1e1e';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = n.id.length > 12 ? n.id.slice(0, 11) + '\u2026' : n.id;
    ctx.fillText(label, n.x, n.y);
  }

  requestAnimationFrame(draw);
}
draw();

function hitTest(mx, my) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = mx - n.x, dy = my - n.y;
    if (dx*dx + dy*dy <= RADIUS*RADIUS) return n;
  }
  return null;
}

canvas.addEventListener('mousedown', (e) => {
  const n = hitTest(e.offsetX, e.offsetY);
  if (n) { dragging = n; offsetX = e.offsetX - n.x; offsetY = e.offsetY - n.y; }
});
canvas.addEventListener('mousemove', (e) => {
  if (dragging) {
    dragging.x = e.offsetX - offsetX;
    dragging.y = e.offsetY - offsetY;
  }
  const n = hitTest(e.offsetX, e.offsetY);
  if (n) {
    tooltip.style.display = 'block';
    tooltip.style.left = (e.offsetX + 12) + 'px';
    tooltip.style.top = (e.offsetY + 12) + 'px';
    tooltip.textContent = n.title + ' (' + n.type + ')';
    canvas.style.cursor = 'pointer';
  } else {
    tooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  }
});
canvas.addEventListener('mouseup', () => { dragging = null; });
canvas.addEventListener('dblclick', (e) => {
  const n = hitTest(e.offsetX, e.offsetY);
  if (!n) return;
  let p;
  if (n.type === 'core') p = n.id + '.md';
  else if (n.type === 'task') p = 'tasks/' + n.id + '.md';
  else if (n.type === 'decision') p = 'decisions/' + n.id + '.md';
  if (p) vscode.postMessage({ command: 'openFile', path: p });
});
</script>
</body>
</html>`;
  }

  private dispose(): void {
    KnowledgeGraphPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
