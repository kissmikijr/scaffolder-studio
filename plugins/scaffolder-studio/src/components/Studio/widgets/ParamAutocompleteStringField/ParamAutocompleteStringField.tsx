import { useState, useMemo, useRef, useEffect } from 'react';
import { FieldProps } from '@rjsf/utils';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { ShowPopperPlugin } from './components/ShowPopperPlugin';
import { AutoPairPlugin } from './components/AutoPairPlugin';
import { styled, useTheme } from '@mui/material/styles';
import { $getRoot } from 'lexical';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { InitialEditorStatePlugin } from './components/InitialEditorStatePlugin';
import { ExpressionTokenNode } from './ExpressionTokenNode';
import { useQuery } from '@tanstack/react-query';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import debounce from 'lodash.debounce';

const NO_PENDING_VALUE = Symbol('no-pending-value');

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
  onError: () => {},
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

  const parsed = Object.entries(data.filters).map(
    ([name, filterData]: [string, any]) => {
      return {
        name,
        description: filterData.description || '',
        syntax: name, // For now, use simple syntax
        requiresParams: false, // We'll handle complex args later
        category: 'backstage' as const,
      };
    },
  );

  return parsed;
};

export const ParamAutocompleteStringField = ({
  onChange,
  formContext,
  formData,
  name,
  disabled,
  readonly,
  schema,
}: FieldProps) => {
  const allParams = formContext?.parameters || [];
  const allOutputs = formContext?.outputs || [];
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const theme = useTheme();

  const { data: customFilters = [] } = useQuery<NunjucksFilter[]>({
    queryKey: ['templating-extensions'],
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const onChangeRef = useRef(onChange);
  const latestFormDataRef = useRef(formData);
  const pendingExternalValueRef = useRef<unknown>(NO_PENDING_VALUE);
  const [editorValue, setEditorValue] = useState(() =>
    formData !== undefined && formData !== null ? String(formData) : '',
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    latestFormDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    const externalEditorValue =
      formData !== undefined && formData !== null ? String(formData) : '';

    if (pendingExternalValueRef.current !== NO_PENDING_VALUE) {
      if (Object.is(formData, pendingExternalValueRef.current)) {
        pendingExternalValueRef.current = NO_PENDING_VALUE;
      } else {
        return;
      }
    }

    setEditorValue(currentValue =>
      currentValue === externalEditorValue ? currentValue : externalEditorValue,
    );
  }, [formData]);

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

      let finalValue: any = text;

      if (schema?.type === 'number' || schema?.type === 'integer') {
        if (text.trim() === '') {
          finalValue = undefined;
        } else if (!text.includes('${{') && !isNaN(Number(text))) {
          finalValue = Number(text);
        }
      }

      setEditorValue(currentValue =>
        currentValue === text ? currentValue : text,
      );

      if (!Object.is(finalValue, latestFormDataRef.current)) {
        pendingExternalValueRef.current = finalValue;
        debouncedOnChange(finalValue);
      }
    });
  };

  const isReadOnly = disabled || readonly;
  const fieldTestId = `step-form-field-${String(name)}`;

  // Memoize initialConfig to prevent LexicalComposer from remounting on every render
  // This is critical to prevent cursor reset when parent state updates
  const initialConfig = useMemo(
    () => ({
      ...editorConfig,
      editable: !isReadOnly,
      onError: () => {
        // Silent error
      },
    }),
    [isReadOnly],
  );

  return (
    <StyledLexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={
          <ContentEditable
            aria-label={String(name)}
            data-testid={fieldTestId}
            onBlur={() => debouncedOnChange.flush()}
            style={{
              position: 'relative',
              minHeight: '32px',
              padding: '8px',
              border: '1px solid',
              borderColor: isReadOnly
                ? theme.palette.action.disabled
                : theme.palette.action.active,
              borderRadius: '4px',
              backgroundColor: isReadOnly
                ? theme.palette.action.hover
                : 'transparent',
              color: isReadOnly
                ? theme.palette.text.disabled
                : theme.palette.text.primary,
              cursor: isReadOnly ? 'not-allowed' : 'text',
              opacity: isReadOnly ? 0.7 : 1,
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
      <AutoPairPlugin />
      <OnChangePlugin onChange={handleEditorChange} />
      <InitialEditorStatePlugin
        initialEditorState={editorValue}
        parameters={allParams}
        outputs={allOutputs}
      />
      {!isReadOnly && (
        <ShowPopperPlugin
          parameters={allParams}
          outputs={allOutputs}
          showAutocomplete={showAutocomplete}
          setShowAutocomplete={setShowAutocomplete}
          customFilters={customFilters}
        />
      )}
    </StyledLexicalComposer>
  );
};
