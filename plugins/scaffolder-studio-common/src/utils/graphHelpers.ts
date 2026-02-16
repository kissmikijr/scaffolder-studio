import type { Edge, Node } from '@xyflow/react';
import { AllNodeData } from '../types';

export const getSortedNodes = (nodes: Node[], edges: Edge[]) => {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const inDegree = new Map(nodes.map(node => [node.id, 0]));

  edges.forEach(edge => {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  });

  const queue = nodes.filter(node => (inDegree.get(node.id) ?? 0) === 0);
  const sorted: Node[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    edges.forEach(edge => {
      if (edge.source === current.id) {
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) - 1);
        if (inDegree.get(edge.target) === 0) {
          queue.push(nodeMap.get(edge.target)!);
        }
      }
    });
  }

  return sorted;
};

export const findLastNodeId = (nodes: Node[], edges: Edge[]) => {
  const sourceNodeIds = edges.map(e => e.source);

  // Leaf nodes = nodes that are not a source for any edge
  const leafNodeIds = nodes
    .map(n => n.id)
    .filter(id => !sourceNodeIds.includes(id));

  return leafNodeIds[0] ?? null; // First one found or null
};

export const traverseFromNode = (
  startNodeId: string,
  edges: Edge[],
  nodes: Node<AllNodeData>[],
): Node<AllNodeData>[] => {
  const visited = new Set<string>();
  const queue = [startNodeId];
  const result = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    const node = nodes.find(n => n.id === current);
    if (node) {
      result.push(node);
    }

    const children = edges.filter(e => e.source === current).map(e => e.target);
    queue.push(...children);
  }

  return result;
};

export const traverseUpFromNode = (
  startNodeId: string,
  edges: Edge[],
  nodes: Node[],
): Node[] => {
  const visited = new Set<string>();
  const queue = [startNodeId];
  const result: Node[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    const node = nodes.find(n => n.id === current);
    if (node) {
      result.push(node);
    }

    const parents = edges.filter(e => e.target === current).map(e => e.source);
    queue.push(...parents);
  }

  return result;
};

export const directChildren = (
  startNodeId: string,
  edges: Edge[],
  nodes: Node<AllNodeData>[],
  type: string,
): Node<AllNodeData>[] => {
  // Get all direct children of the param node
  const directChildren = edges
    .filter(e => e.source === startNodeId)
    .map(e => e.target);

  // Get all property nodes that are direct children (either via edge or parentId)
  const directPropertyNodes = nodes.filter(
    n =>
      (directChildren.includes(n.id) || n.parentId === startNodeId) &&
      n.type === type,
  );

  // Get all connected property nodes by following property-to-property connections
  const connectedPropertyNodes = directPropertyNodes.flatMap(propertyNode => {
    const propertyDescendants = traverseFromNode(propertyNode.id, edges, nodes);
    return propertyDescendants.filter(n => n.type === type);
  });

  // Combine direct property nodes and connected property nodes, removing duplicates
  return Array.from(
    new Set([...directPropertyNodes, ...connectedPropertyNodes]),
  );
};

export const getOrderedProperties = (
  parameterNodeId: string,
  nodes: Node<AllNodeData>[],
  edges: Edge[],
): Node<AllNodeData>[] => {
  // 1. Get all property nodes belonging to this parameter group
  const groupProperties = nodes.filter(
    n =>
      n.parentId === parameterNodeId &&
      (n.type === 'property' ||
        (n.type === 'prefab' && (n.data as any)?.refType === 'property')),
  );

  if (groupProperties.length === 0) return [];

  // 2. Identify start node(s) - nodes with no incoming edges from other group members
  const groupNodeIds = new Set(groupProperties.map(n => n.id));
  const candidateStartNodes = groupProperties.filter(node => {
    const incomingEdges = edges.filter(
      e => e.target === node.id && groupNodeIds.has(e.source),
    );
    return incomingEdges.length === 0;
  });

  // If multiple start nodes, pick the top-most one (lowest y)
  candidateStartNodes.sort((a, b) => a.position.y - b.position.y);
  let startNode = candidateStartNodes[0];

  // Fallback: if circular dependency or no clear start, just pick the top-most
  if (!startNode) {
    const sortedByY = [...groupProperties].sort(
      (a, b) => a.position.y - b.position.y,
    );
    startNode = sortedByY[0];
  }

  // 3. Traverse edges to build ordered list
  const orderedNodes: Node<AllNodeData>[] = [];
  const visited = new Set<string>();
  let current: Node<AllNodeData> | undefined = startNode;

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    orderedNodes.push(current);

    // Find next node connected via edge
    const outgoingEdge = edges.find(
      e => e.source === current!.id && groupNodeIds.has(e.target),
    );

    if (outgoingEdge) {
      current = groupProperties.find(n => n.id === outgoingEdge.target);
    } else {
      // If the chain breaks, try to find another unvisited node (handling disjoint graphs)
      const unvisited = groupProperties.filter(n => !visited.has(n.id));
      if (unvisited.length > 0) {
        // Pick top-most unvisited as next start
        unvisited.sort((a, b) => a.position.y - b.position.y);
        current = unvisited[0];
      } else {
        current = undefined;
      }
    }
  }

  // Double check we haven't missed any isolated nodes
  const unvisited = groupProperties.filter(n => !visited.has(n.id));
  if (unvisited.length > 0) {
    unvisited.sort((a, b) => a.position.y - b.position.y);
    orderedNodes.push(...unvisited);
  }

  return orderedNodes;
};
