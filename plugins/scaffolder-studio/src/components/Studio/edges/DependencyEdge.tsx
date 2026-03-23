import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

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
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={shouldRenderRelationshipMarker(data) ? markerEnd : undefined}
      style={{
        strokeWidth: 2.5,
        strokeLinecap: 'round',
      }}
    />
  );
};

export default DependencyEdge;
