import { useMemo, useRef } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { AllNodeData, isPropertyNode } from '../types';
import {
  buildConnectionIndex,
  ConnectionIndex,
  isRelationshipLikeEdge,
} from '../utils/connectionLimits';

export type GraphIndexes = {
  connectionIndex: ConnectionIndex;
  parameterTypeByName: Map<string, string>;
};

const buildNodeSignature = (nodes: Node<AllNodeData>[]): string => {
  const parts: string[] = new Array(nodes.length);
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (isPropertyNode(node)) {
      parts[index] = `${node.id}:${node.type}:${node.data.name ?? ''}:${
        node.data.variableType ?? ''
      }`;
      continue;
    }

    parts[index] = `${node.id}:${node.type}`;
  }

  return parts.join('|');
};

const buildEdgeSignature = (edges: Edge[]): string => {
  const parts: string[] = new Array(edges.length);
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    parts[index] = `${edge.source}:${edge.target}:${
      isRelationshipLikeEdge(edge) ? 1 : 0
    }`;
  }

  return parts.join('|');
};

type GraphIndexesCache = {
  nodeSignature: string;
  edgeSignature: string;
  result: GraphIndexes;
};

export const useGraphIndexes = (
  nodes: Node<AllNodeData>[],
  edges: Edge[],
): GraphIndexes => {
  const cacheRef = useRef<GraphIndexesCache | null>(null);

  return useMemo(() => {
    const nodeSignature = buildNodeSignature(nodes);
    const edgeSignature = buildEdgeSignature(edges);
    const cached = cacheRef.current;

    if (
      cached &&
      cached.nodeSignature === nodeSignature &&
      cached.edgeSignature === edgeSignature
    ) {
      return cached.result;
    }

    const parameterTypeByName = new Map<string, string>();
    for (const node of nodes) {
      if (!isPropertyNode(node)) {
        continue;
      }

      const propertyName = node.data.name;
      if (!propertyName) {
        continue;
      }

      parameterTypeByName.set(propertyName, node.data.variableType);
    }

    const result = {
      connectionIndex: buildConnectionIndex(nodes, edges),
      parameterTypeByName,
    };
    cacheRef.current = {
      nodeSignature,
      edgeSignature,
      result,
    };

    return result;
  }, [nodes, edges]);
};
