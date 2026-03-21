import type { Edge } from '@xyflow/react';

export const SELECTED_NODE_CONNECTED_EDGE_Z_INDEX = 1004;

const isRelationshipLikeEdge = (edge: Edge): boolean =>
  edge.type === 'relationship' || Boolean((edge.data as any)?.isRelationship);

export const elevateSelectedBaseEdges = (
  edges: Edge[],
  selectedNodeId?: string,
): Edge[] => {
  if (!selectedNodeId) {
    return edges;
  }

  return edges.map(edge => {
    if (isRelationshipLikeEdge(edge)) {
      return edge;
    }

    const isConnectedToSelectedNode =
      edge.source === selectedNodeId || edge.target === selectedNodeId;

    if (!isConnectedToSelectedNode) {
      return edge;
    }

    const baseZIndex = typeof edge.zIndex === 'number' ? edge.zIndex : 0;

    return {
      ...edge,
      zIndex: Math.max(baseZIndex, SELECTED_NODE_CONNECTED_EDGE_Z_INDEX),
    };
  });
};
