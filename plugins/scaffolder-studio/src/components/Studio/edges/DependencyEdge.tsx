import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useTheme, alpha } from '@mui/material';

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
  const theme = useTheme();
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
        stroke: alpha(theme.palette.text.secondary, 0.5),
        strokeWidth: 1.5,
        strokeDasharray: '6 4',
        strokeLinecap: 'round',
      }}
    />
  );
};

export default DependencyEdge;
