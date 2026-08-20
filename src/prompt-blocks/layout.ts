import { topologicalOrder } from "./graph";
import type { PromptBlockConnection, PromptBlockNodeDefinition } from "../types/domain";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 142;
const HORIZONTAL_GAP = 116;
const VERTICAL_GAP = 72;
const ORIGIN_X = 72;
const ORIGIN_Y = 72;

const FAMILY_ORDER: Record<PromptBlockNodeDefinition["family"], number> = {
  input: 0,
  constraint: 1,
  transform: 2,
  output: 3,
};

function compareBlocks(a: PromptBlockNodeDefinition, b: PromptBlockNodeDefinition): number {
  const family = FAMILY_ORDER[a.family] - FAMILY_ORDER[b.family];
  if (family) return family;
  return a.variableLabel.localeCompare(b.variableLabel, undefined, { numeric: true }) || a.label.localeCompare(b.label);
}

/**
 * Produce a deterministic, readable left-to-right layout for a Prompt Blocks DAG.
 *
 * The function is deliberately pure: it never mutates the supplied pipeline and
 * only changes block positions. Saved pipeline semantics/configuration remain intact.
 */
export function beautifyPromptBlockLayout(
  blocks: Record<string, PromptBlockNodeDefinition>,
  connections: Record<string, PromptBlockConnection>,
): Record<string, PromptBlockNodeDefinition> {
  const blockIds = Object.keys(blocks);
  if (!blockIds.length) return {};

  const topological = topologicalOrder(blocks, connections);
  const order = topological.length === blockIds.length
    ? topological
    : [...blockIds].sort((a, b) => compareBlocks(blocks[a], blocks[b]));

  const parents = new Map<string, string[]>();
  blockIds.forEach((id) => parents.set(id, []));
  Object.values(connections).forEach((connection) => {
    if (!blocks[connection.sourceBlockId] || !blocks[connection.targetBlockId]) return;
    parents.get(connection.targetBlockId)?.push(connection.sourceBlockId);
  });

  const rank = new Map<string, number>();
  order.forEach((id) => {
    const upstream = parents.get(id) || [];
    const nextRank = upstream.length
      ? Math.max(...upstream.map((parentId) => rank.get(parentId) ?? 0)) + 1
      : 0;
    rank.set(id, nextRank);
  });

  const groups = new Map<number, PromptBlockNodeDefinition[]>();
  order.forEach((id) => {
    const column = rank.get(id) ?? 0;
    const group = groups.get(column) || [];
    group.push(blocks[id]);
    groups.set(column, group);
  });

  const sortedColumns = [...groups.keys()].sort((a, b) => a - b);
  const maxColumnHeight = Math.max(
    ...sortedColumns.map((column) => {
      const count = groups.get(column)?.length || 0;
      return count ? count * NODE_HEIGHT + Math.max(0, count - 1) * VERTICAL_GAP : 0;
    }),
  );

  const positioned: Record<string, PromptBlockNodeDefinition> = {};
  sortedColumns.forEach((column) => {
    const columnBlocks = [...(groups.get(column) || [])].sort(compareBlocks);
    const columnHeight = columnBlocks.length * NODE_HEIGHT + Math.max(0, columnBlocks.length - 1) * VERTICAL_GAP;
    const startY = ORIGIN_Y + Math.max(0, (maxColumnHeight - columnHeight) / 2);

    columnBlocks.forEach((block, index) => {
      positioned[block.id] = {
        ...block,
        position: {
          x: ORIGIN_X + column * (NODE_WIDTH + HORIZONTAL_GAP),
          y: Math.round(startY + index * (NODE_HEIGHT + VERTICAL_GAP)),
        },
      };
    });
  });

  return positioned;
}
