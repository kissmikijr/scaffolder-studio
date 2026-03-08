import { Node } from '@xyflow/react';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { getNextGlobalPropertyName } from './nodeFunctions';

describe('getNextGlobalPropertyName', () => {
  it('increments from the highest default property suffix in the graph', () => {
    const nodes: Node<AllNodeData>[] = [
      {
        id: 'parameters-1',
        type: 'parameters',
        position: { x: 0, y: 0 },
        data: {
          type: 'parameters',
          title: 'Group 1',
          parameters: [],
          onChange: jest.fn(),
        },
      },
      {
        id: 'parameters-2',
        type: 'parameters',
        position: { x: 400, y: 0 },
        data: {
          type: 'parameters',
          title: 'Group 2',
          parameters: [],
          onChange: jest.fn(),
        },
      },
      {
        id: 'property-1',
        type: 'property',
        parentId: 'parameters-1',
        position: { x: 20, y: 60 },
        data: {
          name: 'property1',
          variableType: 'string',
          onChange: jest.fn(),
          'ui:field': '',
          'ui:options': '',
        },
      },
      {
        id: 'property-2',
        type: 'property',
        parentId: 'parameters-2',
        position: { x: 20, y: 60 },
        data: {
          name: 'repoUrl',
          variableType: 'string',
          onChange: jest.fn(),
          'ui:field': '',
          'ui:options': '',
        },
      },
      {
        id: 'property-3',
        type: 'property',
        parentId: 'parameters-2',
        position: { x: 20, y: 160 },
        data: {
          name: 'property7',
          variableType: 'string',
          onChange: jest.fn(),
          'ui:field': '',
          'ui:options': '',
        },
      },
    ];

    expect(getNextGlobalPropertyName(nodes)).toBe('property8');
  });
});
