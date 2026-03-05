import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '../types';
import {
  buildConnectionIndex,
  countIncomingConnections,
  countOutgoingConnections,
  getIncomingConnectionCountFromIndex,
  getOutgoingConnectionCountFromIndex,
  getTemplateOutgoingSlotsFromIndex,
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

  it('builds indexed connection counts with same behavior as filter-based helpers', () => {
    const nodes: Node<AllNodeData>[] = [
      makeNode('template', 'template'),
      makeNode('step-a', 'step'),
      makeNode('step-b', 'step'),
      makeNode('params', 'parameters'),
      makeNode('output', 'templateOutput'),
    ];
    const edges: Edge[] = [
      makeEdge({
        id: 'template-step',
        source: 'template',
        target: 'step-a',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'step-step',
        source: 'step-a',
        target: 'step-b',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'relationship-edge',
        source: 'step-a',
        target: 'step-b',
        type: 'relationship',
      }),
      makeEdge({
        id: 'template-output',
        source: 'template',
        target: 'output',
        type: 'custom-step',
      }),
    ];

    const index = buildConnectionIndex(nodes, edges);
    expect(getOutgoingConnectionCountFromIndex(index, 'step-a')).toBe(
      countOutgoingConnections(edges, 'step-a'),
    );
    expect(getIncomingConnectionCountFromIndex(index, 'step-b')).toBe(
      countIncomingConnections(edges, 'step-b'),
    );
  });

  it('returns indexed template slots equivalent to non-indexed calculation', () => {
    const nodes: Node<AllNodeData>[] = [
      makeNode('template', 'template'),
      makeNode('step', 'step'),
      makeNode('params', 'parameters'),
      makeNode('output', 'templateOutput'),
    ];
    const edges: Edge[] = [
      makeEdge({
        id: 'template-step',
        source: 'template',
        target: 'step',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'template-params',
        source: 'template',
        target: 'params',
        type: 'custom-step',
      }),
    ];

    const indexedSlots = getTemplateOutgoingSlotsFromIndex(
      buildConnectionIndex(nodes, edges),
      'template',
    );
    const directSlots = getTemplateOutgoingSlots('template', edges, nodes);

    expect(indexedSlots).toEqual(directSlots);
  });
});
