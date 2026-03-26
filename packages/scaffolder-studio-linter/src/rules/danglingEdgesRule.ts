import {
  isPropertyNode,
  isStepNode,
  type AllNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { Edge, Node } from '@xyflow/react';
import type { TemplateLintRule } from '../types';

const isRelationshipLikeEdge = (edge: Edge) => {
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

const isLintRelevantSource = (node?: Node<AllNodeData>) =>
  Boolean(node && isPropertyNode(node));

const isLintRelevantTarget = (node?: Node<AllNodeData>) =>
  Boolean(node && isStepNode(node));

export const danglingEdgesRule: TemplateLintRule = {
  id: 'dangling-edges',
  run(context) {
    const inferredLinks = new Set(
      context.references
        .filter(reference => reference.sourceNodeId)
        .map(
          reference =>
            `${reference.sourceNodeId}:${reference.targetNodeId}:${reference.targetFieldPath}`,
        ),
    );

    return context.snapshot.edges
      .filter(edge => !isRelationshipLikeEdge(edge))
      .filter(edge => {
        const sourceNode = context.nodeById.get(edge.source);
        const targetNode = context.nodeById.get(edge.target);
        return (
          isLintRelevantSource(sourceNode) && isLintRelevantTarget(targetNode)
        );
      })
      .filter(edge => {
        for (const key of inferredLinks) {
          if (key.startsWith(`${edge.source}:${edge.target}:`)) {
            return false;
          }
        }
        return true;
      })
      .map(edge => ({
        id: `${this.id}:${edge.id}`,
        ruleId: this.id,
        code: 'dangling-edge',
        severity: 'warning' as const,
        message:
          'Connection does not match any inferred parameter or step-output dependency.',
        nodeId: edge.source,
        relatedNodeIds: [edge.target],
      }));
  },
};
