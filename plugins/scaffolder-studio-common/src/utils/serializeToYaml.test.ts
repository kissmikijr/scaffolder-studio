import { serializeToYaml } from './serializeToYaml';
import yaml from 'js-yaml';
import type { Node } from '@xyflow/react';
import { AllNodeData } from '../types';

describe('serializeToYaml', () => {
  const mockNodes = [
    {
      id: 'template-node',
      type: 'template',
      position: { x: 0, y: 0 },
      data: {
        name: 'example-template',
        description: 'This is an example template',
        owner: 'guest',
        spec: { type: 'component' },
      },
    },
    {
      id: 'parameters-node',
      type: 'parameters',
      position: { x: 100, y: 100 },
      data: {
        title: 'Parameters',
        parameters: [
          { name: 'param1', type: 'string', required: true },
          { name: 'param2', type: 'number', required: false },
        ],
      },
    },
    {
      id: 'step-node',
      type: 'step',
      position: { x: 200, y: 200 },
      data: {
        stepId: 'example-action',
        name: 'example-action',
        actionId: 'example-action',
        formData: { key: 'value' },
      },
    },
  ];
  const mockEdges = [
    { id: 'edge-1', source: 'template-node', target: 'parameters-node' },
    { id: 'edge-2', source: 'parameters-node', target: 'step-node' },
    { id: 'edge-3', source: 'template-node', target: 'parameters-node' },
    { id: 'edge-4', source: 'parameters-node', target: 'step-node' },
  ];

  it('should serialize nodes and edges to YAML', () => {
    const yamlOutput = serializeToYaml({
      sourceNodeId: 'parameters-node',
      nodes: mockNodes as Node<AllNodeData>[],
      edges: mockEdges,
    });

    const expectedYaml = yaml.dump({
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: 'example-template',
        description: 'This is an example template',
      },
      spec: {
        owner: 'guest',
        type: 'component',
        parameters: [
          {
            title: 'Parameters',
            required: [],
            properties: {},
          },
        ],
        steps: [
          {
            id: 'example-action',
            name: 'example-action',
            action: 'example-action',
            input: { key: 'value' },
          },
        ],
      },
    });

    expect(yamlOutput).toBe(expectedYaml);
  });

  it('should throw an error if the source node is not found', () => {
    expect(() =>
      serializeToYaml({
        sourceNodeId: 'non-existent-node',
        nodes: mockNodes as Node<AllNodeData>[],
        edges: mockEdges,
      }),
    ).toThrow('Node with id non-existent-node not found');
  });

  it('should throw an error if the template node is not found', () => {
    const invalidNodes = mockNodes.filter(node => node.type !== 'template');

    expect(() =>
      serializeToYaml({
        sourceNodeId: 'parameters-node',
        nodes: invalidNodes as Node<AllNodeData>[],
        edges: mockEdges,
      }),
    ).toThrow('Template node not found in the tree');
  });
  it('should serialize if condition with wrapper', () => {
    const nodesWithIf = [
      ...mockNodes.filter(n => n.type !== 'step'),
      {
        id: 'step-node-if',
        type: 'step',
        position: { x: 200, y: 200 },
        data: {
          stepId: 'step-with-if',
          name: 'Step With If',
          actionId: 'example-action',
          formData: { key: 'value' },
          if: 'parameters.show',
        },
      },
    ];

    const yamlOutput = serializeToYaml({
      sourceNodeId: 'parameters-node',
      nodes: nodesWithIf as Node<AllNodeData>[],
      edges: mockEdges.map(e =>
        e.target === 'step-node' ? { ...e, target: 'step-node-if' } : e,
      ),
    });

    const parsed = yaml.load(yamlOutput) as any;
    expect(parsed.spec.steps[0].if).toBe('parameters.show');
  });

  it('should include managed-by annotations when requested', () => {
    const yamlOutput = serializeToYaml({
      sourceNodeId: 'parameters-node',
      nodes: mockNodes as Node<AllNodeData>[],
      edges: mockEdges,
      includeManagedByAnnotations: true,
    });

    const parsed = yaml.load(yamlOutput) as any;
    expect(parsed.metadata.annotations).toEqual({
      'backstage.io/managed-by-location': 'visual:scaffolder-studio',
      'backstage.io/managed-by-origin-location':
        'visual:scaffolder-studio',
    });
  });
});
