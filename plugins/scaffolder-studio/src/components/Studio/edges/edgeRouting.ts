import { Position, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import { offsetPointTowardNode } from '../components/perimeterHandles';

export const EDGE_ROUTING_STRATEGIES = {
  ALWAYS_SMOOTH_STEP: 'always-smoothstep',
  DIRECTIONAL_SMOOTH_STEP: 'directional-smoothstep',
  HYBRID_HYSTERESIS: 'hybrid-hysteresis',
} as const;

export type EdgeRoutingStrategy =
  (typeof EDGE_ROUTING_STRATEGIES)[keyof typeof EDGE_ROUTING_STRATEGIES];

export const DEFAULT_EDGE_ROUTING_STRATEGY: EdgeRoutingStrategy =
  EDGE_ROUTING_STRATEGIES.ALWAYS_SMOOTH_STEP;

type EdgeRoutingInput = {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
};

type EdgeRoutingOptions = {
  strategy?: EdgeRoutingStrategy;
  previousWasStraight?: boolean;
};

type EdgeRoutingResult = {
  path: string;
  wasStraight: boolean;
};

export const getAdjustedPerimeterRouteInput = (input: EdgeRoutingInput) => {
  const adjustedSource = offsetPointTowardNode({
    x: input.sourceX,
    y: input.sourceY,
    position: input.sourcePosition,
  });
  const adjustedTarget = offsetPointTowardNode({
    x: input.targetX,
    y: input.targetY,
    position: input.targetPosition,
  });

  return {
    ...input,
    sourceX: adjustedSource.x,
    sourceY: adjustedSource.y,
    targetX: adjustedTarget.x,
    targetY: adjustedTarget.y,
  };
};

// The previous edge router switched exactly at 70px and could flicker when dragging.
// We keep that baseline only for the hybrid strategy and add a hysteresis band.
const LEGACY_SWITCH_THRESHOLD = 70;
const HYBRID_ENTER_STRAIGHT_THRESHOLD = LEGACY_SWITCH_THRESHOLD - 14;
const HYBRID_EXIT_STRAIGHT_THRESHOLD = LEGACY_SWITCH_THRESHOLD + 14;

const getSmoothStepPathByDirection = (
  input: EdgeRoutingInput,
  directional: boolean,
) => {
  const isMostlyHorizontal =
    input.sourcePosition === Position.Left ||
    input.sourcePosition === Position.Right;

  const getOffset = () => {
    if (!directional) return 20;
    return isMostlyHorizontal ? 24 : 18;
  };
  const offset = getOffset();
  const borderRadius = directional ? 10 : 8;

  const [path] = getSmoothStepPath({
    sourceX: input.sourceX,
    sourceY: input.sourceY,
    sourcePosition: input.sourcePosition,
    targetX: input.targetX,
    targetY: input.targetY,
    targetPosition: input.targetPosition,
    borderRadius,
    offset,
  });

  return path;
};

const getStraightPathForInput = (input: EdgeRoutingInput) => {
  const [path] = getStraightPath({
    sourceX: input.sourceX,
    sourceY: input.sourceY,
    targetX: input.targetX,
    targetY: input.targetY,
  });

  return path;
};

const isRoughlyAligned = (input: EdgeRoutingInput, threshold: number) =>
  Math.abs(input.sourceY - input.targetY) < threshold ||
  Math.abs(input.sourceX - input.targetX) < threshold;

export const getRoutedEdgePath = (
  input: EdgeRoutingInput,
  options: EdgeRoutingOptions = {},
): EdgeRoutingResult => {
  const strategy = options.strategy ?? DEFAULT_EDGE_ROUTING_STRATEGY;

  if (strategy === EDGE_ROUTING_STRATEGIES.ALWAYS_SMOOTH_STEP) {
    return {
      path: getSmoothStepPathByDirection(input, false),
      wasStraight: false,
    };
  }

  if (strategy === EDGE_ROUTING_STRATEGIES.DIRECTIONAL_SMOOTH_STEP) {
    return {
      path: getSmoothStepPathByDirection(input, true),
      wasStraight: false,
    };
  }

  const shouldUseStraight = options.previousWasStraight
    ? isRoughlyAligned(input, HYBRID_EXIT_STRAIGHT_THRESHOLD)
    : isRoughlyAligned(input, HYBRID_ENTER_STRAIGHT_THRESHOLD);

  if (shouldUseStraight) {
    return {
      path: getStraightPathForInput(input),
      wasStraight: true,
    };
  }

  return {
    path: getSmoothStepPathByDirection(input, false),
    wasStraight: false,
  };
};
