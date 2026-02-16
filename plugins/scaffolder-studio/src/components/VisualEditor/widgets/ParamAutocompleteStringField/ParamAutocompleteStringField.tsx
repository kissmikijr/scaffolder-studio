import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FieldProps } from '@rjsf/utils';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { ShowPopperPlugin } from './components/ShowPopperPlugin';
import { styled } from '@mui/material/styles';
import { $getRoot } from 'lexical';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { InitialEditorStatePlugin } from './components/InitialEditorStatePlugin';
import { ExpressionTokenNode } from './ExpressionTokenNode';
import { useQuery } from '@tanstack/react-query';
import { discoveryApiRef, fetchApiRef, useApi } from '@backstage/core-plugin-api';
import debounce from 'lodash.debounce';

const StyledLexicalComposer = styled(LexicalComposer)({
  position: 'relative',
  width: '100%',
});

const editorConfig = {
  namespace: 'ParamEditor',
  theme: {
    paragraph: 'MuiTypography-root MuiTypography-body1',
    token: 'inline-token',
  },
  onError: console.error,
  nodes: [ExpressionTokenNode],
  editorState: undefined,
};

const serializeToText = (root: any) => {
  let text = '';
  const textNodes = root.getAllTextNodes();
  let content = '';
  for (const node of textNodes) {
    if (node.getType() === 'expression-token-node') {
      content = node?.getFullExpression();
    } else {
      content = node.getTextContent();
    }
    text += content;
  }

  return text;
};

interface NunjucksFilter {
  name: string;
  description: string;
  syntax: string;
  requiresParams: boolean;
  params?: Array<{ name: string; label: string; defaultValue: string }>;
  category: 'nunjucks' | 'backstage';
}

const parseFiltersFromAPI = (data: any): NunjucksFilter[] => {
  if (!data?.filters) {
    return [];
  }

  const parsed = Object.entries(data.filters).map(([name, filterData]: [string, any]) => {
    return {
      name,
      description: filterData.description || '',
      syntax: name, // For now, use simple syntax
      requiresParams: false, // We'll handle complex args later
      category: 'backstage' as const,
    };
  });

  return parsed;
};

export const ParamAutocompleteStringField = ({
  onChange,
  formContext,
  formData,
  name,
}: FieldProps) => {
  const allParams = formContext?.parameters || [];
  const allOutputs = formContext?.outputs || [];
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  const { data: customFilters = [] } = useQuery<NunjucksFilter[]>({
    queryKey: ['templating-extensions'],
    queryFn: async () => {
      const baseUrl = await discoveryApi.getBaseUrl('scaffolder');
      const response = await fetchApi.fetch(baseUrl + '/v2/templating-extensions');
      if (!response.ok) {
        throw new Error('Failed to fetch templating extensions');
      }
      const data = await response.json();
      return parseFiltersFromAPI(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const debouncedOnChange = useMemo(
    () =>
      debounce((value: string) => {
        onChangeRef.current(value);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const handleEditorChange = (editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const text = serializeToText(root);
      if (text !== formData) {
        debouncedOnChange(text);
      }
    });
  };

  // Memoize initialConfig to prevent LexicalComposer from remounting on every render
  // This is critical to prevent cursor reset when parent state updates
  const initialConfig = useMemo(
    () => ({
      ...editorConfig,
      onError: (error: Error) => {
        console.error(error);
      },
    }),
    [],
  );

  return (
    <StyledLexicalComposer
      initialConfig={initialConfig}
    >
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={
          <ContentEditable
            style={{
              position: 'relative',
              minHeight: '32px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'transparent',
            }}
          />
        }
        placeholder={
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              pointerEvents: 'none',
              opacity: 0.5,
            }}
          >
            {name}
          </div>
        }
      />
      <HistoryPlugin />
      <OnChangePlugin onChange={handleEditorChange} />
      <InitialEditorStatePlugin
        initialEditorState={formData}
        parameters={allParams}
        outputs={allOutputs}
      />
      <ShowPopperPlugin
        parameters={allParams}
        outputs={allOutputs}
        showAutocomplete={showAutocomplete}
        setShowAutocomplete={setShowAutocomplete}
        customFilters={customFilters}
      />
    </StyledLexicalComposer>
  );
};
