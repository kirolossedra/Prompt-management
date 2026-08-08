import type { PromptRelation, VaultCollections } from "../types/domain";

export interface RelationshipGraphNode {
  id: string;
  title: string;
  taskName: string;
  endeavorId: string;
  endeavorName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RelationshipGraphGroup {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  promptIds: string[];
}

export interface RelationshipGraphEdge {
  id: string;
  parentPromptId: string;
  childPromptId: string;
  path: string;
  labelX: number;
  labelY: number;
}

export interface RelationshipGraphLayout {
  width: number;
  height: number;
  groups: RelationshipGraphGroup[];
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
}

function activeRelations(relations: Record<string, PromptRelation>) {
  return Object.values(relations).filter((relation) => !relation.archivedAt);
}

function pathExists(
  relations: Record<string, PromptRelation>,
  fromPromptId: string,
  toPromptId: string,
  excludeRelationId = "",
): boolean {
  const adjacency = new Map<string, string[]>();
  for (const relation of activeRelations(relations)) {
    if (relation.id === excludeRelationId) continue;
    const children = adjacency.get(relation.parentPromptId) || [];
    children.push(relation.childPromptId);
    adjacency.set(relation.parentPromptId, children);
  }
  const queue = [fromPromptId];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current === toPromptId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(adjacency.get(current) || []));
  }
  return false;
}

