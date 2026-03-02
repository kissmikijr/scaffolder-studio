import {
  computeDependencyEdges,
  getClosestHandles,
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
): Node<AllNodeData> => ({
  id,
  type: 'step',
  position,
  data: { type: 'step', stepId, formData, if: ifExpr, onChange: noop } as any,
});

const makeOutput = (
  id: string,
  links: { title: string; url?: string; entityRef?: string }[] = [],
  text: { title: string; content: string }[] = [],
): Node<AllNodeData> => ({
  id,
  type: 'templateOutput',
  position: { x: 0, y: 0 },
  data: { links, text, onChange: noop } as any,
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

  it('target to the right → right→left', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 400, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'right',
      targetHandle: 'left',
    });
  });

  it('target to the left → left→right', () => {
    const src = node('a', 400, 0);
    const tgt = node('b', 0, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'left',
      targetHandle: 'right',
    });
  });

  it('target below → bottom→top', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 0, 400);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });

  it('target above → top→bottom', () => {
    const src = node('a', 0, 400);
    const tgt = node('b', 0, 0);
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
  });

  it('clearly horizontal (|dx| > |dy| * 3) → horizontal handles', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 400, 100); // |400| > |100| * 3 = 300 → horizontal
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'right',
      targetHandle: 'left',
    });
  });

  it('dx > dy but below BIAS threshold → vertical wins', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 300, 100); // |300| is NOT > |100| * 3 = 300 → vertical
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });

  it('mostly vertical (dy > dx) → vertical handles', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 100, 300); // dx=100, dy=300
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });

  it('equal dx and dy → vertical wins (|dx| not > |dy| * 1.5)', () => {
    const src = node('a', 0, 0);
    const tgt = node('b', 200, 200); // |200| is NOT > |200| * 1.5 = 300 → vertical
    expect(getClosestHandles(src, tgt, nodeMap(src, tgt))).toEqual({
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
  });

  it('respects parent offset for child nodes (fixes bottom-handle bug)', () => {
    // Parent parameters node at y=500; child property node at y=0 relative to parent
    // absolute property center y = 500 + 0 + 40 = 540
    // step center y = 0 + 40 = 40  →  property is BELOW step
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

// --- computeDependencyEdges ---

describe('computeDependencyEdges', () => {
  it('returns empty for nodes with no references', () => {
    const nodes = [makeProperty('p1', 'foo'), makeStep('s1', 'my-step')];
    expect(computeDependencyEdges(nodes)).toEqual([]);
  });

  it('creates edge when step formData references a parameter', () => {
    const nodes = [
      makeProperty('p1', 'myParam'),
      makeStep('s1', 'my-step', { url: '${{ parameters.myParam }}' }),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'dep-p1-s1',
      source: 'p1',
      target: 's1',
      type: 'dependency',
      selectable: false,
      deletable: false,
    });
  });

  it('creates edge when step `if` field references a step output', () => {
    const nodes = [
      makeStep('s1', 'first-step'),
      makeStep(
        's2',
        'second-step',
        {},
        "${{ steps['first-step'].output['result'] }}",
      ),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 's1', target: 's2' });
  });

  it('deduplicates edges when the same param is referenced multiple times', () => {
    const nodes = [
      makeProperty('p1', 'foo'),
      makeStep('s1', 'my-step', {
        a: '${{ parameters.foo }}',
        b: '${{ parameters.foo }}',
      }),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
  });

  it('creates edge from output node that references a parameter', () => {
    const nodes = [
      makeProperty('p1', 'repoUrl'),
      makeOutput('o1', [{ title: 'link', url: '${{ parameters.repoUrl }}' }]),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'p1', target: 'o1' });
  });

  it('does not create self-referencing edges', () => {
    const nodes = [
      makeStep('s1', 's1', { x: "${{ steps['s1'].output['y'] }}" }),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(0);
  });

  it('handles nested objects in formData via JSON stringify', () => {
    const nodes = [
      makeProperty('p1', 'token'),
      makeStep('s1', 'deploy', {
        nested: { value: '${{ parameters.token }}' },
      }),
    ];
    const edges = computeDependencyEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'p1', target: 's1' });
  });

  it('sets sourceHandle and targetHandle based on relative positions', () => {
    const nodes = [
      makeProperty('p1', 'foo', { x: 0, y: 0 }),
      makeStep('s1', 'my-step', { v: '${{ parameters.foo }}' }, '', {
        x: 500,
        y: 0,
      }),
    ];
    const [edge] = computeDependencyEdges(nodes);
    expect(edge).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' });
  });
});
