import type { Edge } from '@xyflow/react';
import {
  getPerimeterHandleOutset,
  isPerimeterHandleId,
} from '../components/perimeterHandles';

export const SELECTED_NODE_CONNECTED_EDGE_Z_INDEX = 1004;
const SELECTED_NODE_TARGET_ENDPOINT_OFFSET = -(
  getPerimeterHandleOutset(true) - getPerimeterHandleOutset(false)
);

const isRelationshipLikeEdge = (edge: Edge): boolean =>
  edge.type === 'relationship' || Boolean((edge.data as any)?.isRelationship);

export const elevateSelectedBaseEdges = (
  edges: Edge[],
  selectedNodeId?: string,
  selectedNodeHasVisibleOutwardSourceHandle = false,
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
      data:
        edge.target === selectedNodeId &&
        selectedNodeHasVisibleOutwardSourceHandle &&
        isPerimeterHandleId(edge.targetHandle)
          ? {
              ...(edge.data as Record<string, unknown> | undefined),
              targetOffsetDistance: SELECTED_NODE_TARGET_ENDPOINT_OFFSET,
            }
          : edge.data,
      zIndex: Math.max(baseZIndex, SELECTED_NODE_CONNECTED_EDGE_Z_INDEX),
    };
  });
};
