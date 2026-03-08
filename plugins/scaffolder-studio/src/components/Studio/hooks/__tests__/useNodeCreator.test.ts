import { renderHook, act } from '@testing-library/react';
import { useNodeCreator } from '../useNodeCreator';
import { Node } from '@xyflow/react';
import {
  AllNodeData,
  ParametersNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

// Mock dependencies
jest.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
  }),
}));

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

// Mock onChange to avoid errors
jest.mock('../../handlers', () => ({
  onChange: () => jest.fn(),
}));

jest.mock('../../nodeBase', () => ({
  getNodeBase: () => ({
    id: 'new-node-id',
    data: {},
    position: { x: 0, y: 0 },
    selected: false,
  }),
}));

describe('useNodeCreator', () => {
  let mockSetNodes: jest.Mock;
  let mockSetEdges: jest.Mock;
  let mockSetSelectedNode: jest.Mock;
  let mockHandleTabChange: jest.Mock;
  let connectSourceNodeIdRef: { current: string | null };

  beforeEach(() => {
    mockSetNodes = jest.fn();
    mockSetEdges = jest.fn();
    mockSetSelectedNode = jest.fn();
    mockHandleTabChange = jest.fn();
    connectSourceNodeIdRef = { current: null };
  });

  it('should resize parent ParametersNode when adding a PropertyNode outside bounds', () => {
    // Setup initial nodes with a ParametersNode
    const parametersNode: Node<ParametersNodeData> = {
      id: 'parameters-group',
      type: 'parameters',
      position: { x: 100, y: 100 },
      data: {
        type: 'parameters',
        title: 'Group',
        parameters: [],
        onChange: jest.fn(),
      },
      width: 300,
      height: 200,
      style: { width: 300, height: 200 },
    };

    const initialNodes: Node<AllNodeData>[] = [parametersNode];
    connectSourceNodeIdRef.current = 'parameters-group';

    const { result } = renderHook(() =>
      useNodeCreator({
        nodes: initialNodes,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        connectSourceNodeIdRef: connectSourceNodeIdRef as any,
        setSelectedNode: mockSetSelectedNode,
        handleTabChange: mockHandleTabChange,
        onAddProperty: jest.fn(),
      }),
    );

    // Mock current nodes in the hook's context for find operations
    // Note: The hook uses the prop 'nodes', so we pass initialNodes.
    // We simulate "screen" coordinates that resolve to a specific flow position.
    // screenToFlow is mocked to return constant x,y for simplicity,
    // effectively 1:1 mapping with passed args.

    // Target Layout:
    // Parameters: x:100, y:100, w:300, h:200 -> covers (100,100) to (400,300)
    // New Property Node:
    // We want it relative to parent.
    // If we drop it at x=150, y=400 (screen/flow absolute)
    // Relative to parent (100,100): x=50, y=300
    // Parent height is 200. Y=300 is outside.

    const dropX = 150;
    const dropY = 400;

    act(() => {
      result.current.handleAddPropertyNode({ x: dropX, y: dropY });
    });

    expect(mockSetNodes).toHaveBeenCalled();

    // Verify the function passed to setNodes produces the expected result
    const setNodesCallback = mockSetNodes.mock.calls[0][0];
    const updatedNodes = setNodesCallback(initialNodes);

    const updatedParent = updatedNodes.find(
      (n: Node) => n.id === 'parameters-group',
    );
    expect(updatedParent).toBeDefined();

    // New child estimated height is ~100. Rel Y is 300.
    // New height should be roughly 300 + 100 + padding(20) = 420
    // Or specific logic: relativeY (300) + childHeight (100) + padding (20) = 420
    // Let's just check it expanded beyond 200.
    expect(updatedParent.style.height).toBeGreaterThan(200);
    expect(updatedParent.height).toBeGreaterThan(200);

    // createPropertyNode generates its own id via uuidv4() which is mocked to 'mock-uuid'
    const newChild = updatedNodes.find((n: Node) => n.id === 'mock-uuid');
    expect(newChild).toBeDefined();
    expect(newChild.parentId).toBe('parameters-group');
    expect(newChild.position).toEqual({ x: 50, y: 300 });
  });

  it('should generate globally unique property names across parameters groups', () => {
    const firstParametersNode: Node<ParametersNodeData> = {
      id: 'parameters-group-1',
      type: 'parameters',
      position: { x: 100, y: 100 },
      data: {
        type: 'parameters',
        title: 'Group 1',
        parameters: [],
        onChange: jest.fn(),
      },
      width: 300,
      height: 200,
      style: { width: 300, height: 200 },
    };

    const secondParametersNode: Node<ParametersNodeData> = {
      id: 'parameters-group-2',
      type: 'parameters',
      position: { x: 500, y: 100 },
      data: {
        type: 'parameters',
        title: 'Group 2',
        parameters: [],
        onChange: jest.fn(),
      },
      width: 300,
      height: 200,
      style: { width: 300, height: 200 },
    };

    const existingPropertyNode: Node<AllNodeData> = {
      id: 'property-1',
      type: 'property',
      parentId: 'parameters-group-1',
      position: { x: 20, y: 60 },
      data: {
        name: 'property1',
        variableType: 'string',
        onChange: jest.fn(),
        'ui:field': '',
        'ui:options': '',
      },
    };

    const initialNodes: Node<AllNodeData>[] = [
      firstParametersNode,
      secondParametersNode,
      existingPropertyNode,
    ];
    connectSourceNodeIdRef.current = 'parameters-group-2';

    const { result } = renderHook(() =>
      useNodeCreator({
        nodes: initialNodes,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        connectSourceNodeIdRef: connectSourceNodeIdRef as any,
        setSelectedNode: mockSetSelectedNode,
        handleTabChange: mockHandleTabChange,
        onAddProperty: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleAddPropertyNode({ x: 540, y: 220 });
    });

    const setNodesCallback = mockSetNodes.mock.calls[0][0];
    const updatedNodes = setNodesCallback(initialNodes);
    const newChild = updatedNodes.find((n: Node) => n.id === 'mock-uuid');

    expect(newChild).toBeDefined();
    expect(newChild.data.name).toBe('property2');
  });

  it('should choose closest target handle using absolute position for parented source nodes', () => {
    const parentParametersNode: Node<AllNodeData> = {
      id: 'params-parent',
      type: 'parameters',
      position: { x: 200, y: 400 },
      data: {} as any,
      width: 300,
      height: 200,
    };

    const sourcePropertyNode: Node<AllNodeData> = {
      id: 'source-property',
      type: 'property',
      parentId: 'params-parent',
      extent: 'parent',
      position: { x: 20, y: 300 }, // relative to parent
      data: {} as any,
      width: 180,
      height: 100,
    };

    const initialNodes: Node<AllNodeData>[] = [
      parentParametersNode,
      sourcePropertyNode,
    ];

    const { result } = renderHook(() =>
      useNodeCreator({
        nodes: initialNodes,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        connectSourceNodeIdRef: connectSourceNodeIdRef as any,
        setSelectedNode: mockSetSelectedNode,
        handleTabChange: mockHandleTabChange,
        onAddProperty: jest.fn(),
      }),
    );

    act(() => {
      result.current.createStepNode({
        position: { x: 220, y: 500 },
        sourceNodeId: 'source-property',
        sourceHandle: 'bottom',
      });
    });

    expect(mockSetEdges).toHaveBeenCalled();
    const setEdgesCallback = mockSetEdges.mock.calls[0][0];
    const createdEdges = setEdgesCallback([]);
    expect(createdEdges[0].targetHandle).toBe('bottom');
  });

  it('should honor explicit step target handle override', () => {
    const sourceStepNode: Node<AllNodeData> = {
      id: 'source-step',
      type: 'step',
      position: { x: 100, y: 100 },
      data: {} as any,
      width: 220,
      height: 120,
    };

    const { result } = renderHook(() =>
      useNodeCreator({
        nodes: [sourceStepNode],
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        connectSourceNodeIdRef: connectSourceNodeIdRef as any,
        setSelectedNode: mockSetSelectedNode,
        handleTabChange: mockHandleTabChange,
        onAddProperty: jest.fn(),
      }),
    );

    act(() => {
      result.current.createStepNode({
        position: { x: 420, y: 100 },
        sourceNodeId: 'source-step',
        sourceHandle: 'top',
        targetHandle: 'top',
      });
    });

    expect(mockSetEdges).toHaveBeenCalled();
    const setEdgesCallback = mockSetEdges.mock.calls[0][0];
    const createdEdges = setEdgesCallback([]);
    expect(createdEdges[0].sourceHandle).toBe('top');
    expect(createdEdges[0].targetHandle).toBe('top');
  });
});
