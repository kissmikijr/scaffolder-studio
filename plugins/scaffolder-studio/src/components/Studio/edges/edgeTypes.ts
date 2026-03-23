import { MarkerType } from '@xyflow/react';

/**
 * Default edge options applied to all new edges
 */
export const defaultEdgeOptions = {
  type: 'custom-step',
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
  style: {
    strokeWidth: 2,
  },
};
