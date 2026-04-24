import type { Edge } from '@xyflow/react';
import {
  PERIMETER_HANDLE_OUTSET,
  PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET,
  isPerimeterHandleId,
} from '../components/perimeterHandles';

export const SELECTED_NODE_CONNECTED_EDGE_Z_INDEX = 1004;
const SELECTED_NODE_VISIBLE_SOURCE_TARGET_OFFSET_DISTANCE =
  PERIMETER_HANDLE_OUTSET - PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET - 12;

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
    const shouldMoveSelectedTargetEndpoint =
      selectedNodeHasVisibleOutwardSourceHandle &&
      edge.target === selectedNodeId &&
      isPerimeterHandleId(edge.targetHandle);

    if (!shouldMoveSelectedTargetEndpoint) {
      return {
        ...edge,
        zIndex: Math.max(baseZIndex, SELECTED_NODE_CONNECTED_EDGE_Z_INDEX),
      };
    }

    return {
      ...edge,
      zIndex: Math.max(baseZIndex, SELECTED_NODE_CONNECTED_EDGE_Z_INDEX),
      data: {
        ...(edge.data as Record<string, unknown> | undefined),
        targetOffsetDistance:
          SELECTED_NODE_VISIBLE_SOURCE_TARGET_OFFSET_DISTANCE,
      },
    };
  });
};
