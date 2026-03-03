import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  TextNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
} from 'lexical';

const AUTO_PAIR_CHARACTERS: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
};

export function AutoPairPlugin() {
  const [editor] = useLexicalComposerContext();
  const isWrappingRef = useRef(false);
  const lastTypedAutoPairRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Handle selection wrapping via KEY_DOWN_COMMAND
    const removeCommandListener = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const { key } = event;
        const closingCharacter = AUTO_PAIR_CHARACTERS[key];

        if (closingCharacter) {
          let handled = false;
          editor.read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && !selection.isCollapsed()) {
              handled = true;
            }
          });

          if (handled) {
            event.preventDefault();
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                const selectedText = selection.getTextContent();

                // We need to flag this to avoid transform loop issues if applicable
                isWrappingRef.current = true;
                selection.insertText(key + selectedText + closingCharacter);
                // Keep the selection around the inner text if desired, or let it collapse at end
                isWrappingRef.current = false;
              }
            });
            return true;
          }

          // Mark that this key was just natively pressed, to be processed by the node transform safely
          lastTypedAutoPairRef.current = key;
          // Clear it after a short delay just in case the transform doesn't run
          setTimeout(() => {
            lastTypedAutoPairRef.current = null;
          }, 50);
        } else if (key.length === 1) {
          lastTypedAutoPairRef.current = null;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // 2. Handle simple auto-pairing via Node Transform
    const removeTransformListener = editor.registerNodeTransform(
      TextNode,
      (node: TextNode) => {
        if (isWrappingRef.current) return;

        const text = node.getTextContent();
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return;
        }

        const anchor = selection.anchor;

        // We only care if the cursor is currently in this exact text node
        if (anchor.key !== node.getKey()) {
          return;
        }

        const cursorOffset = anchor.offset;
        if (cursorOffset === 0) return;

        const lastChar = text[cursorOffset - 1];
        const closingChar = AUTO_PAIR_CHARACTERS[lastChar];

        if (closingChar && lastChar === lastTypedAutoPairRef.current) {
          // Insert the closing character into the node text at the cursor position
          const newText =
            text.slice(0, cursorOffset) +
            closingChar +
            text.slice(cursorOffset);
          const newNode = $createTextNode(newText);
          node.replace(newNode);

          // Restore selection, keeping cursor where it was (before the closing char)
          newNode.select(cursorOffset, cursorOffset);

          // Clear the state so we don't accidentally apply this multiple times
          lastTypedAutoPairRef.current = null;
        }
      },
    );

    return () => {
      removeCommandListener();
      removeTransformListener();
    };
  }, [editor]);

  return null;
}
