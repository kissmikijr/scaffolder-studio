import { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';

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

const templateYamlToProjectData = (
  yamlData: object,
  availableActions: ScaffolderAction[] = [],
) => {
  const templateYaml = yamlData as TemplateYaml;

  const templateNode = {
    id: uuidv4(),
    type: 'template',
    position: { x: 0, y: 0 },
    selected: false,
    data: {
      spec: { type: templateYaml.spec.type },
      name: templateYaml.metadata.name,
      description: templateYaml.metadata.description || '',
      owner: templateYaml.spec.owner,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      customYamlData: (({ apiVersion, kind, metadata, spec, ...rest }) => rest)(
        templateYaml as any,
      ),
    },
  };

  // Create parameter nodes
  const parameterNodes: Node[] = [];
  const parameterEdges: Edge[] = [];
  const propertyEdges: Edge[] = [];

  if (templateYaml.spec.parameters && templateYaml.spec.parameters.length > 0) {
    // Create all parameter nodes first
    const paramNodes = templateYaml.spec.parameters.map((param, index) => {
      const x = index * STATIC_X_POSITION; // Layout horizontally left to right
      const y = STATIC_Y_POSITION * 2.5; // Fixed Y position below template
      return {
        id: uuidv4(),
        type: 'parameters',
        position: { x, y },
        data: {
          title: param.title,
          required: param.required || [],
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          customYamlData: (({ title, required, properties, ...rest }) => rest)(
            param as any,
          ),
        },
      };
    });

    for (let i = 0; i < paramNodes.length - 1; i++) {
      parameterEdges.push({
        id: `${paramNodes[i].id}-${paramNodes[i + 1].id}`,
        source: paramNodes[i].id,
        target: paramNodes[i + 1].id,
        sourceHandle: 'right', // Parameters link left to right
        targetHandle: 'left',
      });
    }

    parameterNodes.push(...paramNodes);

    templateYaml.spec.parameters.forEach((param, paramIndex) => {
      const paramNode = paramNodes[paramIndex];

      if (param.properties) {
        let prevPropertyId = paramNode.id; // Start with the parameter node as the source

        Object.entries(param.properties).forEach(
          ([name, config], propIndex) => {
            const propertyNode = {
              id: uuidv4(),
              type: 'property',
              // Set parent/extent to constrain within the parameter group
              parentId: paramNode.id,
              extent: 'parent' as 'parent',
              position: {
                x: 20, // Relative X to parent
                // Relative Y to parent
                y: 60 + propIndex * 80,
              },
              data: {
                name,
                type: 'property',
                variableType: config.type || 'string',
                required: param.required?.includes(name) || false,
                'ui:field': config['ui:field'],
                'ui:options': config['ui:options'],
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                customYamlData: (({
                  type,
                  description,
                  'ui:field': uf,
                  'ui:options': uo,
                  pattern,
                  enum: e,
                  title,
                  ...rest
                }) => rest)(config as any),
              },
            };
            parameterNodes.push(propertyNode);

            // Link properties together (P1 -> P2), but DO NOT link Parameter -> P1
            if (propIndex > 0) {
              propertyEdges.push({
                id: `${prevPropertyId}-${propertyNode.id}`,
                source: prevPropertyId,
                target: propertyNode.id,
                sourceHandle: 'bottom', // Properties link top to bottom
                targetHandle: 'top',
                type: 'custom-step',
                zIndex: 1001,
              });
            }

            prevPropertyId = propertyNode.id;

            prevPropertyId = propertyNode.id;
          },
        );
      }
    });
  }

  // Create step nodes
  const stepNodes = templateYaml.spec.steps.map((step, index) => {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        customYamlData: (({
          id,
          name,
          action,
          if: ifCond,
          input,
          schema: sch,
          ...rest
        }) => rest)(step as any),
      },
    };
  });

  // Create output node if present
  const outputNodes: Node[] = [];
  if (templateYaml.spec.output) {
    const outputNode = {
      id: uuidv4(),
      type: 'templateOutput',
      position: { x: -STATIC_X_POSITION, y: 0 }, // Position to the left of template
      data: {
        links: templateYaml.spec.output.links || [],
        text: templateYaml.spec.output.text || [],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        customYamlData: (({ links, text, ...rest }) => rest)(
          templateYaml.spec.output as any,
        ),
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
      sourceHandle: 'right',
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
      sourceHandle: 'bottom', // Template bottom connects to Parameter top
      targetHandle: 'top',
    });
  }
  if (outputNodes.length > 0) {
    templateEdges.push({
      id: `${templateNode.id}-${outputNodes[0].id}`,
      source: templateNode.id,
      target: outputNodes[0].id,
      sourceHandle: 'left', // Template left connects to Output right
      targetHandle: 'right',
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

export default templateYamlToProjectData;
