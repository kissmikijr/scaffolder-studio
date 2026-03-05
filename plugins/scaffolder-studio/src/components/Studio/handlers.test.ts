import { Node } from '@xyflow/react';
import { AllNodeData } from './types';
import { onChange } from './handlers';

describe('onChange relationship refs', () => {
  it('updates relationship-linked step expressions when a property name changes', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '${{ parameters.repoUrl }}',
        formData: {
          message: 'Deploying ${{ parameters.repoUrl }}',
        },
        relationshipRefs: [
          {
            sourceNodeId: 'property-1',
            sourceKind: 'property',
            targetField: 'if',
            lastRenderedToken: '${{ parameters.repoUrl }}',
          },
          {
            sourceNodeId: 'property-1',
            sourceKind: 'property',
            targetField: 'message',
            lastRenderedToken: '${{ parameters.repoUrl }}',
          },
        ],
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe('${{ parameters.repositoryUrl }}');
    expect((nextStep?.data as any).formData.message).toBe(
      'Deploying ${{ parameters.repositoryUrl }}',
    );
  });

  it('preserves filters when renaming relationship-linked expressions', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '${{ parameters.repoUrl | lower }}',
        formData: {
          message: '${{ parameters.repoUrl | trim }}',
        },
        relationshipRefs: [
          {
            sourceNodeId: 'property-1',
            sourceKind: 'property',
            targetField: 'if',
            lastRenderedToken: '${{ parameters.repoUrl }}',
          },
          {
            sourceNodeId: 'property-1',
            sourceKind: 'property',
            targetField: 'message',
            lastRenderedToken: '${{ parameters.repoUrl }}',
          },
        ],
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe(
      '${{ parameters.repositoryUrl | lower }}',
    );
    expect((nextStep?.data as any).formData.message).toBe(
      '${{ parameters.repositoryUrl | trim }}',
    );
  });

  it('rewrites legacy token expressions when no relationship refs are present', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '${{ parameters.repoUrl }}',
        formData: {
          message: 'Deploying ${{ parameters.repoUrl }}',
        },
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe('${{ parameters.repositoryUrl }}');
    expect((nextStep?.data as any).formData.message).toBe(
      'Deploying ${{ parameters.repositoryUrl }}',
    );
  });

  it('rewrites legacy token expressions with compact spacing', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '${{parameters.repoUrl}}',
        formData: {
          message: 'Deploying ${{parameters.repoUrl}}',
        },
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe('${{ parameters.repositoryUrl }}');
    expect((nextStep?.data as any).formData.message).toBe(
      'Deploying ${{ parameters.repositoryUrl }}',
    );
  });

  it('rewrites legacy raw token expressions when field is a pure token', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: 'parameters.repoUrl | lower',
        formData: {
          message: 'parameters.repoUrl',
        },
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe('parameters.repositoryUrl | lower');
    expect((nextStep?.data as any).formData.message).toBe(
      'parameters.repositoryUrl',
    );
  });

  it('rewrites legacy nested object expressions in formData', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: '',
        formData: {
          config: {
            url: '${{ parameters.repoUrl }}',
            nested: [{ again: '${{parameters.repoUrl}}' }],
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).formData.config.url).toBe(
      '${{ parameters.repositoryUrl }}',
    );
    expect((nextStep?.data as any).formData.config.nested[0].again).toBe(
      '${{ parameters.repositoryUrl }}',
    );
  });

  it('does not rewrite unrelated free text', () => {
    const setNodes = jest.fn();
    const handleChange = onChange(setNodes as any);

    const propertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const stepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 240, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'Publish',
        if: 'if parameters.repoUrl',
        formData: {
          message: 'Deploying parameters.repoUrl',
        },
        onChange: jest.fn(),
      } as any,
    };

    handleChange('property-1', { name: 'repositoryUrl' });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updater = setNodes.mock.calls[0][0];
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'step-1',
    );

    expect((nextStep?.data as any).if).toBe('if parameters.repoUrl');
    expect((nextStep?.data as any).formData.message).toBe(
      'Deploying parameters.repoUrl',
    );
  });
});
