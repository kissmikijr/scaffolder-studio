import { Position } from '@xyflow/react';

export const PERIMETER_HANDLE_DIAMETER = 14;
export const PERIMETER_HANDLE_OUTSET = 10;
export const PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET = 8;
export const PERIMETER_HANDLE_EMPHASIS_SCALE = 1.14;

export const getPerimeterHandleOutset = (isSelected = false): number =>
  isSelected
    ? PERIMETER_HANDLE_OUTSET + PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET
    : PERIMETER_HANDLE_OUTSET;

const PERIMETER_HANDLE_IDS = new Set(['top', 'right', 'bottom', 'left']);

export const isPerimeterHandleId = (
  handleId?: string | null,
): handleId is 'top' | 'right' | 'bottom' | 'left' =>
  Boolean(handleId && PERIMETER_HANDLE_IDS.has(handleId));

export const offsetPointTowardNode = ({
  x,
  y,
  position,
  distance = PERIMETER_HANDLE_OUTSET,
}: {
  x: number;
  y: number;
  position?: Position | null;
  distance?: number;
}) => {
  switch (position) {
    case Position.Top:
      return { x, y: y + distance };
    case Position.Right:
      return { x: x - distance, y };
    case Position.Bottom:
      return { x, y: y - distance };
    case Position.Left:
      return { x: x + distance, y };
    default:
      return { x, y };
  }
};

/** Selected outset applies only to source handles; targets stay anchored to the node border. */
export const shouldUseSelectedPerimeterOutset = ({
  type,
  isNodeSelected,
  pairedSourceOnSameSide: _pairedSourceOnSameSide,
}: {
  type: 'source' | 'target';
  isNodeSelected: boolean;
  pairedSourceOnSameSide: boolean;
}): boolean => isNodeSelected && type === 'source';

export const getPerimeterHandleTransform = (
  position: Position,
  scale = 1,
  isSelected = false,
): string => {
  const scaleSuffix = scale === 1 ? '' : ` scale(${scale})`;
  const offset = getPerimeterHandleOutset(isSelected);

  switch (position) {
    case Position.Top:
      return `translate(-50%, calc(-50% - ${offset}px))${scaleSuffix}`;
    case Position.Right:
      return `translate(calc(50% + ${offset}px), -50%)${scaleSuffix}`;
    case Position.Bottom:
      return `translate(-50%, calc(50% + ${offset}px))${scaleSuffix}`;
    case Position.Left:
      return `translate(calc(-50% - ${offset}px), -50%)${scaleSuffix}`;
    default:
      return scale === 1
        ? 'translate(-50%, -50%)'
        : `translate(-50%, -50%)${scaleSuffix}`;
  }
};

export const getPerimeterHandleRenderState = ({
  disabled,
  type,
  pairedSourceOnSameSide,
  isNodeHovered,
  isNodeSelected,
  isConnectionInProgress,
  isActiveSourceHandle,
  isValidConnectionTarget,
  isHoveredHandle,
}: {
  disabled: boolean;
  type: 'source' | 'target';
  pairedSourceOnSameSide: boolean;
  isNodeHovered: boolean;
  isNodeSelected: boolean;
  isConnectionInProgress: boolean;
  isActiveSourceHandle: boolean;
  isValidConnectionTarget: boolean;
  isHoveredHandle: boolean;
}) => {
  if (disabled) {
    return { visible: false, emphasized: false };
  }

  if (isConnectionInProgress) {
    const visible = isActiveSourceHandle || isValidConnectionTarget;
    const emphasized =
      isActiveSourceHandle || (isValidConnectionTarget && isHoveredHandle);
    return { visible, emphasized };
  }

  if (type === 'target' && pairedSourceOnSameSide) {
    return { visible: false, emphasized: false };
  }

  const visible = isNodeHovered || isNodeSelected;
  return { visible, emphasized: visible && isHoveredHandle };
};
