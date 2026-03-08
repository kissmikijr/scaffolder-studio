import { renderHook, act } from '@testing-library/react';
import { useEditorHandlers } from '../useEditorHandlers';
import { Node, Edge, NodePositionChange } from '@xyflow/react';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import {
  RELATIONSHIP_IF_INPUT_HANDLE,
  RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
  toInputHandleId,
  toOutputHandleId,
} from '../useDependencyEdges';

// Mock dependencies
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useReactFlow: () => ({
    screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    getEdges: () => [],
  }),
  applyNodeChanges: jest.fn((changes, nodes) => {
    // Simple mock of applyNodeChanges just for position changes
    return nodes.map((node: any) => {
      const change = changes.find(
        (c: any) => c.id === node.id && c.type === 'position',
      );
      if (change && change.position) {
        return { ...node, position: change.position };
      }
      return node;
    });
  }),
}));

describe('useEditorHandlers snapping', () => {
  let mockSetNodes: jest.Mock;
  let mockSetEdges: jest.Mock;
  let mockSetSelectedNode: jest.Mock;
  let mockHandleTabChange: jest.Mock;
  let mockHandleAddOutputNode: jest.Mock;
  let mockHandleAddStepNode: jest.Mock;
  let mockHandleAddParametersNode: jest.Mock;
  let mockHandleAddPropertyNode: jest.Mock;
  let mockOnRelationshipConnectionDrawn: jest.Mock;
  let mockLoadPrefab: jest.Mock;
  let mockPromptForStepPrefabOverrides: jest.Mock;
  let contextMenuNodeIdRef: { current: string | null };
  let connectSourceNodeIdRef: { current: string | null };

  beforeEach(() => {
    mockSetNodes = jest.fn();
    mockSetEdges = jest.fn();
    mockSetSelectedNode = jest.fn();
    mockHandleTabChange = jest.fn();
    mockHandleAddOutputNode = jest.fn();
    mockHandleAddStepNode = jest.fn();
    mockHandleAddParametersNode = jest.fn();
    mockHandleAddPropertyNode = jest.fn();
    mockOnRelationshipConnectionDrawn = jest.fn();
    mockLoadPrefab = jest.fn();
    mockPromptForStepPrefabOverrides = jest.fn();
    contextMenuNodeIdRef = { current: null };
    connectSourceNodeIdRef = { current: null };
  });

  const setup = (nodes: Node<AllNodeData>[], edges: Edge[]) => {
    return renderHook(() =>
      useEditorHandlers({
        nodes,
        edges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        setSelectedNode: mockSetSelectedNode,
        handleTabChange: mockHandleTabChange,
        setPrefabMenu: jest.fn(),
        contextMenuNodeIdRef: contextMenuNodeIdRef as any,
        connectSourceNodeIdRef: connectSourceNodeIdRef as any,
        handleAddOutputNode: mockHandleAddOutputNode,
        handleAddStepNode: mockHandleAddStepNode,
        handleAddParametersNode: mockHandleAddParametersNode,
        handleAddPropertyNode: mockHandleAddPropertyNode,
        onRelationshipConnectionDrawn: mockOnRelationshipConnectionDrawn,
        onChange: jest.fn(),
        setSelectedEdge: jest.fn(),
        loadPrefab: mockLoadPrefab,
        promptForStepPrefabOverrides: mockPromptForStepPrefabOverrides,
      }),
    );
  };

  const getLatestSetNodesUpdater = () =>
    mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
  const getLatestSetEdgesUpdater = () =>
    mockSetEdges.mock.calls[mockSetEdges.mock.calls.length - 1][0];

  it('should NOT snap when Shift is NOT pressed', () => {
    const nodeA: Node<AllNodeData> = {
      id: 'A',
      position: { x: 0, y: 0 },
      data: {} as any,
    };
    const nodeB: Node<AllNodeData> = {
      id: 'B',
      position: { x: 100, y: 100 },
      data: {} as any,
    };
    const edge: Edge = { id: 'e1', source: 'A', target: 'B' };

    const { result } = setup([nodeA, nodeB], [edge]);

    const changes: NodePositionChange[] = [
      { id: 'A', type: 'position', position: { x: 0, y: 50 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeA, nodeB]);

    // Should NOT snap: A's Y should be 50
    expect(updatedNodes.find((n: Node) => n.id === 'A').position.y).toBe(50);
  });

  it('should snap to connected node Y when Shift is pressed', () => {
    const nodeA: Node<AllNodeData> = {
      id: 'A',
      position: { x: 0, y: 0 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const nodeB: Node<AllNodeData> = {
      id: 'B',
      position: { x: 200, y: 100 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const edge: Edge = { id: 'e1', source: 'A', target: 'B' };

    const { result } = setup([nodeA, nodeB], [edge]);

    // Simulate Shift key press
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    const changes: NodePositionChange[] = [
      { id: 'A', type: 'position', position: { x: 0, y: 120 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeA, nodeB]);

    // A.y + A.height*0.5 = B.y + B.height*0.5
    // targetY + 40*0.5 = 100 + 40*0.5 => targetY = 100
    expect(updatedNodes.find((n: Node) => n.id === 'A').position.y).toBe(100);
  });

  it('should snap to connected node X when Shift is pressed and closer to X', () => {
    const nodeA: Node<AllNodeData> = {
      id: 'A',
      position: { x: 0, y: 0 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const nodeB: Node<AllNodeData> = {
      id: 'B',
      position: { x: 200, y: 200 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const edge: Edge = { id: 'e1', source: 'A', target: 'B' };

    const { result } = setup([nodeA, nodeB], [edge]);

    // Simulate Shift key press
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    // Move A to be closer to B.x (200) than B.y (200) relative to current pos
    // targetX = 200 + 100*0.5 - 100*0.5 = 200
    // targetY = 200 + 40*0.5 - 40*0.5 = 200
    const changes: NodePositionChange[] = [
      { id: 'A', type: 'position', position: { x: 180, y: 50 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeA, nodeB]);

    // Should snap X because |180 - 200| < |50 - 200|
    const updatedA = updatedNodes.find((n: Node) => n.id === 'A');
    expect(updatedA.position.x).toBe(200);
    expect(updatedA.position.y).toBe(50);
  });

  it('should account for specific handle offsets (e.g. step at 45%)', () => {
    const nodeTemplate: Node<AllNodeData> = {
      id: 'template',
      type: 'template',
      position: { x: 0, y: 0 },
      data: {} as any,
      measured: { width: 260, height: 200 },
    };
    const nodeStep: Node<AllNodeData> = {
      id: 'step',
      type: 'step',
      position: { x: 400, y: 100 },
      data: {} as any,
      measured: { width: 200, height: 100 },
    };
    // Connection from Template (sourceHandle 'step') to Step (targetHandle default)
    const edge: Edge = {
      id: 'e1',
      source: 'template',
      target: 'step',
      sourceHandle: 'right',
    };

    const { result } = setup([nodeTemplate, nodeStep], [edge]);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    // Move Step node
    const changes: NodePositionChange[] = [
      { id: 'step', type: 'position', position: { x: 400, y: 150 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeTemplate, nodeStep]);
    const updatedStep = updatedNodes.find((n: Node) => n.id === 'step');

    // template.y + template.height * 0.5 = step.y + step.height * 0.5
    // 0 + 200 * 0.5 = targetY + 100 * 0.5
    // 100 = targetY + 50 => targetY = 50
    expect(updatedStep.position.y).toBe(50);
  });

  it('should account for parameters handle at 50% (new standard)', () => {
    const nodeTemplate: Node<AllNodeData> = {
      id: 'template',
      type: 'template',
      position: { x: 0, y: 0 },
      data: {} as any,
      measured: { width: 260, height: 200 },
    };
    const nodeParams: Node<AllNodeData> = {
      id: 'params',
      type: 'parameters',
      position: { x: 400, y: 100 },
      data: {} as any,
      measured: { width: 300, height: 200 },
    };
    // Connection from Template (sourceHandle 'parameters') to ParametersNode (targetHandle default)
    const edge: Edge = {
      id: 'e1',
      source: 'template',
      target: 'params',
      sourceHandle: 'bottom',
    };

    const { result } = setup([nodeTemplate, nodeParams], [edge]);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    // Move Params node
    const changes: NodePositionChange[] = [
      { id: 'params', type: 'position', position: { x: 400, y: 150 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeTemplate, nodeParams]);
    const updatedParams = updatedNodes.find((n: Node) => n.id === 'params');

    // template.y + template.height * 0.5 = params.y + params.height * 0.5
    // 0 + 200 * 0.5 = targetY + 200 * 0.5
    // 100 = targetY + 100 => targetY = 0
    expect(updatedParams.position.y).toBe(0);
  });

  it('should stop snapping when Shift is released', () => {
    const nodeA: Node<AllNodeData> = {
      id: 'A',
      position: { x: 0, y: 0 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const nodeB: Node<AllNodeData> = {
      id: 'B',
      position: { x: 200, y: 100 },
      data: {} as any,
      measured: { width: 100, height: 40 },
    };
    const edge: Edge = { id: 'e1', source: 'A', target: 'B' };

    const { result } = setup([nodeA, nodeB], [edge]);

    // Press Shift
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    // Release Shift
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    });

    const changes: NodePositionChange[] = [
      { id: 'A', type: 'position', position: { x: 0, y: 50 } },
    ];

    act(() => {
      result.current.handleNodesChange(changes);
    });

    const callback = getLatestSetNodesUpdater();
    const updatedNodes = callback([nodeA, nodeB]);
    expect(updatedNodes.find((n: Node) => n.id === 'A').position.y).toBe(50);
  });

  it('should create parameters node when dragging from any parameters handle', () => {
    const paramsNode: Node<AllNodeData> = {
      id: 'params',
      type: 'parameters',
      position: { x: 100, y: 100 },
      data: {} as any,
    };

    const { result } = setup([paramsNode], []);

    act(() => {
      result.current.onConnectEnd(
        { clientX: 300, clientY: 260 } as any,
        {
          fromNode: paramsNode as any,
          fromHandle: { id: 'right' },
          toHandle: null,
        } as any,
      );
    });

    expect(mockHandleAddParametersNode).toHaveBeenCalled();
    expect(mockHandleAddPropertyNode).not.toHaveBeenCalled();
  });

  it('validates relationship handle connections to step inputs', () => {
    const propertyNode: Node<AllNodeData> = {
      id: 'property',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };
    const stepNode: Node<AllNodeData> = {
      id: 'step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: { repoUrl: '' },
        schema: {
          input: {
            type: 'object',
            properties: { repoUrl: { type: 'string' } },
          },
          output: {
            type: 'object',
            properties: { result: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([propertyNode, stepNode], []);

    expect(
      result.current.isValidConnection({
        source: propertyNode.id,
        sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
        target: stepNode.id,
        targetHandle: toInputHandleId('repoUrl'),
      } as any),
    ).toBe(true);
  });

  it('inserts a parameters token when connecting relationship handles into input', () => {
    const propertyNode: Node<AllNodeData> = {
      id: 'property',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };
    const stepNode: Node<AllNodeData> = {
      id: 'step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: { repoUrl: '' },
        schema: {
          input: {
            type: 'object',
            properties: { repoUrl: { type: 'string' } },
          },
          output: {
            type: 'object',
            properties: { result: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([propertyNode, stepNode], []);
    mockSetNodes.mockClear();
    mockSetEdges.mockClear();

    act(() => {
      result.current.onConnect({
        source: propertyNode.id,
        sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
        target: stepNode.id,
        targetHandle: toInputHandleId('repoUrl'),
      } as any);
    });

    expect(mockSetEdges).not.toHaveBeenCalled();
    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockOnRelationshipConnectionDrawn).toHaveBeenCalledTimes(1);
    const updater = getLatestSetNodesUpdater();
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find((n: Node<AllNodeData>) => n.id === 'step');
    expect((nextStep?.data as any).formData.repoUrl).toBe(
      '${{ parameters.repoUrl }}',
    );
  });

  it('stores a relationship reference when connecting property handle into a step input', () => {
    const propertyNode: Node<AllNodeData> = {
      id: 'property',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };
    const stepNode: Node<AllNodeData> = {
      id: 'step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: { repoUrl: '' },
        schema: {
          input: {
            type: 'object',
            properties: { repoUrl: { type: 'string' } },
          },
          output: {
            type: 'object',
            properties: { result: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([propertyNode, stepNode], []);
    mockSetNodes.mockClear();

    act(() => {
      result.current.onConnect({
        source: propertyNode.id,
        sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
        target: stepNode.id,
        targetHandle: toInputHandleId('repoUrl'),
      } as any);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    const updater = getLatestSetNodesUpdater();
    const nextNodes = updater([propertyNode, stepNode]);
    const nextStep = nextNodes.find((n: Node<AllNodeData>) => n.id === 'step');

    expect((nextStep?.data as any).relationshipRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceNodeId: 'property',
          sourceKind: 'property',
          targetField: 'repoUrl',
          lastRenderedToken: '${{ parameters.repoUrl }}',
        }),
      ]),
    );
  });

  it('inserts a parameters token when connecting relationship handles into if', () => {
    const propertyNode: Node<AllNodeData> = {
      id: 'property',
      type: 'property',
      position: { x: 0, y: 0 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };
    const targetStep: Node<AllNodeData> = {
      id: 'target-step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: {
            type: 'object',
            properties: { done: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([propertyNode, targetStep], []);
    mockSetNodes.mockClear();

    act(() => {
      result.current.onConnect({
        source: propertyNode.id,
        sourceHandle: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
        target: targetStep.id,
        targetHandle: RELATIONSHIP_IF_INPUT_HANDLE,
      } as any);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockOnRelationshipConnectionDrawn).toHaveBeenCalledTimes(1);
    const updater = getLatestSetNodesUpdater();
    const nextNodes = updater([propertyNode, targetStep]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'target-step',
    );
    expect((nextStep?.data as any).if).toBe('${{ parameters.repoUrl }}');
  });

  it('inserts a step output token when connecting to if handle', () => {
    const sourceStep: Node<AllNodeData> = {
      id: 'source-step',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'build',
        if: '',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: {
            type: 'object',
            properties: { result: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };
    const targetStep: Node<AllNodeData> = {
      id: 'target-step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '${{ parameters.repoUrl | lower }}',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: {
            type: 'object',
            properties: { done: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([sourceStep, targetStep], []);
    mockSetNodes.mockClear();

    act(() => {
      result.current.onConnect({
        source: sourceStep.id,
        sourceHandle: toOutputHandleId('result'),
        target: targetStep.id,
        targetHandle: RELATIONSHIP_IF_INPUT_HANDLE,
      } as any);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockOnRelationshipConnectionDrawn).toHaveBeenCalledTimes(1);
    const updater = getLatestSetNodesUpdater();
    const nextNodes = updater([sourceStep, targetStep]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'target-step',
    );
    expect((nextStep?.data as any).if).toBe(
      "${{ parameters.repoUrl | lower }} ${{ steps['build'].output['result'] }}",
    );
  });

  it('inserts a step output token when connecting to a step input handle', () => {
    const sourceStep: Node<AllNodeData> = {
      id: 'source-step',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'build',
        if: '',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: {
            type: 'object',
            properties: { result: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };
    const targetStep: Node<AllNodeData> = {
      id: 'target-step',
      type: 'step',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: { message: '${{ parameters.repoUrl }}' },
        schema: {
          input: {
            type: 'object',
            properties: { message: { type: 'string' } },
          },
          output: {
            type: 'object',
            properties: { done: { type: 'string' } },
          },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([sourceStep, targetStep], []);
    mockSetNodes.mockClear();

    act(() => {
      result.current.onConnect({
        source: sourceStep.id,
        sourceHandle: toOutputHandleId('result'),
        target: targetStep.id,
        targetHandle: toInputHandleId('message'),
      } as any);
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockOnRelationshipConnectionDrawn).toHaveBeenCalledTimes(1);
    const updater = getLatestSetNodesUpdater();
    const nextNodes = updater([sourceStep, targetStep]);
    const nextStep = nextNodes.find(
      (n: Node<AllNodeData>) => n.id === 'target-step',
    );
    expect((nextStep?.data as any).formData.message).toBe(
      "${{ parameters.repoUrl }} ${{ steps['build'].output['result'] }}",
    );
  });

  it('does not auto-create nodes when relationship handle drag ends on pane', () => {
    const propertyNode: Node<AllNodeData> = {
      id: 'property',
      type: 'property',
      position: { x: 100, y: 100 },
      data: {
        name: 'repoUrl',
        variableType: 'string',
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([propertyNode], []);
    mockHandleAddPropertyNode.mockClear();
    mockHandleAddStepNode.mockClear();

    act(() => {
      result.current.onConnectEnd(
        { clientX: 300, clientY: 260 } as any,
        {
          fromNode: propertyNode as any,
          fromHandle: { id: RELATIONSHIP_PROPERTY_OUTPUT_HANDLE },
          toHandle: null,
        } as any,
      );
    });

    expect(mockHandleAddPropertyNode).not.toHaveBeenCalled();
    expect(mockHandleAddStepNode).not.toHaveBeenCalled();
  });

  it('does not notify relationship toggle callback for structural connections', () => {
    const sourceStep: Node<AllNodeData> = {
      id: 'source-step',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'build',
        if: '',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: { type: 'object', properties: {} },
        },
        onChange: jest.fn(),
      } as any,
    };
    const targetStep: Node<AllNodeData> = {
      id: 'target-step',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        if: '',
        formData: {},
        schema: {
          input: { type: 'object', properties: {} },
          output: { type: 'object', properties: {} },
        },
        onChange: jest.fn(),
      } as any,
    };

    const { result } = setup([sourceStep, targetStep], []);
    mockSetEdges.mockClear();
    mockOnRelationshipConnectionDrawn.mockClear();

    act(() => {
      result.current.onConnect({
        source: sourceStep.id,
        sourceHandle: 'right',
        target: targetStep.id,
        targetHandle: 'left',
      } as any);
    });

    expect(mockSetEdges).toHaveBeenCalled();
    expect(mockOnRelationshipConnectionDrawn).not.toHaveBeenCalled();
  });

  it('reconnects step edges through top handles when deleting intermediate step', () => {
    const stepA: Node<AllNodeData> = {
      id: 'step-a',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {} as any,
    };
    const stepB: Node<AllNodeData> = {
      id: 'step-b',
      type: 'step',
      position: { x: 200, y: 0 },
      data: {} as any,
    };
    const stepC: Node<AllNodeData> = {
      id: 'step-c',
      type: 'step',
      position: { x: 400, y: 0 },
      data: {} as any,
    };

    const edges: Edge[] = [
      { id: 'e1', source: 'step-a', target: 'step-b' },
      { id: 'e2', source: 'step-b', target: 'step-c' },
    ];

    const { result } = setup([stepA, stepB, stepC], edges);
    mockSetEdges.mockClear();

    act(() => {
      result.current.handleNodesDelete([stepB]);
    });

    const setNodesUpdater = getLatestSetNodesUpdater();
    setNodesUpdater([stepA, stepB, stepC]);

    expect(mockSetEdges).toHaveBeenCalled();
    const setEdgesUpdater = getLatestSetEdgesUpdater();
    const nextEdges = setEdgesUpdater(edges);

    expect(nextEdges).toEqual([
      {
        id: 'step-a-step-c',
        source: 'step-a',
        target: 'step-c',
        sourceHandle: 'top',
        targetHandle: 'top',
      },
    ]);
  });

  it('assigns a unique stepIdOverride when dropping a colliding step prefab', async () => {
    const existingStepNode: Node<AllNodeData> = {
      id: 'step-1',
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        type: 'step',
        stepId: 'publish',
        name: 'publish',
        if: '',
        formData: {},
        onChange: jest.fn(),
      } as any,
    };

    mockLoadPrefab.mockResolvedValue({
      id: 'prefab-1',
      node: {
        id: 'prefab-step-node',
        type: 'step',
        position: { x: 0, y: 0 },
        data: {
          type: 'step',
          stepId: 'publish',
          name: 'Publish',
          if: '',
          formData: {},
          onChange: jest.fn(),
        },
      },
    });
    mockPromptForStepPrefabOverrides.mockResolvedValue({
      stepId: 'publish-1',
      name: 'Publish Copy',
    });

    const { result } = setup([existingStepNode], []);

    const getData = (type: string) => {
      switch (type) {
        case 'application/reactflow':
          return 'prefab';
        case 'application/reactflow/id':
          return 'prefab-1';
        case 'application/reactflow/version':
          return '';
        case 'application/reactflow/refType':
          return 'step';
        default:
          return '';
      }
    };

    await act(async () => {
      await result.current.handleDrop({
        preventDefault: jest.fn(),
        clientX: 240,
        clientY: 160,
        dataTransfer: {
          getData,
        },
      } as any);
    });

    expect(mockLoadPrefab).toHaveBeenCalledWith('prefab-1', undefined);
    expect(mockPromptForStepPrefabOverrides).toHaveBeenCalledWith({
      stepId: 'publish-1',
      name: 'Publish',
    });
    expect(mockSetNodes).toHaveBeenCalled();

    const updater = getLatestSetNodesUpdater();
    const updatedNodes = updater([existingStepNode]);
    const newPrefabNode = updatedNodes.find(
      (n: Node) => n.type === 'prefab' && (n.data as any).id === 'prefab-1',
    );

    expect(newPrefabNode).toBeDefined();
    expect(newPrefabNode.data.stepIdOverride).toBe('publish-1');
    expect(newPrefabNode.data.stepNameOverride).toBe('Publish Copy');
  });
});
