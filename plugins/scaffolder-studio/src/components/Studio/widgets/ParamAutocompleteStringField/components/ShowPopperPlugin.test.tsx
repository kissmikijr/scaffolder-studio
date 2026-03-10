import { useEffect, ReactNode } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $createParagraphNode,
  LexicalEditor,
  $getSelection,
} from 'lexical';
import { ShowPopperPlugin } from './ShowPopperPlugin';
import { ExpressionTokenNode } from '../ExpressionTokenNode';

// Mock child components to capture their props — do NOT mock createToken
jest.mock('./AutocompletePopper', () => ({
  AutocompletePopper: jest.fn(() => <div data-testid="autocomplete-popper" />),
}));

jest.mock('./FilterParamDialog', () => ({
  FilterParamDialog: jest.fn(() => <div data-testid="filter-param-dialog" />),
}));

const initialConfig = {
  namespace: 'TestEditor',
  nodes: [ExpressionTokenNode],
  onError: (error: Error) => {
    throw error;
  },
};

/**
 * Helper plugin that initializes the editor with an empty paragraph + selection,
 * and optionally exposes the editor instance to tests.
 */
function TestSetupPlugin({
  onEditorReady,
}: {
  onEditorReady?: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onEditorReady?.(editor);
    editor.update(() => {
      const root = $getRoot();
      if (root.isEmpty()) {
        root.append($createParagraphNode());
      }
      root.selectEnd();
    });
  }, [editor, onEditorReady]);
  return null;
}

function Wrapper({
  children,
  onEditorReady,
}: {
  children: ReactNode;
  onEditorReady?: (editor: LexicalEditor) => void;
}) {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <TestSetupPlugin onEditorReady={onEditorReady} />
      {children}
    </LexicalComposer>
  );
}

/** Wait until the editor has a non-null selection (paragraph is focused). */
async function waitForEditorReady(editorRef: {
  current: LexicalEditor | null;
}) {
  await waitFor(() => {
    const editor = editorRef.current;
    expect(editor).not.toBeNull();
    let hasSelection = false;
    editor!.getEditorState().read(() => {
      hasSelection = $getSelection() !== null;
    });
    expect(hasSelection).toBe(true);
  });
}

/** Read the text content of the first ExpressionTokenNode in the editor. */
function readTokenFromEditor(
  editor: LexicalEditor,
): { text: string; fullExpression: string } | null {
  let result: { text: string; fullExpression: string } | null = null;
  editor.getEditorState().read(() => {
    const root = $getRoot();
    const allNodes = root.getAllTextNodes();
    for (const node of allNodes) {
      if (node instanceof ExpressionTokenNode) {
        result = {
          text: node.getTextContent(),
          fullExpression: node.getFullExpression(),
        };
        break;
      }
    }
  });
  return result;
}

