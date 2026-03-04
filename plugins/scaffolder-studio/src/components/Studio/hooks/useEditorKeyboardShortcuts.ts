import { useEffect } from 'react';
import {
  isDigitShortcutKey,
  isKeyboardEventFromEditableTarget,
  isLetterShortcutKey,
  isPrimaryShortcutModifierPressed,
} from './keyboardShortcutUtils';

interface UseEditorKeyboardShortcutsProps {
  onAddStep: () => void;
  onAddParameters: () => void;
  onAddProperty: () => void;
  onAddOutput: () => void;
  onToggleDependencyEdges: () => void;
  onToggleSideContent: () => void;
  onFitView: () => void;
}

export const useEditorKeyboardShortcuts = ({
  onAddStep,
  onAddParameters,
  onAddProperty,
  onAddOutput,
  onToggleDependencyEdges,
  onToggleSideContent,
  onFitView,
}: UseEditorKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) {
        return;
      }

      if (isKeyboardEventFromEditableTarget(event)) {
        return;
      }

      const hasPrimaryModifier = isPrimaryShortcutModifierPressed(event);

      if (
        hasPrimaryModifier &&
        !event.shiftKey &&
        !event.altKey &&
        isDigitShortcutKey(event, 4)
      ) {
        event.preventDefault();
        onToggleDependencyEdges();
        return;
      }

      if (
        hasPrimaryModifier &&
        !event.shiftKey &&
        !event.altKey &&
        isDigitShortcutKey(event, 0)
      ) {
        event.preventDefault();
        onFitView();
        return;
      }

      if (
        hasPrimaryModifier &&
        !event.shiftKey &&
        event.altKey &&
        isLetterShortcutKey(event, 'b')
      ) {
        event.preventDefault();
        onToggleSideContent();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      if (isDigitShortcutKey(event, 1)) {
        event.preventDefault();
        onAddStep();
      } else if (isDigitShortcutKey(event, 2)) {
        event.preventDefault();
        onAddParameters();
      } else if (isDigitShortcutKey(event, 3)) {
        event.preventDefault();
        onAddProperty();
      } else if (isDigitShortcutKey(event, 4)) {
        event.preventDefault();
        onAddOutput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onAddOutput,
    onAddParameters,
    onAddProperty,
    onAddStep,
    onToggleDependencyEdges,
    onToggleSideContent,
    onFitView,
  ]);
};
