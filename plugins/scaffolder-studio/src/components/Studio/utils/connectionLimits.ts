import type { Edge, Node } from '@xyflow/react';
import type { AllNodeData } from '../types';

type NodeType = Node<AllNodeData>['type'];

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

export const countIncomingConnections = (edges: Edge[], nodeId: string) =>
  edges.filter(edge => edge.target === nodeId).length;

export const countOutgoingConnections = (edges: Edge[], nodeId: string) =>
  edges.filter(edge => edge.source === nodeId).length;

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
    if (edge.source !== templateId) {
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
