import type { Edge } from '@xyflow/react';
import {
  PERIMETER_HANDLE_OUTSET,
  PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET,
} from '../components/perimeterHandles';
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

const SELECTED_VISIBLE_SOURCE_TARGET_OFFSET_DISTANCE =
  PERIMETER_HANDLE_OUTSET - PERIMETER_HANDLE_SELECTED_EXTRA_OUTSET - 12;

describe('elevateSelectedBaseEdges', () => {
  it('returns the original edges when nothing is selected', () => {
    const edges = [makeEdge({ id: 'edge-a' })];

    expect(elevateSelectedBaseEdges(edges)).toBe(edges);
  });

  it('raises non-relationship edges connected to the selected node', () => {
    const edges = [
      makeEdge({
        id: 'selected-edge',
        source: 'property-a',
        sourceHandle: 'right',
        target: 'step-a',
        targetHandle: 'left',
      }),
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

  it('keeps selected source perimeter endpoints on the border', () => {
    const edges = [
      makeEdge({
        id: 'outgoing-edge',
        source: 'property-a',
        sourceHandle: 'right',
        target: 'step-a',
        targetHandle: 'left',
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a');

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'outgoing-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
      }),
    );
  });

  it('keeps selected target endpoints on the border', () => {
    const edges = [
      makeEdge({
        id: 'incoming-edge',
        source: 'step-a',
        sourceHandle: 'right',
        target: 'property-a',
        targetHandle: 'left',
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a');

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'incoming-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
      }),
    );
    expect(result[0]).not.toHaveProperty('data');
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
        sourceHandle: 'right',
        target: 'step-a',
        targetHandle: 'left',
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

  it('keeps the selected target endpoint on the border when connected to the selected node', () => {
    const edges = [
      makeEdge({
        id: 'hidden-target-edge',
        source: 'step-a',
        sourceHandle: 'right',
        target: 'property-a',
        targetHandle: 'left',
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a', false);

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'hidden-target-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
      }),
    );
    expect(result[0]).not.toHaveProperty('data');
  });

  it('moves the selected target endpoint outward when the node has a visible selected source handle', () => {
    const edges = [
      makeEdge({
        id: 'selected-target-edge',
        source: 'step-a',
        sourceHandle: 'right',
        target: 'property-a',
        targetHandle: 'left',
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a', true);

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'selected-target-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
        data: expect.objectContaining({
          targetOffsetDistance: SELECTED_VISIBLE_SOURCE_TARGET_OFFSET_DISTANCE,
        }),
      }),
    );
  });

  it('does not add endpoint offsets for non-perimeter handles', () => {
    const edges = [
      makeEdge({
        id: 'relationship-edge',
        source: 'property-a',
        sourceHandle: 'property-relationship-output',
        target: 'step-a',
        targetHandle: 'in:repoUrl',
      }),
    ];

    const result = elevateSelectedBaseEdges(edges, 'property-a');

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'relationship-edge',
        zIndex: SELECTED_NODE_CONNECTED_EDGE_Z_INDEX,
      }),
    );
  });
});
