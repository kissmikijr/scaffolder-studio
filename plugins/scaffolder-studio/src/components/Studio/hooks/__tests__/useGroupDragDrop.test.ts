
import { renderHook, act } from '@testing-library/react';
import { useGroupDragDrop } from '../useGroupDragDrop';
import { Node } from '@xyflow/react';
import {
    ParametersNodeData,
    PrefabNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

describe('useGroupDragDrop', () => {
    let mockSetNodes: jest.Mock;

    beforeEach(() => {
        mockSetNodes = jest.fn();
    });

    it('should correctly position a prefab when dropped into parameters node (Parameters exists first)', () => {
        const parametersNode: Node<ParametersNodeData> = {
            id: 'params-1',
            type: 'parameters',
            position: { x: 100, y: 100 },
            data: { type: 'parameters', title: 'Params', parameters: [], onChange: jest.fn() },
            width: 300,
            height: 200,
            measured: { width: 300, height: 200 },
        };

        const prefabNode: Node<PrefabNodeData> = {
            id: 'prefab-1',
            type: 'prefab',
            position: { x: 150, y: 150 }, // Inside params-1 visually (absolute)
            data: { type: 'prefab', id: 'some-prefab' },
            width: 100,
            height: 50,
            measured: { width: 100, height: 50 },
        };

        const nodes = [parametersNode, prefabNode];

        const { result } = renderHook(() =>
            useGroupDragDrop({ nodes, setNodes: mockSetNodes }),
        );

        // Simulate drag stop
        act(() => {
            // The node passed to callback has the current position (same as in array for this test)
            result.current.onNodeDragStop({} as any, prefabNode);
        });

        expect(mockSetNodes).toHaveBeenCalled();
        const setNodesCallback = mockSetNodes.mock.calls[0][0];
        const updatedNodes = setNodesCallback(nodes);
        const updatedPrefab = updatedNodes.find((n: Node) => n.id === 'prefab-1');

        expect(updatedPrefab.parentId).toBe('params-1');
        // Expected relative position: 150 - 100 = 50, 150 - 100 = 50
        expect(updatedPrefab.position).toEqual({ x: 50, y: 50 });
    });

    it('should correctly position a prefab when dropped into parameters node (Prefab exists first)', () => {
        const prefabNode: Node<PrefabNodeData> = {
            id: 'prefab-1',
            type: 'prefab',
            position: { x: 150, y: 150 }, // Inside params-1 visually (absolute)
            data: { type: 'prefab', id: 'some-prefab' },
            width: 100,
            height: 50,
            measured: { width: 100, height: 50 },
        };

        const parametersNode: Node<ParametersNodeData> = {
            id: 'params-1',
            type: 'parameters',
            position: { x: 100, y: 100 },
            data: { type: 'parameters', title: 'Params', parameters: [], onChange: jest.fn() },
            width: 300,
            height: 200,
            measured: { width: 300, height: 200 },
        };

        // Order reversed
        const nodes = [prefabNode, parametersNode];

        const { result } = renderHook(() =>
            useGroupDragDrop({ nodes, setNodes: mockSetNodes }),
        );

        // Simulate drag stop
        act(() => {
            result.current.onNodeDragStop({} as any, prefabNode);
        });

        expect(mockSetNodes).toHaveBeenCalled();
        const setNodesCallback = mockSetNodes.mock.calls[0][0];
        const updatedNodes = setNodesCallback(nodes);
        const updatedPrefab = updatedNodes.find((n: Node) => n.id === 'prefab-1');

        expect(updatedPrefab.parentId).toBe('params-1');
        // Expected relative position: 150 - 100 = 50, 150 - 100 = 50
        expect(updatedPrefab.position).toEqual({ x: 50, y: 50 });
    });
});
