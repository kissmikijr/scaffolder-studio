import type { Edge } from '@xyflow/react';

export type ZenFocusSets = {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
};

export const buildZenFocusSets = (
  selectedNodeId: string | undefined,
  relationshipEdges: Edge[],
): ZenFocusSets => {
  if (!selectedNodeId) {
    return {
      nodeIds: new Set<string>(),
      edgeIds: new Set<string>(),
    };
  }

  const nodeIds = new Set<string>([selectedNodeId]);
  const edgeIds = new Set<string>();

  for (const edge of relationshipEdges) {
    if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
      edgeIds.add(edge.id);
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  }

  return { nodeIds, edgeIds };
};
