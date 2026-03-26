import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { TemplateLintGraphSnapshot, TemplateLintRequest } from './types';

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === 'function') {
      continue;
    }
    next[key] = sanitizeValue(nestedValue);
  }
  return next;
};

const sanitizeNode = (node: Node<AllNodeData>): Node<AllNodeData> =>
  ({
    id: node.id,
    type: node.type,
    parentId: node.parentId,
    position: node.position,
    data: sanitizeValue(node.data) as AllNodeData,
  } as Node<AllNodeData>);

const sanitizeEdge = (edge: Edge): Edge =>
  ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: sanitizeValue(edge.data),
  } as Edge);

export const normalizeRequestToSnapshot = (
  request: TemplateLintRequest,
): TemplateLintGraphSnapshot => ({
  templateId: request.templateId,
  options: request.options,
  nodes: request.nodes.map(sanitizeNode),
  edges: request.edges.map(sanitizeEdge),
});
