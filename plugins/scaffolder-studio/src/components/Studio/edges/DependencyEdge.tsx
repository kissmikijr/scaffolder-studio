import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import type { CSSProperties } from 'react';

export const shouldRenderRelationshipMarker = (
  data?: EdgeProps['data'],
): boolean => {
  const edgeData = data as { sourceKind?: string } | undefined;
  return edgeData?.sourceKind !== 'parameter';
};

const DependencyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  style,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const mergedStyle: CSSProperties = {
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    transition:
      'stroke 160ms ease, stroke-width 160ms ease, opacity 160ms ease, stroke-dasharray 160ms ease',
    ...(style as CSSProperties),
  };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={shouldRenderRelationshipMarker(data) ? markerEnd : undefined}
      style={mergedStyle}
    />
  );
};

export default DependencyEdge;
