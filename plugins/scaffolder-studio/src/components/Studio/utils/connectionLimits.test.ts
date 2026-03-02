import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '../types';
import {
  countIncomingConnections,
  countOutgoingConnections,
  getTemplateOutgoingSlots,
} from './connectionLimits';

const makeEdge = (overrides: Partial<Edge>): Edge =>
  ({
    id: 'e',
    source: 'a',
    target: 'b',
    ...overrides,
  } as Edge);

const makeNode = (id: string, type: string): Node<AllNodeData> =>
  ({
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  } as Node<AllNodeData>);

describe('connectionLimits', () => {
  it('ignores relationship-like edges in connection counts', () => {
    const edges: Edge[] = [
      makeEdge({
        id: 'structural',
        source: 'a',
        target: 'b',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'dependency',
        source: 'a',
        target: 'b',
        type: 'dependency',
      }),
      makeEdge({
        id: 'relationship-type',
        source: 'a',
        target: 'b',
        type: 'relationship',
      }),
      makeEdge({
        id: 'relationship-data',
        source: 'a',
        target: 'b',
        type: 'custom-step',
        data: { kind: 'relationship' },
      }),
    ];

    expect(countOutgoingConnections(edges, 'a')).toBe(1);
    expect(countIncomingConnections(edges, 'b')).toBe(1);
  });

  it('ignores relationship-like edges for template outgoing slots', () => {
    const nodes: Node<AllNodeData>[] = [
      makeNode('template', 'template'),
      makeNode('step', 'step'),
      makeNode('params', 'parameters'),
      makeNode('output', 'templateOutput'),
    ];
    const edges: Edge[] = [
      makeEdge({
        id: 'dep-step',
        source: 'template',
        target: 'step',
        type: 'dependency',
      }),
      makeEdge({
        id: 'structural-params',
        source: 'template',
        target: 'params',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'data-relationship-output',
        source: 'template',
        target: 'output',
        type: 'custom-step',
        data: { isRelationship: true },
      }),
    ];

    const slots = getTemplateOutgoingSlots('template', edges, nodes);
    expect(slots.hasStep).toBe(false);
    expect(slots.hasParameters).toBe(true);
    expect(slots.hasOutput).toBe(false);
  });
});
