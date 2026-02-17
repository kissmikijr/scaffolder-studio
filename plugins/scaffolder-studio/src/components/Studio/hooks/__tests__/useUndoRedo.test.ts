import { renderHook, act } from '@testing-library/react';
import { EditorState, useUndoRedo } from '../useUndoRedo';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';

describe('useUndoRedo', () => {
  it('should initialize with correct initial state', () => {
    const initialState = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const mockOnStateChange = jest.fn();

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockOnStateChange),
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should save state and allow undo', () => {
    const initialState = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const mockOnStateChange = jest.fn();

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockOnStateChange),
    );

    // Save a new state
    const newState = {
      nodes: [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    act(() => {
      result.current.saveState(newState as unknown as EditorState);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Perform undo
    act(() => {
      result.current.undo();
    });

    expect(mockOnStateChange).toHaveBeenCalledWith(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should not save duplicate states', () => {
    const initialState = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const mockOnStateChange = jest.fn();

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockOnStateChange),
    );

    const state: EditorState = {
      nodes: [
        {
          id: '1',
          type: 'test',
          position: { x: 0, y: 0 },
          data: {} as AllNodeData,
        },
      ],
      edges: [],
    };

    // Save same state twice
    act(() => {
      result.current.saveState(state);
      result.current.saveState(state);
    });

    // Should only have one undo step
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
  });
});
