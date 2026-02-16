import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { ScaffolderAction, ParametersNodeData } from '../types';
import type { Edge, Node } from '@xyflow/react';

interface TemplateYaml {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
  };
  spec: {
    type: string;
    owner: string;
    parameters?: Array<{
      title: string;
      required?: string[];
      properties: Record<string, any>;
    }>;
    steps: Array<{
      id: string;
      name: string;
      action: string;
      if?: string;
      input?: Record<string, any>;
      schema?: Record<string, any>;
    }>;
    output?: {
      links?: Array<{
        title: string;
        url?: string;
        icon?: string;
        entityRef?: string;
      }>;
      text?: Array<string>;
    };
  };
}
const STATIC_X_POSITION = 380;
const STATIC_Y_POSITION = 125;

const getDynamicXPosition = (index: number) => {
  return STATIC_X_POSITION * (index + 1);
};
const getDynamicYPosition = (index: number) => {
  return STATIC_Y_POSITION * (index + 1);
};

export const parseScaffolderTemplate = (
  yamlData: object,
  availableActions: ScaffolderAction[] = [],
) => {
  const yaml = yamlData as TemplateYaml;

  const templateNode = {
    id: uuidv4(),
    type: 'template',
    position: { x: 0, y: 0 },
    selected: false,
    data: {
      spec: { type: yaml.spec.type },
      name: yaml.metadata.name,
      description: yaml.metadata.description || '',
      owner: yaml.spec.owner,
    },
  };

  // Create parameter nodes
  const parameterNodes: Node<ParametersNodeData>[] = [];
  const parameterEdges: Edge[] = [];
  const propertyEdges: Edge[] = [];

  if (yaml.spec.parameters && yaml.spec.parameters.length > 0) {
    // Create all parameter nodes first
    const paramNodes = yaml.spec.parameters.map((param, index) => {
      const x = STATIC_X_POSITION;
      const y = getDynamicYPosition(index);
      return {
        id: uuidv4(),
        type: 'parameters',
        position: { x, y },
        data: {
          title: param.title,
          required: param.required || [],
        },
      };
    });

    for (let i = 0; i < paramNodes.length - 1; i++) {
      parameterEdges.push({
        id: `${paramNodes[i].id}-${paramNodes[i + 1].id}`,
        source: paramNodes[i].id,
        target: paramNodes[i + 1].id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
      });
    }

    parameterNodes.push(
      ...(paramNodes as unknown as Node<ParametersNodeData>[]),
    );

    yaml.spec.parameters.forEach((param, paramIndex) => {
      const paramNode = paramNodes[paramIndex];

      if (param.properties) {
        let prevPropertyId = paramNode.id; // Start with the parameter node as the source

        Object.entries(param.properties).forEach(
          ([name, config], propIndex) => {
            const propertyNode = {
              id: uuidv4(),
              type: 'property',
              position: {
                x: getDynamicXPosition(propIndex + 1),
                y: getDynamicYPosition(paramIndex) * 1.2,
              },
              data: {
                name,
                type: 'property',
                variableType: config.type || 'string',
                required: param.required?.includes(name) || false,
                'ui:field': config['ui:field'],
                'ui:options': config['ui:options'],
              },
            };
            parameterNodes.push(
              propertyNode as unknown as Node<ParametersNodeData>,
            );

            propertyEdges.push({
              id: `${prevPropertyId}-${propertyNode.id}`,
              source: prevPropertyId,
              target: propertyNode.id,
              sourceHandle: 'right',
              targetHandle: 'left',
            });

            prevPropertyId = propertyNode.id;
          },
        );
      }
    });
  }

  // Create step nodes
  const stepNodes = yaml.spec.steps.map((step, index) => {
    const x = getDynamicXPosition(index);

    // Find matching action to get the schema
    const matchingAction = availableActions.find(
      action => action.id === step.action,
    );
    const schema = matchingAction?.schema || step.schema;

    // Get action description if available
    const description = matchingAction?.description || '';

    return {
      id: uuidv4(),
      type: 'step',
      position: { x, y: -125 },
      data: {
        name: step.name,
        stepId: step.id,
        actionId: step.action,
        if: step?.if,
        schema: schema,
        formData: step?.input,
        description: description,
      },
    };
  });

  // Create output node if present
  const outputNodes: Node[] = [];
  if (yaml.spec.output) {
    const outputNode = {
      id: uuidv4(),
      type: 'templateOutput',
      position: { x: 0, y: STATIC_Y_POSITION * 3 },
      data: {
        links: yaml.spec.output.links || [],
        text: yaml.spec.output.text || [],
      },
    };
    outputNodes.push(outputNode);
  }

  // Create edges between steps
  const stepEdges: Edge[] = [];
  if (stepNodes.length > 0) {
    stepEdges.push({
      id: `${templateNode.id}-${stepNodes[0].id}`,
      source: templateNode.id,
      target: stepNodes[0].id,
      sourceHandle: 'step',
      targetHandle: 'left',
    });

    for (let i = 0; i < stepNodes.length - 1; i++) {
      const source = stepNodes[i].id;
      const target = stepNodes[i + 1].id;
      stepEdges.push({
        id: `${source}-${target}`,
        source,
        target,
        sourceHandle: 'right',
        targetHandle: 'left',
      });
    }
  }

  // Create edges between template and first parameter/step/output
  const templateEdges: Edge[] = [];

  // Connect template to first parameter node if exists
  if (parameterNodes.length > 0 && parameterNodes[0].type === 'parameters') {
    templateEdges.push({
      id: `${templateNode.id}-${parameterNodes[0].id}`,
      source: templateNode.id,
      target: parameterNodes[0].id,
      sourceHandle: 'parameters',
      targetHandle: 'left',
    });
  }
  if (outputNodes.length > 0) {
    templateEdges.push({
      id: `${templateNode.id}-${outputNodes[0].id}`,
      source: templateNode.id,
      target: outputNodes[0].id,
      sourceHandle: 'output',
      targetHandle: 'top',
    });
  }

  // Collect all nodes and edges
  return {
    nodes: [templateNode, ...parameterNodes, ...stepNodes, ...outputNodes],
    edges: [
      ...templateEdges,
      ...parameterEdges,
      ...stepEdges,
      ...propertyEdges,
    ],
  };
};
