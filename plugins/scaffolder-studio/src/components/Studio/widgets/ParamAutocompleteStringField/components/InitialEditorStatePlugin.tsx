import { useLayoutEffect, useMemo, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

import { createToken } from '../createToken';
import { getColorForType } from '../../../utils/colorUtils';
import {
  findAllTokens,
  parseTokenContent,
  createParameterTypeMap,
  createOutputTypeMap,
} from '../../../utils/tokenParser';

export const InitialEditorStatePlugin = ({
  initialEditorState,
  parameters = [],
  outputs = [],
}: {
  initialEditorState: string;
  parameters?: Array<{ name: string; type: string }>;
  outputs?: Array<{ id: string; outputs: any }>;
}) => {
  const [editor] = useLexicalComposerContext();

  const parameterTypeMap = useMemo(
    () => createParameterTypeMap(parameters),
    [parameters]
  );

  const outputTypeMap = useMemo(
    () => createOutputTypeMap(outputs),
    [outputs]
  );

  // Track whether we've initialized - this ref is reset when component remounts
  const hasInitialized = useRef(false);
  // Keep track of the initial value we received on mount
  const initialValueOnMount = useRef(initialEditorState);

  // Use useLayoutEffect to initialize synchronously before paint/OnChangePlugin
  useLayoutEffect(() => {
    if (!editor || hasInitialized.current) {
      return;
    }

    // Only initialize if there's actually content to initialize
    const valueToInitialize = initialValueOnMount.current;
    if (valueToInitialize === undefined || valueToInitialize === '') {
      hasInitialized.current = true;
      return;
    }

    hasInitialized.current = true;

    editor.update(() => {
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
            const baseName = `${parsed.stepId}.${parsed.outputName}`;
            const outputType = outputTypeMap.get(baseName);
            color = getColorForType(outputType);
          } else if (parsed.type === 'parameter' && parsed.paramName) {
            const paramType = parameterTypeMap.get(parsed.paramName);
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
    }, { discrete: true });
  }, [editor, parameterTypeMap, outputTypeMap]);

  return null;
};

