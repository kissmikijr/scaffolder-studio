import { useMemo } from 'react';
import { Edge, Node } from '@xyflow/react';
import {
  AllNodeData,
  StepNodeData,
  OutputNodeData,
  isStepNode,
  isOutputNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import {
  findAllTokens,
  parseTokenContent,
  ParsedToken,
} from '../utils/tokenParser';

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

const extractTokens = (value: unknown): ParsedToken[] => {
  const str = stringifyValue(value);
  return findAllTokens(str)
    .map(t => parseTokenContent(t.content))
    .filter((t): t is ParsedToken => t !== null);
};

type HandleSide = 'top' | 'right' | 'bottom' | 'left';
type HandlePair = { sourceHandle: HandleSide; targetHandle: HandleSide };

const nodeAbsoluteCenter = (
  node: Node<AllNodeData>,
  nodeById: Map<string, Node<AllNodeData>>,
): { x: number; y: number } => {
  const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
  const ox = parent ? parent.position.x : 0;
  const oy = parent ? parent.position.y : 0;
  return {
    x: ox + node.position.x + (node.measured?.width ?? node.width ?? 200) / 2,
    y: oy + node.position.y + (node.measured?.height ?? node.height ?? 80) / 2,
  };
};

// Vertical handles are used unless the target is clearly more horizontal.
// Raise this value to make horizontal handles activate more easily.
const VERTICAL_BIAS = 3;

export const getClosestHandles = (
  source: Node<AllNodeData>,
  target: Node<AllNodeData>,
  nodeById: Map<string, Node<AllNodeData>>,
): HandlePair => {
  const sc = nodeAbsoluteCenter(source, nodeById);
  const tc = nodeAbsoluteCenter(target, nodeById);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  // Use horizontal only when the target is significantly more to the side
  if (Math.abs(dx) > Math.abs(dy) * VERTICAL_BIAS) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }

  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
};

export const computeDependencyEdges = (nodes: Node<AllNodeData>[]): Edge[] => {
  const propertyNodeByName = new Map<string, Node<AllNodeData>>();
  const stepNodeByStepId = new Map<string, Node<AllNodeData>>();

  for (const node of nodes) {
    if (isPropertyNode(node)) {
      propertyNodeByName.set(node.data.name, node);
    } else if (isStepNode(node) && node.data.stepId) {
      stepNodeByStepId.set(node.data.stepId, node);
    }
  }

  const nodeById = new Map<string, Node<AllNodeData>>(
    nodes.map(n => [n.id, n]),
  );
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  const addEdge = (source: Node<AllNodeData>, target: Node<AllNodeData>) => {
    const sourceId = source.id;
    const targetId = target.id;
    if (sourceId === targetId) return;
    const key = `${sourceId}→${targetId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    const { sourceHandle, targetHandle } = getClosestHandles(
      source,
      target,
      nodeById,
    );
    edges.push({
      id: `dep-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle,
      type: 'dependency',
      selectable: false,
      deletable: false,
      focusable: false,
      zIndex: 500,
    });
  };

  const processTokens = (
    tokens: ParsedToken[],
    targetNode: Node<AllNodeData>,
  ) => {
    for (const token of tokens) {
      if (token.type === 'parameter' && token.paramName) {
        const source = propertyNodeByName.get(token.paramName);
        if (source) addEdge(source, targetNode);
      } else if (token.type === 'step' && token.stepId) {
        const source = stepNodeByStepId.get(token.stepId);
        if (source) addEdge(source, targetNode);
      }
    }
  };

  for (const node of nodes) {
    if (isStepNode(node)) {
      const data = node.data as StepNodeData;

      if (data.if) {
        processTokens(extractTokens(data.if), node);
      }

      if (data.formData) {
        for (const val of Object.values(data.formData)) {
          processTokens(extractTokens(val), node);
        }
      }
    } else if (isOutputNode(node)) {
      const data = node.data as OutputNodeData;

      for (const link of data.links ?? []) {
        processTokens(extractTokens(link.url), node);
        processTokens(extractTokens(link.entityRef), node);
      }
      for (const text of data.text ?? []) {
        processTokens(extractTokens(text.content), node);
      }
    }
  }

  return edges;
};

export const useDependencyEdges = (nodes: Node<AllNodeData>[]): Edge[] =>
  useMemo(() => computeDependencyEdges(nodes), [nodes]);
