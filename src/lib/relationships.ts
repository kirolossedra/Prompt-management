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

export interface RelationshipRoutePoint {
  x: number;
  y: number;
}

export interface RelationshipGraphEdge {
  id: string;
  parentPromptId: string;
  childPromptId: string;
  path: string;
  labelX: number;
  labelY: number;
  routePoints: RelationshipRoutePoint[];
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

interface GroupGraph {
  ids: string[];
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
}

function buildGroupGraph(
  endeavorIds: string[],
  relations: PromptRelation[],
  promptEndeavor: Map<string, string>,
): GroupGraph {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  endeavorIds.forEach((id) => {
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  });

  relations.forEach((relation) => {
    const parentGroup = promptEndeavor.get(relation.parentPromptId);
    const childGroup = promptEndeavor.get(relation.childPromptId);
    if (!parentGroup || !childGroup || parentGroup === childGroup) return;
    outgoing.get(parentGroup)?.add(childGroup);
    incoming.get(childGroup)?.add(parentGroup);
  });

  return { ids: endeavorIds, outgoing, incoming };
}

function stronglyConnectedComponents(graph: GroupGraph): string[][] {
  let nextIndex = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indexById = new Map<string, number>();
  const lowById = new Map<string, number>();
  const components: string[][] = [];

  function visit(id: string) {
    indexById.set(id, nextIndex);
    lowById.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    for (const neighbor of graph.outgoing.get(id) || []) {
      if (!indexById.has(neighbor)) {
        visit(neighbor);
        lowById.set(id, Math.min(lowById.get(id)!, lowById.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowById.set(id, Math.min(lowById.get(id)!, indexById.get(neighbor)!));
      }
    }

    if (lowById.get(id) !== indexById.get(id)) return;
    const component: string[] = [];
    while (stack.length) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === id) break;
    }
    components.push(component);
  }

  graph.ids.forEach((id) => {
    if (!indexById.has(id)) visit(id);
  });
  return components;
}

function assignGroupRanks(graph: GroupGraph): Map<string, number> {
  const components = stronglyConnectedComponents(graph);
  const componentByGroup = new Map<string, number>();
  components.forEach((members, index) => members.forEach((id) => componentByGroup.set(id, index)));

  const componentOutgoing = new Map<number, Set<number>>();
  const componentIncomingCount = new Map<number, number>();
  components.forEach((_, index) => {
    componentOutgoing.set(index, new Set());
    componentIncomingCount.set(index, 0);
  });

  graph.ids.forEach((from) => {
    const fromComponent = componentByGroup.get(from)!;
    for (const to of graph.outgoing.get(from) || []) {
      const toComponent = componentByGroup.get(to)!;
      if (fromComponent === toComponent || componentOutgoing.get(fromComponent)!.has(toComponent)) continue;
      componentOutgoing.get(fromComponent)!.add(toComponent);
      componentIncomingCount.set(toComponent, (componentIncomingCount.get(toComponent) || 0) + 1);
    }
  });

  const queue = [...componentIncomingCount.entries()]
    .filter(([, count]) => count === 0)
    .map(([index]) => index)
    .sort((a, b) => a - b);
  const componentRank = new Map<number, number>();
  components.forEach((_, index) => componentRank.set(index, 0));

  while (queue.length) {
    const current = queue.shift()!;
    const rank = componentRank.get(current) || 0;
    for (const child of componentOutgoing.get(current) || []) {
      componentRank.set(child, Math.max(componentRank.get(child) || 0, rank + 1));
      const nextCount = (componentIncomingCount.get(child) || 0) - 1;
      componentIncomingCount.set(child, nextCount);
      if (nextCount === 0) queue.push(child);
    }
  }

  const groupRanks = new Map<string, number>();
  components.forEach((members, componentIndex) => {
    const rank = componentRank.get(componentIndex) || 0;
    members.forEach((id) => groupRanks.set(id, rank));
  });
  return groupRanks;
}

function orderGroupsWithinRanks(
  ids: string[],
  ranks: Map<string, number>,
  graph: GroupGraph,
  groupName: (id: string) => string,
): Map<number, string[]> {
  const byRank = new Map<number, string[]>();
  ids.forEach((id) => {
    const rank = ranks.get(id) || 0;
    const bucket = byRank.get(rank) || [];
    bucket.push(id);
    byRank.set(rank, bucket);
  });

  const maxRank = Math.max(0, ...byRank.keys());
  for (let rank = 0; rank <= maxRank; rank += 1) {
    const bucket = byRank.get(rank) || [];
    if (rank === 0) {
      bucket.sort((a, b) => groupName(a).localeCompare(groupName(b)));
      continue;
    }
    const previous = byRank.get(rank - 1) || [];
    const previousPosition = new Map(previous.map((id, index) => [id, index]));
    bucket.sort((a, b) => {
      const parentAverage = (id: string) => {
        const positions = [...(graph.incoming.get(id) || [])]
          .map((parent) => previousPosition.get(parent))
          .filter((value): value is number => value !== undefined);
        if (!positions.length) return Number.POSITIVE_INFINITY;
        return positions.reduce((sum, value) => sum + value, 0) / positions.length;
      };
      const delta = parentAverage(a) - parentAverage(b);
      return Number.isFinite(delta) && delta !== 0 ? delta : groupName(a).localeCompare(groupName(b));
    });
  }

  return byRank;
}

function orthogonalPath(points: RelationshipRoutePoint[]): string {
  if (!points.length) return "";
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    if (previous.y === point.y) return `${path} H ${point.x}`;
    if (previous.x === point.x) return `${path} V ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, "");
}

function segmentIntersectsRect(
  a: RelationshipRoutePoint,
  b: RelationshipRoutePoint,
  group: RelationshipGraphGroup,
  margin = 0,
): boolean {
  const left = group.x - margin;
  const right = group.x + group.width + margin;
  const top = group.y - margin;
  const bottom = group.y + group.height + margin;

  if (a.x === b.x) {
    if (a.x <= left || a.x >= right) return false;
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return maxY > top && minY < bottom;
  }
  if (a.y === b.y) {
    if (a.y <= top || a.y >= bottom) return false;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    return maxX > left && minX < right;
  }
  return false;
}

export function edgeCrossesUnrelatedGroup(
  edge: RelationshipGraphEdge,
  groups: RelationshipGraphGroup[],
  nodeById: Map<string, RelationshipGraphNode>,
): boolean {
  const parentGroupId = nodeById.get(edge.parentPromptId)?.endeavorId;
  const childGroupId = nodeById.get(edge.childPromptId)?.endeavorId;
  for (const group of groups) {
    if (group.id === parentGroupId || group.id === childGroupId) continue;
    for (let index = 1; index < edge.routePoints.length; index += 1) {
      if (segmentIntersectsRect(edge.routePoints[index - 1], edge.routePoints[index], group, 2)) return true;
    }
  }
  return false;
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

  const promptEndeavor = new Map<string, string>();
  const endeavorBuckets = new Map<string, string[]>();
  for (const promptId of relatedPromptIds) {
    const prompt = promptById.get(promptId);
    const task = prompt ? data.tasks[prompt.taskId] : undefined;
    const endeavorId = task?.endeavorId || "unassigned";
    promptEndeavor.set(promptId, endeavorId);
    const bucket = endeavorBuckets.get(endeavorId) || [];
    bucket.push(promptId);
    endeavorBuckets.set(endeavorId, bucket);
  }

  const groupWidth = 360;
  const columnGap = 118;
  const rowGap = 56;
  const canvasPaddingX = 40;
  const headerHeight = 64;
  const nodeWidth = 300;
  const nodeHeight = 58;
  const nodeGap = 14;
  const nodeLeftInset = 20;
  const nodeRightGutter = groupWidth - nodeLeftInset - nodeWidth;

  const endeavorIds = [...endeavorBuckets.keys()];
  const groupName = (id: string) => data.endeavors[id]?.name || "Unassigned";
  const groupGraph = buildGroupGraph(endeavorIds, relations, promptEndeavor);
  const ranks = assignGroupRanks(groupGraph);
  const groupsByRank = orderGroupsWithinRanks(endeavorIds, ranks, groupGraph, groupName);
  const maxRank = Math.max(0, ...groupsByRank.keys());

  const groupHeightById = new Map<string, number>();
  endeavorBuckets.forEach((promptIds, endeavorId) => {
    promptIds.sort((a, b) => (promptById.get(a)?.title || "").localeCompare(promptById.get(b)?.title || ""));
    groupHeightById.set(
      endeavorId,
      headerHeight + 20 + promptIds.length * nodeHeight + Math.max(0, promptIds.length - 1) * nodeGap + 24,
    );
  });

  const longOrReverseRelations = relations.filter((relation) => {
    const parentGroup = promptEndeavor.get(relation.parentPromptId)!;
    const childGroup = promptEndeavor.get(relation.childPromptId)!;
    if (parentGroup === childGroup) return false;
    const parentRank = ranks.get(parentGroup) || 0;
    const childRank = ranks.get(childGroup) || 0;
    return childRank - parentRank !== 1;
  });
  const externalLaneStep = 18;
  const externalLaneTop = 38;
  const graphStartY = externalLaneTop + Math.max(1, longOrReverseRelations.length) * externalLaneStep + 36;

  const columnHeights = new Map<number, number>();
  for (let rank = 0; rank <= maxRank; rank += 1) {
    const ids = groupsByRank.get(rank) || [];
    const height = ids.reduce((sum, id, index) => sum + (groupHeightById.get(id) || 0) + (index ? rowGap : 0), 0);
    columnHeights.set(rank, height);
  }
  const tallestColumn = Math.max(0, ...columnHeights.values());

  const groups: RelationshipGraphGroup[] = [];
  const nodes: RelationshipGraphNode[] = [];
  const groupById = new Map<string, RelationshipGraphGroup>();

  for (let rank = 0; rank <= maxRank; rank += 1) {
    const ids = groupsByRank.get(rank) || [];
    const columnHeight = columnHeights.get(rank) || 0;
    let y = graphStartY + Math.max(0, (tallestColumn - columnHeight) / 2);
    const x = canvasPaddingX + rank * (groupWidth + columnGap);

    ids.forEach((endeavorId) => {
      const promptIds = endeavorBuckets.get(endeavorId) || [];
      const groupHeight = groupHeightById.get(endeavorId) || 0;
      const group: RelationshipGraphGroup = {
        id: endeavorId,
        name: groupName(endeavorId),
        x,
        y,
        width: groupWidth,
        height: groupHeight,
        promptIds,
      };
      groups.push(group);
      groupById.set(endeavorId, group);

      promptIds.forEach((promptId, promptIndex) => {
        const prompt = promptById.get(promptId)!;
        const task = data.tasks[prompt.taskId];
        nodes.push({
          id: promptId,
          title: prompt.title,
          taskName: task?.name || "Unassigned task",
          endeavorId,
          endeavorName: group.name,
          x: x + nodeLeftInset,
          y: y + headerHeight + 18 + promptIndex * (nodeHeight + nodeGap),
          width: nodeWidth,
          height: nodeHeight,
        });
      });
      y += groupHeight + rowGap;
    });
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacentLaneUse = new Map<string, number>();
  let externalLaneIndex = 0;

  const edges: RelationshipGraphEdge[] = relations.map((relation) => {
    const parent = nodeById.get(relation.parentPromptId)!;
    const child = nodeById.get(relation.childPromptId)!;
    const parentGroup = groupById.get(parent.endeavorId)!;
    const childGroup = groupById.get(child.endeavorId)!;
    const parentRank = ranks.get(parent.endeavorId) || 0;
    const childRank = ranks.get(child.endeavorId) || 0;
    const sameGroup = parent.endeavorId === child.endeavorId;
    const routePoints: RelationshipRoutePoint[] = [];
    let labelX = 0;
    let labelY = 0;

    if (sameGroup) {
      const startX = parent.x + parent.width;
      const endX = child.x + child.width;
      const startY = parent.y + parent.height / 2;
      const endY = child.y + child.height / 2;
      const laneX = parentGroup.x + parentGroup.width - Math.max(18, nodeRightGutter / 2);
      routePoints.push(
        { x: startX, y: startY },
        { x: laneX, y: startY },
        { x: laneX, y: endY },
        { x: endX, y: endY },
      );
      labelX = laneX;
      labelY = (startY + endY) / 2 - 7;
    } else if (childRank - parentRank === 1) {
      const leftToRight = parentGroup.x < childGroup.x;
      const startX = leftToRight ? parent.x + parent.width : parent.x;
      const endX = leftToRight ? child.x : child.x + child.width;
      const startY = parent.y + parent.height / 2;
      const endY = child.y + child.height / 2;
      const leftBoundary = leftToRight ? parentGroup.x + parentGroup.width : childGroup.x + childGroup.width;
      const rightBoundary = leftToRight ? childGroup.x : parentGroup.x;
      const gapKey = `${Math.min(parentRank, childRank)}:${Math.max(parentRank, childRank)}`;
      const useIndex = adjacentLaneUse.get(gapKey) || 0;
      adjacentLaneUse.set(gapKey, useIndex + 1);
      const laneSlots = 5;
      const slot = (useIndex % laneSlots) - Math.floor(laneSlots / 2);
      const laneX = (leftBoundary + rightBoundary) / 2 + slot * 11;
      routePoints.push(
        { x: startX, y: startY },
        { x: laneX, y: startY },
        { x: laneX, y: endY },
        { x: endX, y: endY },
      );
      labelX = laneX;
      labelY = (startY + endY) / 2 - 7;
    } else {
      const leftToRight = parentGroup.x < childGroup.x;
      const startX = leftToRight ? parent.x + parent.width : parent.x;
      const endX = leftToRight ? child.x : child.x + child.width;
      const startY = parent.y + parent.height / 2;
      const endY = child.y + child.height / 2;
      const sourceExitX = leftToRight
        ? parentGroup.x + parentGroup.width + columnGap * 0.22
        : parentGroup.x - columnGap * 0.22;
      const targetEntryX = leftToRight
        ? childGroup.x - columnGap * 0.22
        : childGroup.x + childGroup.width + columnGap * 0.22;
      const laneY = externalLaneTop + externalLaneIndex * externalLaneStep;
      externalLaneIndex += 1;
      routePoints.push(
        { x: startX, y: startY },
        { x: sourceExitX, y: startY },
        { x: sourceExitX, y: laneY },
        { x: targetEntryX, y: laneY },
        { x: targetEntryX, y: endY },
        { x: endX, y: endY },
      );
      labelX = (sourceExitX + targetEntryX) / 2;
      labelY = laneY - 7;
    }

    return {
      id: relation.id,
      parentPromptId: relation.parentPromptId,
      childPromptId: relation.childPromptId,
      path: orthogonalPath(routePoints),
      labelX,
      labelY,
      routePoints,
    };
  });

  const width = Math.max(
    960,
    canvasPaddingX * 2 + (maxRank + 1) * groupWidth + Math.max(0, maxRank) * columnGap,
  );
  const height = Math.max(520, graphStartY + tallestColumn + 44);

  return { width, height, groups, nodes, edges };
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
      <path d="${edge.path}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#iv-arrow)" opacity="0.82"/>
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="EurekaVault prompt inspiration relationship map">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <defs><marker id="iv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7c3aed"/></marker></defs>
  <text x="40" y="24" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="#475569">EUREKAVAULT · PROMPT INSPIRATION MAP</text>
  ${groupMarkup}
  ${edgeMarkup}
  ${nodeMarkup}
</svg>`;
}

export function downloadRelationshipMapSvg(data: VaultCollections, fileName = "eurekavault-prompt-relationships.svg") {
  const svg = buildRelationshipMapSvg(data);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadRelationshipMapPng(data: VaultCollections, fileName = "eurekavault-prompt-relationships.png") {
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
