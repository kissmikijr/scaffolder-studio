import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';

// State saved in undo/redo history (excludes viewport which shouldn't be undoable)
export interface EditorState {
  nodes: Node<AllNodeData>[];
  edges: Edge[];
}

interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveState: (state: EditorState) => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;

export const useUndoRedo = (
  initialState: EditorState,
  onStateChange: (state: EditorState) => void,
): UseUndoRedoReturn => {
  const history = useRef<EditorState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const isUndoRedoOperation = useRef(false);

  // Keep ref in sync with state
  currentIndexRef.current = currentIndex;

  const saveState = useCallback(
    (state: EditorState) => {
      // Don't save state if we're currently performing undo/redo
      if (isUndoRedoOperation.current) {
        return;
      }

      // Use ref value for current calculations to avoid stale closure
      const currentIdx = currentIndexRef.current;

      // Check if state actually changed to avoid unnecessary saves
      const currentState = history.current[currentIdx];
      if (
        currentState &&
        JSON.stringify(currentState.nodes) === JSON.stringify(state.nodes) &&
        JSON.stringify(currentState.edges) === JSON.stringify(state.edges)
      ) {
        return;
      }

      // Remove any future history if we're not at the end
      const newHistory = history.current.slice(0, currentIdx + 1);

      // Add new state (deep clone to prevent mutations)
      newHistory.push(JSON.parse(JSON.stringify(state)));

      // Update history and manage index
      history.current = newHistory;

      // Limit history size and adjust index if needed
      if (newHistory.length > MAX_HISTORY_SIZE) {
        history.current.shift();
        // Don't increment index since we removed the first item
      } else {
        const newIndex = currentIdx + 1;
        setCurrentIndex(newIndex);
        currentIndexRef.current = newIndex; // Update ref immediately
      }
    },
    [], // No dependencies needed since we use refs
  );

  const undo = useCallback(() => {
    // Add bounds checking
    if (currentIndex > 0 && currentIndex < history.current.length) {
      isUndoRedoOperation.current = true;
      const newIndex = currentIndex - 1;
      const previousState = history.current[newIndex];

      // Safety check for valid state
      if (
        previousState &&
        typeof previousState === 'object' &&
        'nodes' in previousState &&
        'edges' in previousState
      ) {
        setCurrentIndex(newIndex);
        onStateChange(previousState);
      } else {
        isUndoRedoOperation.current = false;
        return;
      }

      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 0);
    }
  }, [currentIndex, onStateChange]);

  const redo = useCallback(() => {
    if (currentIndex < history.current.length - 1) {
      isUndoRedoOperation.current = true;
      const newIndex = currentIndex + 1;
      const nextState = history.current[newIndex];

      // Safety check for valid state
      if (
        nextState &&
        typeof nextState === 'object' &&
        'nodes' in nextState &&
        'edges' in nextState
      ) {
        setCurrentIndex(newIndex);
        onStateChange(nextState);
      } else {
        isUndoRedoOperation.current = false;
        return;
      }

      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 0);
    }
  }, [currentIndex, onStateChange]);

  const clearHistory = useCallback(() => {
    history.current = [initialState];
    setCurrentIndex(0);
    currentIndexRef.current = 0; // Update ref immediately
  }, [initialState]);

  return {
    canUndo: currentIndex > 0 && currentIndex < history.current.length,
    canRedo: currentIndex < history.current.length - 1,
    undo,
    redo,
    saveState,
    clearHistory,
  };
};
