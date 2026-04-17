import {
  ConnectionLineComponentProps,
  getBezierPath,
  Position,
} from '@xyflow/react';
import {
  getRoutedEdgePath,
  getAdjustedPerimeterRouteInput,
} from './edgeRouting';
import { isPerimeterHandleId } from '../components/perimeterHandles';

const PerimeterConnectionLine = ({
  connectionLineStyle,
  connectionStatus,
  fromHandle,
  fromPosition,
  fromX,
  fromY,
  toPosition,
  toX,
  toY,
}: ConnectionLineComponentProps) => {
  const usesPerimeterRouting = isPerimeterHandleId(fromHandle.id);

  const path = usesPerimeterRouting
    ? getRoutedEdgePath(
        getAdjustedPerimeterRouteInput({
          sourceX: fromX,
          sourceY: fromY,
          sourcePosition: fromPosition,
          targetX: toX,
          targetY: toY,
          targetPosition: toPosition ?? Position.Bottom,
        }),
      ).path
    : getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition ?? Position.Bottom,
      })[0];

  return (
    <path
      d={path}
      fill="none"
      className="react-flow__connection-path"
      style={{
        ...connectionLineStyle,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        opacity: connectionStatus === 'invalid' ? 0.45 : 0.9,
      }}
    />
  );
};

export default PerimeterConnectionLine;
