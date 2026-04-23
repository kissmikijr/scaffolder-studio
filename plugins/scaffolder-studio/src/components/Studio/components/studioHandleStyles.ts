import type { CSSProperties } from 'react';
import { Position } from '@xyflow/react';
import type { Theme } from '@mui/material/styles';

/** Stacking order for perimeter handles on shared node edges (sources and targets). */
const PERIMETER_HANDLE_Z_INDEX: Record<Position, number> = {
  [Position.Top]: 99999,
  [Position.Right]: 9600,
  [Position.Bottom]: 99999,
  [Position.Left]: 4600,
};

/**
 * Visual/interaction defaults for all studio perimeter {@link Handle} components.
 * Merged in Handle after base perimeter styling; callers can still override via `style`.
 */
export function getStudioPerimeterHandleInteractionStyle(
  theme: Theme,
  type: 'source' | 'target',
  position: Position,
): CSSProperties {
  const shared: CSSProperties = {
    cursor: 'crosshair',
    boxShadow: 'none',
    zIndex: PERIMETER_HANDLE_Z_INDEX[position],
  };
  if (type === 'source') {
    return {
      ...shared,
      backgroundColor: theme.palette.background.paper,
      pointerEvents: 'all',
    };
  }
  return shared;
}

/** Shared chrome for ad-hoc {@link @xyflow/react#Handle} instances (e.g. relationship outputs). */
export function getStudioRelationshipHandleBaseStyle(
  theme: Theme,
): CSSProperties {
  return {
    cursor: 'crosshair',
    boxShadow: 'none',
    pointerEvents: 'all',
    backgroundColor: theme.palette.background.paper,
    zIndex: 4600,
  };
}
