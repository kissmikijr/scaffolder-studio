import type { Edge } from '@xyflow/react';
import {
  elevateSelectedBaseEdges,
  SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
} from './edgeStacking';

const makeEdge = (overrides: Partial<Edge>): Edge =>
  ({
    id: 'e',
    source: 'source',
    target: 'target',
    ...overrides,
  } as Edge);

describe('elevateSelectedBaseEdges', () => {
  it('returns the original edges when nothing is selected', () => {
    const edges = [makeEdge({ id: 'edge-a' })];

    expect(elevateSelectedBaseEdges(edges)).toBe(edges);
  });

  it('raises non-relationship edges connected to the selected node', () => {
    const edges = [
      makeEdge({ id: 'selected-edge', source: 'property-a', target: 'step-a' }),
      makeEdge({ id: 'unrelated-edge', source: 'step-b', target: 'step-c' }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'selected-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
      }),
      expect.objectContaining({
        id: 'unrelated-edge',
      }),
    ]);
  });

  it('preserves relationship edges even when they touch the selected node', () => {
    const relationshipEdge = makeEdge({
      id: 'relationship-edge',
      source: 'property-a',
      target: 'step-a',
      type: 'relationship',
      zIndex: -3,
    });
    const dataRelationshipEdge = makeEdge({
      id: 'data-relationship-edge',
      source: 'property-a',
      target: 'step-a',
      type: 'custom-step',
      data: { isRelationship: true },
      zIndex: -1,
    });

    const result = elevateSelectedBaseEdges(
      [relationshipEdge, dataRelationshipEdge],
      'property-a',
    );

    expect(result[0]).toBe(relationshipEdge);
    expect(result[1]).toBe(dataRelationshipEdge);
  });

  it('does not lower already elevated connected edges', () => {
    const edges = [
      makeEdge({
        id: 'already-raised',
        source: 'property-a',
        target: 'step-a',
        zIndex: 2000,
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a');

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'already-raised',
        zIndex: 2000,
      }),
    );
  });
});
