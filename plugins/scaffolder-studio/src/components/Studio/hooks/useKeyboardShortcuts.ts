import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave?: () => void;
  canSave?: boolean;
  isSaving?: boolean;
}

export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  canSave = false,
  isSaving = false,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed) return;

      if (
        event.key.toLowerCase() === 's' &&
        !event.shiftKey &&
        !event.altKey &&
        onSave &&
        canSave &&
        !isSaving
      ) {
        event.preventDefault();
        onSave();
        return;
      }

      // Prevent default browser behavior and handle our shortcuts
      if (event.key === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        onUndo();
      } else if (
        ((event.key === 'z' && event.shiftKey) || event.key === 'y') &&
        canRedo
      ) {
        event.preventDefault();
        onRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo, onSave, canSave, isSaving]);
};
