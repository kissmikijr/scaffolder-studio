import { Position } from '@xyflow/react';
import { EDGE_ROUTING_STRATEGIES, getRoutedEdgePath } from '../edgeRouting';

const baseInput = {
  sourceX: 0,
  sourceY: 0,
  sourcePosition: Position.Right,
  targetX: 320,
  targetY: 0,
  targetPosition: Position.Left,
};

describe('edgeRouting', () => {
  it('always-smoothstep never returns a straight route', () => {
    const result = getRoutedEdgePath(baseInput, {
      strategy: EDGE_ROUTING_STRATEGIES.ALWAYS_SMOOTH_STEP,
    });

    expect(result.wasStraight).toBe(false);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('directional-smoothstep keeps smooth route and avoids straight mode', () => {
    const result = getRoutedEdgePath(
      {
        ...baseInput,
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      },
      {
        strategy: EDGE_ROUTING_STRATEGIES.DIRECTIONAL_SMOOTH_STEP,
      },
    );

    expect(result.wasStraight).toBe(false);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('hybrid-hysteresis enters straight mode when close enough', () => {
    const result = getRoutedEdgePath(
      {
        ...baseInput,
        targetY: 40,
      },
      {
        strategy: EDGE_ROUTING_STRATEGIES.HYBRID_HYSTERESIS,
        previousWasStraight: false,
      },
    );

    expect(result.wasStraight).toBe(true);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('hybrid-hysteresis keeps straight mode in hysteresis band', () => {
    const result = getRoutedEdgePath(
      {
        ...baseInput,
        targetY: 80,
      },
      {
        strategy: EDGE_ROUTING_STRATEGIES.HYBRID_HYSTERESIS,
        previousWasStraight: true,
      },
    );

    expect(result.wasStraight).toBe(true);
  });

  it('hybrid-hysteresis exits straight mode when far from alignment', () => {
    const result = getRoutedEdgePath(
      {
        ...baseInput,
        targetY: 120,
      },
      {
        strategy: EDGE_ROUTING_STRATEGIES.HYBRID_HYSTERESIS,
        previousWasStraight: true,
      },
    );

    expect(result.wasStraight).toBe(false);
    expect(result.path.length).toBeGreaterThan(0);
  });
});
