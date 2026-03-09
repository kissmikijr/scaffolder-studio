import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

const DependencyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
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
      markerEnd={markerEnd}
      style={{
        strokeWidth: 2.5,
        strokeLinecap: 'round',
      }}
    />
  );
};

export default DependencyEdge;
