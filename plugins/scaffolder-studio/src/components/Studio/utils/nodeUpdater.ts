import { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import {
  AllNodeData,
  StepNodeData,
  PropertyNodeData,
  CustomNodeType,
} from '../types';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';

/**
 * Deep merges parsed YAML data into an existing node's data.
 */
export const mergeNodeData = (
  nodes: Node<AllNodeData>[],
  nodeId: string,
  parsedData: any,
  availableActions?: ScaffolderAction[],
): Node<AllNodeData>[] => {
  return nodes.map(node => {
    if (node.id !== nodeId) return node;

    const dataToMerge = parsedData.__wrapped
      ? parsedData.__wrapped
      : parsedData;

    // Handle 'step' nodes specifically since they have a defined structure in Backstage templates
    if (node.type === 'step') {
      const stepData = node.data as StepNodeData;
      const actionId = dataToMerge.action ?? stepData.actionId;
      const matchedAction = availableActions?.find(a => a.id === actionId);

      return {
        ...node,
        data: {
          ...stepData,
          name: dataToMerge.name ?? stepData.name,
          stepId: dataToMerge.id ?? stepData.stepId,
          actionId,
          if: dataToMerge.if ?? stepData.if,
          schema: matchedAction?.schema ?? stepData.schema,
          description: matchedAction?.description ?? stepData.description,
          formData: {
            ...stepData.formData,
            ...(dataToMerge.input || {}), // Merge the inputs
          },
        },
      };
    }

    // Handle 'property' nodes (Parameters)
    if (node.type === 'property') {
      const propData = node.data as PropertyNodeData;
      return {
        ...node,
        data: {
          ...propData,
          description: dataToMerge.description ?? propData.description,
          title: dataToMerge.title ?? propData.title,
          'ui:field': dataToMerge['ui:field'] ?? propData['ui:field'],
          'ui:options': dataToMerge['ui:options'] ?? propData['ui:options'],
          // if dataToMerge contains core type overrides we apply them
          variableType: dataToMerge.type ?? propData.variableType,
          enum: dataToMerge.enum ?? propData.enum,
          pattern: dataToMerge.pattern ?? propData.pattern,
        },
      };
    }

    // Handle 'templateOutput' nodes
    if (node.type === 'templateOutput') {
      const outputData = node.data as any;
      return {
        ...node,
        data: {
          ...outputData,
          links:
            dataToMerge.links !== undefined
              ? dataToMerge.links
              : outputData.links,
          text:
            dataToMerge.text !== undefined ? dataToMerge.text : outputData.text,
        },
      };
    }

    // Generic merge for other types if they are simple enough
    return {
      ...node,
      data: {
        ...node.data,
        ...dataToMerge,
      },
    };
  });
};

/**
 * Injects a completely new node (parsed from a snippet) into the graph state.
 */
export const injectNewNode = (
  nodes: Node<AllNodeData>[],
  edges: Edge[],
  parsedData: any,
  targetType: CustomNodeType = 'step',
  availableActions?: ScaffolderAction[],
): { newNodes: Node<AllNodeData>[]; newEdges: Edge[] } => {
  let dataToInject = parsedData;
  if (Array.isArray(parsedData)) {
    dataToInject = parsedData[0];
  } else if (parsedData.__wrapped) {
    dataToInject = parsedData.__wrapped;
  }

  if (targetType === 'step') {
    // Find the last step node to calculate position and sequence
    const stepNodes = nodes.filter(n => n.type === 'step');
    const templateNode = nodes.find(n => n.type === 'template');

    // Default starting position
    let newX = 380; // STATIC_X_POSITION
    let newY = -125;

    let previousNodeId = templateNode?.id;

    if (stepNodes.length > 0) {
      const lastStep = stepNodes[stepNodes.length - 1];
      newX = lastStep.position.x + 380;
      newY = lastStep.position.y;
      previousNodeId = lastStep.id;
    }

    const actionId = dataToInject.action || 'debug:log';
    const matchedAction = availableActions?.find(a => a.id === actionId);

    const newNode: Node<StepNodeData> = {
      id: uuidv4(),
      type: 'step',
      position: { x: newX, y: newY },
      data: {
        type: 'step',
        name: dataToInject.name || 'New Step',
        stepId: dataToInject.id || `step-${uuidv4().substring(0, 4)}`,
        actionId,
        description: matchedAction?.description || '',
        schema: matchedAction?.schema,
        if: dataToInject.if || '',
        formData: dataToInject.input || {},
        // onChange is rehydrated later by YamlView / Studio context, so we omit or mock it here
        onChange: () => {},
      },
    };

    const newEdge: Edge | null = previousNodeId
      ? {
          id: `${previousNodeId}-${newNode.id}`,
          source: previousNodeId,
          target: newNode.id,
          sourceHandle: 'right',
          targetHandle: 'left',
        }
      : null;

    const newNodes = nodes.map(n => ({ ...n, selected: false }));
    return {
      newNodes: [
        ...newNodes,
        { ...newNode, selected: true } as unknown as Node<AllNodeData>,
      ],
      newEdges: newEdge ? [...edges, newEdge] : edges,
    };
  }

  if (targetType === 'templateOutput') {
    const templateNode = nodes.find(n => n.type === 'template');

    let newX = -380;
    let newY = 0; // Exactly horizontal with the template
    const previousNodeId = templateNode?.id;

    if (templateNode) {
      newX = templateNode.position.x - 380; // Go to the left
      newY = templateNode.position.y;
    }

    const newNode: Node<any> = {
      id: uuidv4(),
      type: 'templateOutput',
      position: { x: newX, y: newY },
      data: {
        type: 'templateOutput',
        links: dataToInject.links || [],
        text: dataToInject.text || [],
        onChange: () => {},
      },
    };

    const newEdge: Edge | null = previousNodeId
      ? {
          id: `${previousNodeId}-${newNode.id}`,
          source: previousNodeId,
          target: newNode.id,
          sourceHandle: 'left', // Template Left connects to Output Right
          targetHandle: 'right',
        }
      : null;

    const newNodes = nodes.map(n => ({ ...n, selected: false }));
    return {
      newNodes: [
        ...newNodes,
        { ...newNode, selected: true } as unknown as Node<AllNodeData>,
      ],
      newEdges: newEdge ? [...edges, newEdge] : edges,
    };
  }

  // Not implementing parameter injection in this mock snippet, but the pattern is the same.
  // We locate the parent Parameters node, adjust Y offsets, add property edges.

  return { newNodes: nodes, newEdges: edges };
};
