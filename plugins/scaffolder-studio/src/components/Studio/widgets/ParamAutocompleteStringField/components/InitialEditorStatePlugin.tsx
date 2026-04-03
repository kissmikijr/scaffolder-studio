import { useLayoutEffect, useRef, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

import { createToken } from '../createToken';
import { getColorForType } from '../../../utils/colorUtils';
import {
  findAllTokens,
  parseTokenContent,
  createParameterTypeMap,
} from '../../../utils/tokenParser';

export const InitialEditorStatePlugin = ({
  initialEditorState,
  parameters = [],
  outputs: _outputs = [],
}: {
  initialEditorState: string;
  parameters?: Array<{ name: string; type: string }>;
  outputs?: Array<{ id: string; outputs: any }>;
}) => {
  const [editor] = useLexicalComposerContext();
  const parameterTypeMapRef = useRef(createParameterTypeMap(parameters));
  const previousExternalValueRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    parameterTypeMapRef.current = createParameterTypeMap(parameters);
  }, [parameters]);

  // Keep Lexical state in sync with external form value changes (e.g. relationship drag insertion).
  useLayoutEffect(() => {
    if (!editor) {
      return;
    }

    const valueToInitialize = initialEditorState ?? '';
    const externalValueUnchanged =
      previousExternalValueRef.current === valueToInitialize;
    previousExternalValueRef.current = valueToInitialize;
    let currentEditorValue = '';
    const rootElement = editor.getRootElement();
    const isEditorFocused =
      !!rootElement &&
      !!document.activeElement &&
      (rootElement === document.activeElement ||
        rootElement.contains(document.activeElement));
    const shouldRestoreCursorToEnd = isEditorFocused;

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();

      currentEditorValue = textNodes
        .map(node => {
          if (node.getType() === 'expression-token-node') {
            return (node as any).getFullExpression?.() ?? '';
          }
          return node.getTextContent();
        })
        .join('');
    });

    if (currentEditorValue === valueToInitialize) {
      return;
    }

    // Avoid re-applying unchanged external snapshots after local edits.
    // This prevents delete-all / fast-edit flicker where stale formData
    // immediately reappears before the debounced change has propagated.
    if (externalValueUnchanged) {
      return;
    }

    // While focused, don't clobber non-empty local edits with external snapshots.
    if (isEditorFocused && currentEditorValue.trim().length > 0) {
      return;
    }

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        root.append(paragraph);

        const tokens = findAllTokens(valueToInitialize);
        let lastIndex = 0;

        tokens.forEach(token => {
          // Add text before the token
          if (token.index > lastIndex) {
            const textNode = $createTextNode(
              valueToInitialize.slice(lastIndex, token.index),
            );
            paragraph.append(textNode);
          }

          const parsed = parseTokenContent(token.content);
          let display = token.content;
          let color = '#F1FA8C';

          if (parsed) {
            display = parsed.display;
            if (parsed.type === 'step' && parsed.stepId && parsed.outputName) {
              color = NodeTypeColors.step;
            } else if (parsed.type === 'parameter' && parsed.paramName) {
              const paramType = parameterTypeMapRef.current.get(
                parsed.paramName,
              );
              color = getColorForType(paramType);
            }
          }

          const tokenNode = createToken({
            display,
            fullExpression: token.fullMatch,
            color,
          });
          paragraph.append(tokenNode);

          lastIndex = token.index + token.length;
        });

        if (lastIndex < valueToInitialize.length) {
          const textNode = $createTextNode(valueToInitialize.slice(lastIndex));
          paragraph.append(textNode);
        }

        if (shouldRestoreCursorToEnd) {
          paragraph.selectEnd();
        }
      },
      { discrete: true },
    );
  }, [editor, initialEditorState]);

  return null;
};
