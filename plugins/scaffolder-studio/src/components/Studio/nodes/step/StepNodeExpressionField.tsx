import { useState, useRef, useEffect, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { styled } from '@mui/material/styles';
import { $getRoot } from 'lexical';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useQuery } from '@tanstack/react-query';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import debounce from 'lodash.debounce';

// Use shared components from ParamAutocompleteStringField
import { ShowPopperPlugin } from '../../widgets/ParamAutocompleteStringField/components/ShowPopperPlugin';
import { InitialEditorStatePlugin } from '../../widgets/ParamAutocompleteStringField/components/InitialEditorStatePlugin';
import { ExpressionTokenNode } from '../../widgets/ParamAutocompleteStringField/ExpressionTokenNode';
import { AutoPairPlugin } from '../../widgets/ParamAutocompleteStringField/components/AutoPairPlugin';

const StyledLexicalComposer = styled(LexicalComposer)({
  position: 'relative',
  width: '100%',
});

const editorConfig = {
  namespace: 'StepNodeExpressionEditor',
  theme: {
    paragraph: 'MuiTypography-root MuiTypography-body1',
    token: 'inline-token',
  },
  onError: () => {},
  nodes: [ExpressionTokenNode],
  editorState: undefined,
};

const serializeToText = (root: any) => {
  // Helper to process a node and its children
  const processNode = (node: any): string => {
    if (node.getType() === 'expression-token-node') {
      return node.getFullExpression();
    }

    if (node.getType() === 'linebreak') {
      return '\n';
    }

    if (node.getChildren) {
      const children = node.getChildren();
      return children.map(processNode).join('');
    }

    return node.getTextContent();
  };

  const children = root.getChildren();
  // Join paragraphs with single newline to preserve markdown structure
  return children.map(processNode).join('\n');
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

  const parsed = Object.entries(data.filters).map(
    ([name, filterData]: [string, any]) => {
      return {
        name,
        description: filterData.description || '',
        syntax: name,
        requiresParams: false,
        category: 'backstage' as const,
      };
    },
  );

  return parsed;
};

interface StepNodeExpressionFieldProps {
  value: string;
  onChange: (value: string) => void;
  parameters: Array<{ name: string; type: string }>;
  outputs: Array<{ id: string; outputs: any }>;
  disabled?: boolean;
  disableWrapper?: boolean;
  minHeight?: string | number;
  showAutocompletePopper?: boolean;
}

export const StepNodeExpressionField = ({
  value,
  onChange,
  parameters,
  outputs,
  disabled = false,
  minHeight,
  showAutocompletePopper = true,
}: StepNodeExpressionFieldProps) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  const { data: customFilters = [] } = useQuery<NunjucksFilter[]>({
    queryKey: ['templating-extensions'],
    enabled: showAutocompletePopper && !disabled,
    queryFn: async () => {
      const baseUrl = await discoveryApi.getBaseUrl('scaffolder');
      const response = await fetchApi.fetch(
        `${baseUrl}/v2/templating-extensions`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch templating extensions');
      }
      const data = await response.json();
      return parseFiltersFromAPI(data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const debouncedOnChange = useMemo(
    () =>
      debounce((val: string) => {
        onChangeRef.current(val);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const initialConfig = useMemo(
    () => ({
      ...editorConfig,
      editable: !disabled,
      onError: (_error: Error) => {
        // Silent error
      },
    }),
    [disabled],
  );

  const handleEditorChange = (editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const text = serializeToText(root);
      if (text !== value) {
        debouncedOnChange(text);
      }
    });
  };

  const [focused, setFocused] = useState(false);
  const theme = useTheme();

  return (
    <Box
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      sx={{
        display: 'flex',
        alignItems: !minHeight ? 'center' : 'flex-start',
        fontFamily: theme.typography.fontFamily,
        fontSize: '0.875rem', // Match typical input size
        backgroundColor: disabled
          ? theme.palette.action.disabledBackground
          : 'transparent',
        borderRadius: `${theme.shape.borderRadius}px`,
        padding: '8.5px 14px', // Standard padding for outlined input
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: (() => {
          if (focused) return theme.palette.primary.main;
          if (theme.palette.mode === 'light') return 'rgba(0, 0, 0, 0.23)';
          return 'rgba(255, 255, 255, 0.23)';
        })(),
        '&:hover': {
          borderColor:
            !focused && !disabled ? theme.palette.text.primary : undefined,
        },
        outline: focused ? `1px solid ${theme.palette.primary.main}` : 'none',
        width: '100%',
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        cursor: 'text',
        color: theme.palette.text.primary,
        minHeight: minHeight,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          flexGrow: 1,
          position: 'relative',
          margin: '0 4px',
          height: '100%',
        }}
      >
        <StyledLexicalComposer initialConfig={initialConfig}>
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                style={{
                  position: 'relative',
                  outline: 'none',
                  minWidth: '20px',
                  display: 'inline-block',
                  width: '100%',
                  minHeight: minHeight,
                }}
              />
            }
            placeholder={null}
          />
          <HistoryPlugin />
          <AutoPairPlugin />
          <OnChangePlugin onChange={handleEditorChange} />
          <InitialEditorStatePlugin
            initialEditorState={value}
            parameters={parameters}
            outputs={outputs}
          />
          {!disabled && showAutocompletePopper && (
            <ShowPopperPlugin
              parameters={parameters}
              outputs={outputs}
              showAutocomplete={showAutocomplete}
              setShowAutocomplete={setShowAutocomplete}
              customFilters={customFilters}
            />
          )}
        </StyledLexicalComposer>
      </div>
    </Box>
  );
};