describe('ShowPopperPlugin', () => {
  const defaultProps = {
    showAutocomplete: false,
    setShowAutocomplete: jest.fn(),
    parameters: [],
    outputs: [],
    customFilters: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────────────

  it('renders AutocompletePopper and FilterParamDialog', () => {
    render(
      <Wrapper>
        <ShowPopperPlugin {...defaultProps} />
      </Wrapper>,
    );
    expect(screen.getByTestId('autocomplete-popper')).toBeInTheDocument();
    expect(screen.getByTestId('filter-param-dialog')).toBeInTheDocument();
  });

  // ─── Parameter Selection ────────────────────────────────────────────

  it('inserts a token when a parameter is selected', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          parameters={[{ name: 'myParam', type: 'string' }]}
          showAutocomplete
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    const popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('myParam');
      expect(token!.fullExpression).toBe('parameters.myParam');
    });
  });

  // ─── Output Selection ───────────────────────────────────────────────

  it('inserts a token when an output is selected', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          outputs={[{ id: 'step1', outputs: { out1: { type: 'string' } } }]}
          showAutocomplete
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    const popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onOutputSelect({ stepId: 'step1', outputName: 'out1' });
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('step1.out1');
      expect(token!.fullExpression).toBe("steps['step1'].output['out1']");
    });
  });

  // ─── Simple Filter Selection (chaining) ─────────────────────────────

  it('replaces the token with a filtered version when a simple filter is applied', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin {...defaultProps} showAutocomplete />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    // Step 1: select a parameter first
    let popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    // Step 2: apply a simple filter
    popperProps = AutocompletePopperMock.mock.lastCall[0];
    const simpleFilter = {
      name: 'upper',
      syntax: 'upper',
      category: 'nunjucks',
      requiresParams: false,
    };
    await act(async () => {
      popperProps.onFilterSelect(simpleFilter);
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('myParam | upper');
      expect(token!.fullExpression).toBe('parameters.myParam | upper');
    });
  });

  it('still applies a filter even if selected token state is reset', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin {...defaultProps} showAutocomplete />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    let popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onBack();
    });

    popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onFilterSelect({
        name: 'upper',
        syntax: 'upper',
        category: 'nunjucks',
        requiresParams: false,
      });
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('myParam | upper');
      expect(token!.fullExpression).toBe('parameters.myParam | upper');
    });
  });

  // ─── Filter with params opens dialog ────────────────────────────────

  it('opens the param dialog when a filter requiring params is selected', async () => {
    const FilterParamDialogMock =
      require('./FilterParamDialog').FilterParamDialog;
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin {...defaultProps} showAutocomplete />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    // First select a param
    let popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    // Select a filter that requires params
    popperProps = AutocompletePopperMock.mock.lastCall[0];
    const complexFilter = {
      name: 'replace',
      syntax: 'replace("{old}", "{new}")',
      category: 'nunjucks',
      requiresParams: true,
      params: [
        { name: 'old', defaultValue: '' },
        { name: 'new', defaultValue: '' },
      ],
    };
    await act(async () => {
      popperProps.onFilterSelect(complexFilter);
    });

    const dialogProps = FilterParamDialogMock.mock.lastCall[0];
    expect(dialogProps.open).toBe(true);
    expect(dialogProps.filter).toBe(complexFilter);
  });

  // ─── Parameterized Filter Submission ─────────────────────────────────

  it('replaces the token when a parameterized filter is submitted via dialog', async () => {
    const FilterParamDialogMock =
      require('./FilterParamDialog').FilterParamDialog;
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin {...defaultProps} showAutocomplete />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    // 1. Select a param
    let popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    // 2. Select a parameterized filter
    popperProps = AutocompletePopperMock.mock.lastCall[0];
    const complexFilter = {
      name: 'replace',
      syntax: 'replace("{old}", "{new}")',
      category: 'nunjucks',
      requiresParams: true,
      params: [
        { name: 'old', defaultValue: '' },
        { name: 'new', defaultValue: '' },
      ],
    };
    await act(async () => {
      popperProps.onFilterSelect(complexFilter);
    });

    // 3. Fill in params
    let dialogProps = FilterParamDialogMock.mock.lastCall[0];
    await act(async () => {
      dialogProps.onParamChange('old', 'foo');
    });
    await act(async () => {
      dialogProps.onParamChange('new', 'bar');
    });

    // 4. Submit the dialog
    dialogProps = FilterParamDialogMock.mock.lastCall[0];
    await act(async () => {
      dialogProps.onSubmit();
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('myParam | replace("foo", "bar")');
      expect(token!.fullExpression).toBe(
        'parameters.myParam | replace("foo", "bar")',
      );
    });
  });

  // ─── Autocomplete trigger on focus / blur / space────────────────────

  it('does not fire setShowAutocomplete(false) and resets state when space is pressed', async () => {
    const editorRef: { current: LexicalEditor | null } = { current: null };
    const setShowAutocomplete = jest.fn();

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          setShowAutocomplete={setShowAutocomplete}
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    await act(async () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      editorRef.current!.getRootElement()!.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(setShowAutocomplete).not.toHaveBeenCalledWith(false);
    });
  });

  it('fires setShowAutocomplete(true) when the editor is focused or clicked', async () => {
    const editorRef: { current: LexicalEditor | null } = { current: null };
    const setShowAutocomplete = jest.fn();

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          setShowAutocomplete={setShowAutocomplete}
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    await act(async () => {
      editorRef.current!.getRootElement()!.focus();
      editorRef.current!.getRootElement()!.click();
    });

    await waitFor(() => {
      expect(setShowAutocomplete).toHaveBeenCalledWith(true);
    });
  });

  it('navigates main options with arrow keys and selects with enter', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          parameters={[
            { name: 'firstParam', type: 'string' },
            { name: 'secondParam', type: 'string' },
          ]}
          showAutocomplete
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    const rootElement = editorRef.current!.getRootElement()!;

    await waitFor(() => {
      const popperProps = AutocompletePopperMock.mock.lastCall[0];
      expect(popperProps.activeOptionIndex).toBe(0);
    });

    await act(async () => {
      rootElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      rootElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    });

    await waitFor(() => {
      const popperProps = AutocompletePopperMock.mock.lastCall[0];
      expect(popperProps.activeOptionIndex).toBe(2);
    });

    await act(async () => {
      rootElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('secondParam');
      expect(token!.fullExpression).toBe('parameters.secondParam');
    });
  });

  it('navigates filter options with arrow keys and selects with enter', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          parameters={[{ name: 'myParam', type: 'string' }]}
          showAutocomplete
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);
    const rootElement = editorRef.current!.getRootElement()!;

    const popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    await waitFor(() => {
      const latestProps = AutocompletePopperMock.mock.lastCall[0];
      expect(latestProps.viewMode).toBe('filters');
      expect(latestProps.activeOptionIndex).toBe(0);
    });

    await act(async () => {
      rootElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    });

    await waitFor(() => {
      const latestProps = AutocompletePopperMock.mock.lastCall[0];
      expect(latestProps.activeOptionIndex).toBe(1);
    });

    await act(async () => {
      rootElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    await waitFor(() => {
      const token = readTokenFromEditor(editorRef.current!);
      expect(token).not.toBeNull();
      expect(token!.text).toBe('myParam | center');
      expect(token!.fullExpression).toBe('parameters.myParam | center');
    });
  });

  // ─── Full flow: click → select param → verify token ────────────────

  it('inserts token when clicking and selecting a param', async () => {
    const AutocompletePopperMock =
      require('./AutocompletePopper').AutocompletePopper;
    const editorRef: { current: LexicalEditor | null } = { current: null };
    const setShowAutocomplete = jest.fn();

    render(
      <Wrapper
        onEditorReady={e => {
          editorRef.current = e;
        }}
      >
        <ShowPopperPlugin
          {...defaultProps}
          parameters={[{ name: 'myParam', type: 'string' }]}
          setShowAutocomplete={setShowAutocomplete}
        />
      </Wrapper>,
    );

    await waitForEditorReady(editorRef);

    // Step 1: Simulate focus/click
    await act(async () => {
      editorRef.current!.getRootElement()!.focus();
      editorRef.current!.getRootElement()!.click();
    });

    // Step 2: Wait for trigger
    await waitFor(() => {
      expect(setShowAutocomplete).toHaveBeenCalledWith(true);
    });

    // Step 3: Select a parameter from the autocomplete popper
    const popperProps = AutocompletePopperMock.mock.lastCall[0];
    await act(async () => {
      popperProps.onParamSelect('myParam');
    });

    // Step 4: Verify the editor content is the token node
    await waitFor(() => {
      const editor = editorRef.current!;
      let hasToken = false;
      let tokenText = '';
      let tokenFullExpression = '';

      editor.getEditorState().read(() => {
        const allNodes = $getRoot().getAllTextNodes();
        for (const node of allNodes) {
          if (node instanceof ExpressionTokenNode) {
            hasToken = true;
            tokenText = node.getTextContent();
            tokenFullExpression = node.getFullExpression();
          }
        }
      });

      // The token should exist with the correct text
      expect(hasToken).toBe(true);
      expect(tokenText).toBe('myParam');
      expect(tokenFullExpression).toBe('parameters.myParam');
    });
  });
});