export function validatePromptRelation(
  data: Pick<VaultCollections, "prompts" | "promptRelations">,
  parentPromptId: string,
  childPromptId: string,
  excludeRelationId = "",
): { ok: true } | { ok: false; message: string } {
  const parent = data.prompts[parentPromptId];
  const child = data.prompts[childPromptId];
  if (!parent || parent.archivedAt) return { ok: false, message: "Select an active parent prompt." };
  if (!child || child.archivedAt) return { ok: false, message: "Select an active child prompt." };
  if (parentPromptId === childPromptId) return { ok: false, message: "A prompt cannot be inspired by itself." };
  const duplicate = activeRelations(data.promptRelations).some(
    (relation) => relation.id !== excludeRelationId && relation.parentPromptId === parentPromptId && relation.childPromptId === childPromptId,
  );
  if (duplicate) return { ok: false, message: "That inspired-by relationship already exists." };
  if (pathExists(data.promptRelations, childPromptId, parentPromptId, excludeRelationId)) {
    return { ok: false, message: "That link would create a circular inspiration chain." };
  }
  return { ok: true };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value: string, max = 36) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildRelationshipGraphLayout(data: VaultCollections): RelationshipGraphLayout {
  const prompts = Object.values(data.prompts).filter((prompt) => !prompt.archivedAt);
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const relations = activeRelations(data.promptRelations).filter(
    (relation) => promptById.has(relation.parentPromptId) && promptById.has(relation.childPromptId),
  );
  const relatedPromptIds = new Set<string>();
  relations.forEach((relation) => {
    relatedPromptIds.add(relation.parentPromptId);
    relatedPromptIds.add(relation.childPromptId);
  });

  const endeavorBuckets = new Map<string, string[]>();
  for (const promptId of relatedPromptIds) {
    const prompt = promptById.get(promptId);
    const task = prompt ? data.tasks[prompt.taskId] : undefined;
    const endeavorId = task?.endeavorId || "unassigned";
    const bucket = endeavorBuckets.get(endeavorId) || [];
    bucket.push(promptId);
    endeavorBuckets.set(endeavorId, bucket);
  }

  const groupWidth = 340;
  const groupGap = 82;
  const padding = 40;
  const headerHeight = 64;
  const nodeWidth = 300;
  const nodeHeight = 58;
  const nodeGap = 14;

  const groupEntries = [...endeavorBuckets.entries()].sort((a, b) => {
    const aName = data.endeavors[a[0]]?.name || "Unassigned";
    const bName = data.endeavors[b[0]]?.name || "Unassigned";
    return aName.localeCompare(bName);
  });

  const groups: RelationshipGraphGroup[] = [];
  const nodes: RelationshipGraphNode[] = [];
  let maxGroupHeight = 0;
  groupEntries.forEach(([endeavorId, promptIds], groupIndex) => {
    promptIds.sort((a, b) => (promptById.get(a)?.title || "").localeCompare(promptById.get(b)?.title || ""));
    const groupHeight = headerHeight + 20 + promptIds.length * nodeHeight + Math.max(0, promptIds.length - 1) * nodeGap + 24;
    maxGroupHeight = Math.max(maxGroupHeight, groupHeight);
    const x = padding + groupIndex * (groupWidth + groupGap);
    const y = padding;
    groups.push({
      id: endeavorId,
      name: data.endeavors[endeavorId]?.name || "Unassigned",
      x,
      y,
      width: groupWidth,
      height: groupHeight,
      promptIds,
    });
    promptIds.forEach((promptId, promptIndex) => {
      const prompt = promptById.get(promptId)!;
      const task = data.tasks[prompt.taskId];
      nodes.push({
        id: promptId,
        title: prompt.title,
        taskName: task?.name || "Unassigned task",
        endeavorId,
        endeavorName: data.endeavors[endeavorId]?.name || "Unassigned",
        x: x + 20,
        y: y + headerHeight + 18 + promptIndex * (nodeHeight + nodeGap),
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: RelationshipGraphEdge[] = relations.map((relation) => {
    const parent = nodeById.get(relation.parentPromptId)!;
    const child = nodeById.get(relation.childPromptId)!;
    const sameGroup = parent.endeavorId === child.endeavorId;
    let startX: number;
    let startY = parent.y + parent.height / 2;
    let endX: number;
    let endY = child.y + child.height / 2;
    let path: string;
    let labelX: number;
    let labelY: number;

    if (sameGroup) {
      startX = parent.x + parent.width;
      endX = child.x + child.width;
      const loopX = startX + 44;
      path = `M ${startX} ${startY} C ${loopX} ${startY}, ${loopX} ${endY}, ${endX} ${endY}`;
      labelX = loopX + 2;
      labelY = (startY + endY) / 2 - 5;
    } else {
      const leftToRight = parent.x < child.x;
      startX = leftToRight ? parent.x + parent.width : parent.x;
      endX = leftToRight ? child.x : child.x + child.width;
      const midX = (startX + endX) / 2;
      path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
      labelX = midX;
      labelY = (startY + endY) / 2 - 7;
    }
    return { id: relation.id, parentPromptId: relation.parentPromptId, childPromptId: relation.childPromptId, path, labelX, labelY };
  });

  return {
    width: Math.max(960, padding * 2 + groupEntries.length * groupWidth + Math.max(0, groupEntries.length - 1) * groupGap),
    height: Math.max(520, padding * 2 + maxGroupHeight),
    groups,
    nodes,
    edges,
  };
}

export function buildRelationshipMapSvg(data: VaultCollections): string {
  const layout = buildRelationshipGraphLayout(data);
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const groupMarkup = layout.groups.map((group) => `
    <g>
      <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="${group.x + 20}" y="${group.y + 34}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(truncate(group.name, 34))}</text>
      <text x="${group.x + 20}" y="${group.y + 52}" font-family="Inter, Arial, sans-serif" font-size="10" fill="#64748b">Endeavor · ${group.promptIds.length} related prompt${group.promptIds.length === 1 ? "" : "s"}</text>
    </g>`).join("");
  const edgeMarkup = layout.edges.map((edge) => {
    const parent = nodeById.get(edge.parentPromptId);
    const child = nodeById.get(edge.childPromptId);
    return `
    <g>
      <title>${escapeXml(parent?.title || "Prompt")} inspires ${escapeXml(child?.title || "Prompt")}</title>
      <path d="${edge.path}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" marker-end="url(#iv-arrow)" opacity="0.82"/>
      <rect x="${edge.labelX - 28}" y="${edge.labelY - 10}" width="56" height="18" rx="9" fill="#ede9fe" stroke="#c4b5fd"/>
      <text x="${edge.labelX}" y="${edge.labelY + 3}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="9" font-weight="700" fill="#6d28d9">inspires</text>
    </g>`;
  }).join("");
  const nodeMarkup = layout.nodes.map((node) => `
    <g>
      <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/>
      <circle cx="${node.x + 18}" cy="${node.y + 20}" r="5" fill="#7c3aed"/>
      <text x="${node.x + 32}" y="${node.y + 24}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${escapeXml(truncate(node.title, 39))}</text>
      <text x="${node.x + 18}" y="${node.y + 44}" font-family="Inter, Arial, sans-serif" font-size="9.5" fill="#64748b">${escapeXml(truncate(node.taskName, 44))}</text>
    </g>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="IntellectVault prompt inspiration relationship map">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <defs><marker id="iv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7c3aed"/></marker></defs>
  <text x="40" y="24" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="#475569">INTELLECTVAULT · PROMPT INSPIRATION MAP</text>
  ${groupMarkup}
  ${edgeMarkup}
  ${nodeMarkup}
</svg>`;
}

export function downloadRelationshipMapSvg(data: VaultCollections, fileName = "intellectvault-prompt-relationships.svg") {
  const svg = buildRelationshipMapSvg(data);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadRelationshipMapPng(data: VaultCollections, fileName = "intellectvault-prompt-relationships.png") {
  const svg = buildRelationshipMapSvg(data);
  const layout = buildRelationshipGraphLayout(data);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The relationship map could not be rendered as PNG."));
      image.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = layout.width * scale;
    canvas.height = layout.height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not prepare the PNG canvas.");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, layout.width, layout.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The PNG could not be generated.")), "image/png"));
    const pngUrl = URL.createObjectURL(pngBlob);
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
