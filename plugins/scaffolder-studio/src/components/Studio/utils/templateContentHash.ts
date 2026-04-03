import type { Edge, Node } from '@xyflow/react';

const LAYOUT_ONLY_NODE_KEYS = new Set([
  'position',
  'positionAbsolute',
  'selected',
  'dragging',
  'measured',
  'width',
  'height',
  'resizing',
  'draggable',
  'selectable',
  'deletable',
  'focusable',
  'hidden',
  'internals',
  'origin',
  'sourcePosition',
  'targetPosition',
  'zIndex',
  'expandParent',
]);

const stripLayoutFields = (
  node: Record<string, unknown>,
): Record<string, unknown> => {
  const entries = Object.entries(node).filter(
    ([key]) => !LAYOUT_ONLY_NODE_KEYS.has(key),
  );
  return Object.fromEntries(entries);
};

export const toGraphContentHash = (
  nodes: Node[],
  edges: Edge[],
  metadata?: Record<string, unknown>,
): string => {
  const contentNodes = nodes.map(node =>
    stripLayoutFields(node as unknown as Record<string, unknown>),
  );
  const contentEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
  }));

  return JSON.stringify({
    nodes: contentNodes,
    edges: contentEdges,
    metadata,
  });
};
