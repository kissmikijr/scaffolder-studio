import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';
import {
  AllNodeData,
  isTemplateNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { getNodeBase } from '../nodeBase';
import { onChange } from '../handlers';
import {
  isKeyboardEventFromEditableTarget,
  isLetterShortcutKey,
  isPrimaryShortcutModifierPressed,
} from './keyboardShortcutUtils';

interface UseCopyPasteProps {
  selectedNode?: Node<AllNodeData>;
  setNodes: React.Dispatch<React.SetStateAction<Node<AllNodeData>[]>>;
}

interface UseCopyPasteReturn {
  handleCopy: () => void;
  handlePaste: () => void;
  pastedNodeId: string | null;
  acknowledgePaste: () => void;
}

export const useCopyPaste = ({
  selectedNode,
  setNodes,
}: UseCopyPasteProps): UseCopyPasteReturn => {
  const copiedNodeRef = useRef<Node<AllNodeData> | null>(null);
  const [pastedNodeId, setPastedNodeId] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    if (selectedNode && !isTemplateNode(selectedNode)) {
      copiedNodeRef.current = selectedNode;
    }
  }, [selectedNode]);

  const handlePaste = useCallback(() => {
    if (!copiedNodeRef.current) return;

    const copiedNode = copiedNodeRef.current;
    const baseNode = getNodeBase();

    // Predefined spawn location: offset by 50px right and 50px down from original
    const newPosition = {
      x: copiedNode.position.x + 50,
      y: copiedNode.position.y + 50,
    };

    // Deep clone the node data to avoid reference sharing
    // Remove onChange to prevent function serialization issues
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onChange: _, ...dataWithoutOnChange } = copiedNode.data as any;
    const clonedData = JSON.parse(JSON.stringify(dataWithoutOnChange));

    // Create completely new node - only copy type, position, and data
    // Don't spread copiedNode to avoid copying React Flow internal state
    const newNode: Node<AllNodeData> = {
      id: baseNode.id,
      type: copiedNode.type as any,
      position: newPosition,
      selected: true,
      data: {
        ...clonedData,
        onChange: onChange(setNodes),
      },
    };

    setPastedNodeId(newNode.id);
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), newNode]);
  }, [setNodes]);

  const acknowledgePaste = useCallback(() => {
    setPastedNodeId(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) {
        return;
      }

      if (!isPrimaryShortcutModifierPressed(e)) {
        return;
      }

      if (e.shiftKey || e.altKey) {
        return;
      }

      const isInputFocused = isKeyboardEventFromEditableTarget(e);

      // Platform agnostic copy (Ctrl+C on Windows/Linux, Cmd+C on Mac)
      if (isLetterShortcutKey(e, 'c')) {
        // Only copy node if not focused on an input
        if (!isInputFocused) {
          handleCopy();
          if (copiedNodeRef.current) {
            e.preventDefault();
          }
        }
      }

      // Platform agnostic paste (Ctrl+V on Windows/Linux, Cmd+V on Mac)
      if (isLetterShortcutKey(e, 'v')) {
        // Only paste node if not focused on an input and we have a copied node
        if (!isInputFocused && copiedNodeRef.current) {
          handlePaste();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCopy, handlePaste]);

  return {
    handleCopy,
    handlePaste,
    pastedNodeId,
    acknowledgePaste,
  };
};
