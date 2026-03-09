import type { Edge } from '@xyflow/react';
import { buildZenFocusSets } from './zenMode';

describe('buildZenFocusSets', () => {
  const relationshipEdges: Edge[] = [
    { id: 'rel-a-b', source: 'a', target: 'b' } as Edge,
    { id: 'rel-a-c', source: 'a', target: 'c' } as Edge,
    { id: 'rel-d-e', source: 'd', target: 'e' } as Edge,
    { id: 'rel-c-f', source: 'c', target: 'f' } as Edge,
  ];

  it('returns empty sets when no node is selected', () => {
    const result = buildZenFocusSets(undefined, relationshipEdges);

    expect(result.nodeIds).toEqual(new Set());
    expect(result.edgeIds).toEqual(new Set());
  });

  it('focuses the selected node and directly connected relationship neighbors', () => {
    const result = buildZenFocusSets('a', relationshipEdges);

    expect(result.nodeIds).toEqual(new Set(['a', 'b', 'c']));
    expect(result.edgeIds).toEqual(new Set(['rel-a-b', 'rel-a-c']));
  });

  it('does not include transitive second-hop nodes/edges', () => {
    const result = buildZenFocusSets('a', relationshipEdges);

    expect(result.nodeIds.has('f')).toBe(false);
    expect(result.edgeIds.has('rel-c-f')).toBe(false);
  });
});
