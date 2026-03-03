import { useEffect } from 'react';
import {
  isKeyboardEventFromEditableTarget,
  isLetterShortcutKey,
  isPrimaryShortcutModifierPressed,
} from './keyboardShortcutUtils';

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
      if (event.defaultPrevented || event.isComposing || event.repeat) {
        return;
      }

      if (isKeyboardEventFromEditableTarget(event)) {
        return;
      }

      if (!isPrimaryShortcutModifierPressed(event)) {
        return;
      }

      if (
        isLetterShortcutKey(event, 's') &&
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

      if (
        isLetterShortcutKey(event, 'z') &&
        !event.shiftKey &&
        !event.altKey &&
        canUndo
      ) {
        event.preventDefault();
        onUndo();
      } else if (
        ((isLetterShortcutKey(event, 'z') && event.shiftKey && !event.altKey) ||
          (isLetterShortcutKey(event, 'y') &&
            !event.shiftKey &&
            !event.altKey)) &&
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
