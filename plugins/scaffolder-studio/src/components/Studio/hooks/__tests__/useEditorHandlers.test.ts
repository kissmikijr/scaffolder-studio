import { renderHook, act } from '@testing-library/react';
import { useEditorHandlers } from '../useEditorHandlers';
import { Node, Edge, NodePositionChange } from '@xyflow/react';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';

// Mock dependencies
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useReactFlow: () => ({
    screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
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
        onChange: jest.fn(),
        setSelectedEdge: jest.fn(),
      }),
    );
  };

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
    const callback = mockSetNodes.mock.calls[0][0];
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
    const callback = mockSetNodes.mock.calls[0][0];
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
    const callback = mockSetNodes.mock.calls[0][0];
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

    const callback = mockSetNodes.mock.calls[0][0];
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

    const callback = mockSetNodes.mock.calls[0][0];
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

    const callback = mockSetNodes.mock.calls[0][0];
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
});
