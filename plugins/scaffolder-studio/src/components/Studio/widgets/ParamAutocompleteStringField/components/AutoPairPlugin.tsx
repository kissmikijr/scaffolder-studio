import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
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

  useEffect(() => {
    // 1. Handle selection wrapping via KEY_DOWN_COMMAND
    const removeCommandListener = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const { key } = event;
        const closingCharacter = AUTO_PAIR_CHARACTERS[key];

        if (closingCharacter) {
          event.preventDefault();

          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              if (selection.isCollapsed()) {
                selection.insertText(key + closingCharacter);
                const anchor = selection.anchor;
                const focus = selection.focus;
                const newOffset = anchor.offset - 1;
                anchor.set(anchor.key, newOffset, anchor.type);
                focus.set(focus.key, newOffset, focus.type);
              } else {
                // For non-collapsed, wrap the selected text
                const selectedText = selection.getTextContent();
                isWrappingRef.current = true;
                selection.insertText(key + selectedText + closingCharacter);
                isWrappingRef.current = false;
              }
            }
          });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      removeCommandListener();
    };
  }, [editor]);

  return null;
}
