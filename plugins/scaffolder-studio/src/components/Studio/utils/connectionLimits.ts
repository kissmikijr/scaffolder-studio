import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '../types';

type NodeType = Node<AllNodeData>['type'];

export type TemplateOutgoingSlots = {
  hasStep: boolean;
  hasParameters: boolean;
  hasOutput: boolean;
  hasAny: boolean;
};

export type ConnectionIndex = {
  incomingCountByNodeId: Map<string, number>;
  outgoingCountByNodeId: Map<string, number>;
  templateOutgoingSlotsById: Map<string, TemplateOutgoingSlots>;
  nodeTypeById: Map<string, NodeType>;
};

const SINGLE_INCOMING_NODE_TYPES = new Set<NodeType>([
  'step',
  'property',
  'parameters',
  'templateOutput',
  'prefab',
]);

const SINGLE_OUTGOING_NODE_TYPES = new Set<NodeType>([
  'step',
  'property',
  'parameters',
  'prefab',
]);

export const isRelationshipLikeEdge = (edge: Edge) => {
  if (edge.type === 'dependency' || edge.type === 'relationship') {
    return true;
  }

  const data = edge.data as
    | { isRelationship?: boolean; kind?: string }
    | undefined;
  return (
    data?.isRelationship === true ||
    data?.kind === 'relationship' ||
    data?.kind === 'dependency'
  );
};

export const countIncomingConnections = (edges: Edge[], nodeId: string) =>
  edges.filter(edge => edge.target === nodeId && !isRelationshipLikeEdge(edge))
    .length;

export const countOutgoingConnections = (edges: Edge[], nodeId: string) =>
  edges.filter(edge => edge.source === nodeId && !isRelationshipLikeEdge(edge))
    .length;

export const hasIncomingCapacity = (
  nodeType: NodeType,
  incomingCount: number,
) => {
  if (!SINGLE_INCOMING_NODE_TYPES.has(nodeType)) {
    return true;
  }
  return incomingCount < 1;
};

export const hasOutgoingCapacity = (
  nodeType: NodeType,
  outgoingCount: number,
) => {
  if (!SINGLE_OUTGOING_NODE_TYPES.has(nodeType)) {
    return true;
  }
  return outgoingCount < 1;
};

const createTemplateOutgoingSlots = (): TemplateOutgoingSlots => ({
  hasStep: false,
  hasParameters: false,
  hasOutput: false,
  hasAny: true,
});

export const createEmptyConnectionIndex = (): ConnectionIndex => ({
  incomingCountByNodeId: new Map(),
  outgoingCountByNodeId: new Map(),
  templateOutgoingSlotsById: new Map(),
  nodeTypeById: new Map(),
});

export const buildConnectionIndex = (
  nodes: Node<AllNodeData>[],
  edges: Edge[],
): ConnectionIndex => {
  const index = createEmptyConnectionIndex();
  const templateNodeIds = new Set<string>();

  for (const node of nodes) {
    index.nodeTypeById.set(node.id, node.type);
    if (node.type === 'template') {
      templateNodeIds.add(node.id);
      index.templateOutgoingSlotsById.set(
        node.id,
        createTemplateOutgoingSlots(),
      );
    }
  }

  for (const edge of edges) {
    if (isRelationshipLikeEdge(edge)) {
      continue;
    }

    index.incomingCountByNodeId.set(
      edge.target,
      (index.incomingCountByNodeId.get(edge.target) ?? 0) + 1,
    );
    index.outgoingCountByNodeId.set(
      edge.source,
      (index.outgoingCountByNodeId.get(edge.source) ?? 0) + 1,
    );

    if (!templateNodeIds.has(edge.source)) {
      continue;
    }

    const targetType = index.nodeTypeById.get(edge.target);
    if (!targetType) {
      continue;
    }

    const slots =
      index.templateOutgoingSlotsById.get(edge.source) ??
      createTemplateOutgoingSlots();

    if (targetType === 'step') {
      slots.hasStep = true;
    } else if (targetType === 'parameters') {
      slots.hasParameters = true;
    } else if (targetType === 'templateOutput') {
      slots.hasOutput = true;
    }
    slots.hasAny = !slots.hasStep || !slots.hasParameters || !slots.hasOutput;
    index.templateOutgoingSlotsById.set(edge.source, slots);
  }

  return index;
};

export const getIncomingConnectionCountFromIndex = (
  index: ConnectionIndex,
  nodeId: string,
) => index.incomingCountByNodeId.get(nodeId) ?? 0;

export const getOutgoingConnectionCountFromIndex = (
  index: ConnectionIndex,
  nodeId: string,
) => index.outgoingCountByNodeId.get(nodeId) ?? 0;

export const getTemplateOutgoingSlotsFromIndex = (
  index: ConnectionIndex,
  templateId: string,
): TemplateOutgoingSlots =>
  index.templateOutgoingSlotsById.get(templateId) ??
  createTemplateOutgoingSlots();

export const getTemplateOutgoingSlots = (
  templateId: string,
  edges: Edge[],
  nodes: Node<AllNodeData>[],
) => {
  const targetTypeById = new Map(nodes.map(node => [node.id, node.type]));

  let hasStep = false;
  let hasParameters = false;
  let hasOutput = false;

  edges.forEach(edge => {
    if (edge.source !== templateId || isRelationshipLikeEdge(edge)) {
      return;
    }

    const targetType = targetTypeById.get(edge.target);
    if (targetType === 'step') {
      hasStep = true;
    } else if (targetType === 'parameters') {
      hasParameters = true;
    } else if (targetType === 'templateOutput') {
      hasOutput = true;
    }
  });

  return {
    hasStep,
    hasParameters,
    hasOutput,
    hasAny: !hasStep || !hasParameters || !hasOutput,
  };
};
