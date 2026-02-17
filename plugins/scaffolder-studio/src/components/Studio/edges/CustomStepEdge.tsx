import React from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';
import {
  DEFAULT_EDGE_ROUTING_STRATEGY,
  EdgeRoutingStrategy,
  getRoutedEdgePath,
} from './edgeRouting';

const CustomStepEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) => {
  const wasStraightRef = React.useRef(false);
  const edgeData = data as
    | { routingStrategy?: EdgeRoutingStrategy }
    | undefined;

  const { path: edgePath, wasStraight } = getRoutedEdgePath(
    {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    },
    {
      strategy: edgeData?.routingStrategy ?? DEFAULT_EDGE_ROUTING_STRATEGY,
      previousWasStraight: wasStraightRef.current,
    },
  );

  wasStraightRef.current = wasStraight;

  const mergedStyle: React.CSSProperties = {
    ...(style as React.CSSProperties),
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    opacity: selected ? 1 : 0.92,
  };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={mergedStyle}
    />
  );
};

export default CustomStepEdge;
