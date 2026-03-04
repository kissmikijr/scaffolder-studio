import {
  computeDependencyEdges,
  computeRelationshipGraph,
  getClosestHandles,
  RELATIONSHIP_IF_INPUT_HANDLE,
  RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
  toInputHandleId,
  toOutputHandleId,
} from '../useDependencyEdges';
import { Node } from '@xyflow/react';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';

const noop = () => {};

const makeProperty = (
  id: string,
  name: string,
  position = { x: 0, y: 0 },
  parentId?: string,
): Node<AllNodeData> => ({
  id,
  type: 'property',
  position,
  parentId,
  data: { name, variableType: 'string', onChange: noop } as any,
});

const makeStep = (
  id: string,
  stepId: string,
  formData: Record<string, unknown> = {},
  ifExpr = '',
  position = { x: 0, y: 0 },
  inputProperties?: Record<string, unknown>,
  outputProperties: Record<string, unknown> = { result: { type: 'string' } },
): Node<AllNodeData> => ({
  id,
  type: 'step',
  position,
  data: {
    type: 'step',
    stepId,
    formData,
    if: ifExpr,
    schema: {
      input: {
        type: 'object',
        properties:
          inputProperties ??
          Object.fromEntries(
            Object.keys(formData).map(key => [key, { type: 'string' }]),
          ),
      },
      output: { type: 'object', properties: outputProperties },
    },
    onChange: noop,
  } as any,
});

const nodeMap = (...nodes: Node<AllNodeData>[]) =>
  new Map(nodes.map(n => [n.id, n]));

// --- getClosestHandles ---

describe('getClosestHandles', () => {
  const base = {
    type: 'step',
    data: {
      type: 'step',
      stepId: 'x',
      formData: {},
      if: '',
      onChange: noop,
    } as any,
  };

  const node = (id: string, x: number, y: number): Node<AllNodeData> => ({
    ...base,
    id,
    position: { x, y },
    width: 200,
    height: 80,
  });

  it('target to the right -> right->left', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 400, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'right',
      targetHandle: 'left',
    });
  });

  it('target to the left -> left->right', () => {
    const src = node('a', 400, 0);
    const tgt = node('b', 0, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'left',
      targetHandle: 'right',
    });
  });

  it('target below -> bottom->top', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 0, 400);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });

  it('target above -> top->bottom', () => {
    const src = node('a', 0, 400);
    const tgt = node('b', 0, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
  });

  it('respects parent offset for child nodes', () => {
    const parent: Node<AllNodeData> = {
      id: 'params',
      type: 'parameters',
      position: { x: 0, y: 500 },
      data: {
        type: 'parameters',
        title: '',
        parameters: [],
        onChange: noop,
      } as any,
    };
    const property = makeProperty('p1', 'foo', { x: 0, y: 0 }, 'params');
    const step = makeStep('s1', 'my-step', {}, '', { x: 0, y: 0 });
    const map = nodeMap(parent, property, step);
    expect(getClosestHandles(step, property, map)).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });
});

// --- relationship graph ---

describe('computeRelationshipGraph', () => {
  it('returns empty when no expression references are found', () => {
    const nodes = [makeProperty('p1', 'foo'), makeStep('s1', 'my-step')];
    expect(computeRelationshipGraph(nodes)).toEqual({
      relationshipEdges: [],
      relatedStepNodeIds: new Set<string>(),
    });
  });

  it('creates property -> step input-field relationship edge', () => {
    const nodes = [
      makeProperty('p1', 'repoUrl'),
      makeStep('s1', 'my-step', { url: '${{ parameters.repoUrl }}' }),
    ];

    const { relationshipEdges, relatedStepNodeIds } =
      computeRelationshipGraph(nodes);

    expect(relationshipEdges).toHaveLength(1);
    expect(relationshipEdges[0]).toMatchObject({
      source: 'p1',
      target: 's1',
      type: 'relationship',
      sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
      targetHandle: toInputHandleId('url'),
      selectable: false,
      deletable: false,
    });
    expect(relatedStepNodeIds).toEqual(new Set(['s1']));
  });

  it('creates step-output -> step-if relationship edge', () => {
    const nodes = [
      makeStep('s1', 'first-step', {}, '', { x: 0, y: 0 }, undefined, {
        result: { type: 'string' },
      }),
      makeStep(
        's2',
        'second-step',
        {},
        "${{ steps['first-step'].output['result'] }}",
      ),
    ];

    const { relationshipEdges, relatedStepNodeIds } =
      computeRelationshipGraph(nodes);

    expect(relationshipEdges).toHaveLength(1);
    expect(relationshipEdges[0]).toMatchObject({
      source: 's1',
      target: 's2',
      sourceHandle: toOutputHandleId('result'),
      targetHandle: RELATIONSHIP_IF_INPUT_HANDLE,
    });
    expect(relatedStepNodeIds).toEqual(new Set(['s1', 's2']));
  });

  it('deduplicates edges by source/target handles', () => {
    const nodes = [
      makeProperty('p1', 'foo'),
      makeStep('s1', 'my-step', {
        a: '${{ parameters.foo }}',
        b: '${{ parameters.foo }}',
      }),
    ];

    const { relationshipEdges } = computeRelationshipGraph(nodes);
    expect(relationshipEdges).toHaveLength(2);
    expect(
      relationshipEdges.every(
        e => e.sourceHandle === RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
      ),
    ).toBe(true);
    expect(new Set(relationshipEdges.map(e => e.targetHandle))).toEqual(
      new Set([toInputHandleId('a'), toInputHandleId('b')]),
    );
  });

  it('uses top-level input handle for nested object references', () => {
    const nodes = [
      makeProperty('p1', 'token'),
      makeStep('s1', 'deploy', {
        config: { nested: '${{ parameters.token }}' },
      }),
    ];

    const { relationshipEdges } = computeRelationshipGraph(nodes);
    expect(relationshipEdges).toHaveLength(1);
    expect(relationshipEdges[0]).toMatchObject({
      source: 'p1',
      target: 's1',
      targetHandle: toInputHandleId('config'),
    });
  });

  it('does not create self-referencing step edges', () => {
    const nodes = [
      makeStep('s1', 'same-step', {
        value: "${{ steps['same-step'].output['result'] }}",
      }),
    ];

    const { relationshipEdges } = computeRelationshipGraph(nodes);
    expect(relationshipEdges).toHaveLength(0);
  });

  it('skips step-output relationships when source output key is missing from schema', () => {
    const nodes = [
      makeStep('s1', 'first-step', {}, '', { x: 0, y: 0 }, undefined, {
        known: { type: 'string' },
      }),
      makeStep('s2', 'second-step', {
        value: "${{ steps['first-step'].output['missing'] }}",
      }),
    ];

    const { relationshipEdges } = computeRelationshipGraph(nodes);
    expect(relationshipEdges).toHaveLength(0);
  });
});

describe('computeDependencyEdges', () => {
  it('keeps backward-compatible edge array API', () => {
    const nodes = [
      makeProperty('p1', 'repoUrl'),
      makeStep('s1', 'my-step', { url: '${{ parameters.repoUrl }}' }),
    ];

    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe('relationship');
  });
});
