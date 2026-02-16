import type { Edge, Node } from '@xyflow/react';
import { traverseFromNode, getOrderedProperties } from './graphHelpers';
import yaml from 'js-yaml';
import {
  AllNodeData,
  isParametersNode,
  isPropertyNode,
  isStepNode,
  isOutputNode,
} from '../types';

const findStartNode = ({
  nodes,
  edges,
  currentNodeId,
}: {
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
}): Node | undefined => {
  const incomingEdge = edges.find(edge => edge.target === currentNodeId);
  if (!incomingEdge) {
    return nodes.find(n => n.id === currentNodeId);
  }
  return findStartNode({ nodes, edges, currentNodeId: incomingEdge.source });
};

export const serializeToYaml = ({
  sourceNodeId,
  nodes,
  edges,
  includeManagedByAnnotations = false,
}: {
  sourceNodeId: string;
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  includeManagedByAnnotations?: boolean;
}) => {
  const node = nodes.find(n => n.id === sourceNodeId);
  if (!node) {
    throw new Error(`Node with id ${sourceNodeId} not found`);
  }

  const templateNode = findStartNode({ nodes, edges, currentNodeId: node.id });
  if (!templateNode || templateNode.type !== 'template') {
    throw new Error('Template node not found in the tree');
  }

  const subGraphNodes = traverseFromNode(templateNode.id, edges, nodes);

  const parametersNodes = subGraphNodes.filter(n => n.type === 'parameters');
  const stepNodes = subGraphNodes.filter(n => n.type === 'step');
  const outputNodes = subGraphNodes.filter(n => n.type === 'templateOutput');

  const metadata: Record<string, any> = {
    name: templateNode.data.name || 'example-template',
    description: templateNode.data.description || 'This is an example template',
  };

  if (includeManagedByAnnotations) {
    metadata.annotations = {
      'backstage.io/managed-by-location': 'visual:scaffolder-studio',
      'backstage.io/managed-by-origin-location':
        'visual:scaffolder-studio',
    };
  }

  const yamlData: any = {
    apiVersion: 'scaffolder.backstage.io/v1beta3',
    kind: 'Template',
    metadata,
    spec: {
      owner: templateNode.data.owner || 'guest',
      type: (templateNode.data.spec as { type: string }).type || 'component',
    },
  };

  if (parametersNodes.length > 0) {
    yamlData.spec.parameters = parametersNodes.map(pNode => {
      if (!isParametersNode(pNode)) {
        throw new Error('Invalid parameters node');
      }
      const parameterSchema: {
        title: string;
        required: string[];
        properties: Record<string, any>;
      } = { title: pNode.data.title, required: [], properties: {} };
      const orderedProperties = getOrderedProperties(pNode.id, nodes, edges);

      parameterSchema.required = orderedProperties
        .map(p => {
          if (!isPropertyNode(p)) {
            return undefined;
          }
          return p.data.required ? p.data.name : undefined;
        })
        .filter(Boolean) as string[];
      parameterSchema.properties = orderedProperties.reduce(
        (acc: Record<string, any>, param) => {
          if (!isPropertyNode(param)) {
            return acc;
          }
          const propertyData: Record<string, any> = {
            type: param.data.variableType,
          };
          if (param.data.description) {
            propertyData.description = param.data.description;
          }
          if (param.data['ui:field']) {
            propertyData['ui:field'] = param.data['ui:field'];
          }
          if (param.data['ui:options']) {
            propertyData['ui:options'] = param.data['ui:options'];
          }
          if (param.data.pattern) {
            propertyData.pattern = param.data.pattern;
          }
          if (param.data.enum && param.data.enum.length > 0) {
            propertyData.enum = param.data.enum;
          }
          if (param.data.title) {
            propertyData.title = param.data.title;
          }

          acc[param.data.name] = propertyData;
          return acc;
        },
        {} as Record<string, any>,
      );
      return parameterSchema;
    });
  }

  if (stepNodes.length > 0) {
    yamlData.spec.steps = stepNodes.map(sNode => {
      if (!isStepNode(sNode)) {
        throw new Error('Invalid step node');
      }
      return {
        id: sNode.data.stepId,
        name: sNode.data.name,
        if: sNode.data.if ? sNode.data.if : undefined,
        action: sNode.data.actionId,
        input: sNode.data.formData,
      };
    });
  }

  if (outputNodes.length > 0) {
    yamlData.spec.output = {
      links: outputNodes.flatMap(oNode => {
        if (!isOutputNode(oNode)) {
          return [];
        }
        return oNode.data.links || [];
      }),
      text: outputNodes.flatMap(oNode => {
        if (!isOutputNode(oNode)) {
          return [];
        }
        return oNode.data.text || [];
      }),
    };
  }

  return yaml.dump(yamlData);
};
