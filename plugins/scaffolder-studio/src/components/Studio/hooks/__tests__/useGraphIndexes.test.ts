import { renderHook } from '@testing-library/react';
import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '../../types';
import { useGraphIndexes } from '../useGraphIndexes';
import {
  getIncomingConnectionCountFromIndex,
  getOutgoingConnectionCountFromIndex,
  getTemplateOutgoingSlotsFromIndex,
} from '../../utils/connectionLimits';

const makeNode = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): Node<AllNodeData> =>
  ({
    id,
    type,
    position: { x: 0, y: 0 },
    data,
  } as Node<AllNodeData>);

const makeEdge = (overrides: Partial<Edge>): Edge =>
  ({
    id: 'edge',
    source: 'template',
    target: 'step-1',
    ...overrides,
  } as Edge);

describe('useGraphIndexes', () => {
  it('indexes incoming/outgoing counts and template slots', () => {
    const nodes: Node<AllNodeData>[] = [
      makeNode('template', 'template'),
      makeNode('step-1', 'step'),
      makeNode('output-1', 'templateOutput'),
      makeNode('params-1', 'parameters'),
    ];
    const edges: Edge[] = [
      makeEdge({
        id: 'template-step',
        source: 'template',
        target: 'step-1',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'step-output',
        source: 'step-1',
        target: 'output-1',
        type: 'custom-step',
      }),
      makeEdge({
        id: 'relationship',
        source: 'step-1',
        target: 'output-1',
        type: 'relationship',
      }),
    ];

    const { result } = renderHook(() => useGraphIndexes(nodes, edges));
    const { connectionIndex } = result.current;

    expect(getOutgoingConnectionCountFromIndex(connectionIndex, 'step-1')).toBe(
      1,
    );
    expect(
      getIncomingConnectionCountFromIndex(connectionIndex, 'output-1'),
    ).toBe(1);

    const templateSlots = getTemplateOutgoingSlotsFromIndex(
      connectionIndex,
      'template',
    );
    expect(templateSlots.hasStep).toBe(true);
    expect(templateSlots.hasOutput).toBe(false);
    expect(templateSlots.hasParameters).toBe(false);
  });

  it('indexes property parameter types for expression rendering', () => {
    const nodes: Node<AllNodeData>[] = [
      makeNode('property-1', 'property', {
        name: 'repoUrl',
        variableType: 'string',
      }),
      makeNode('property-2', 'property', {
        name: 'retryCount',
        variableType: 'number',
      }),
    ];
    const edges: Edge[] = [];

    const { result } = renderHook(() => useGraphIndexes(nodes, edges));
    expect(result.current.parameterTypeByName.get('repoUrl')).toBe('string');
    expect(result.current.parameterTypeByName.get('retryCount')).toBe('number');
  });
});
