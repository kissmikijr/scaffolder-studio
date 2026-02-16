import { useEffect, ReactNode } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode, LexicalEditor, $getSelection, ParagraphNode } from 'lexical';
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
function TestSetupPlugin({ onEditorReady }: { onEditorReady?: (editor: LexicalEditor) => void }) {
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

function Wrapper({ children, onEditorReady }: { children: ReactNode; onEditorReady?: (editor: LexicalEditor) => void }) {
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
async function waitForEditorReady(editorRef: { current: LexicalEditor | null }) {
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
function readTokenFromEditor(editor: LexicalEditor): { text: string; fullExpression: string } | null {
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
            </Wrapper>
        );
        expect(screen.getByTestId('autocomplete-popper')).toBeInTheDocument();
        expect(screen.getByTestId('filter-param-dialog')).toBeInTheDocument();
    });

    // ─── Parameter Selection ────────────────────────────────────────────

    it('inserts a token when a parameter is selected', async () => {
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin
                    {...defaultProps}
                    parameters={[{ name: 'myParam', type: 'string' }]}
                    showAutocomplete
                />
            </Wrapper>
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
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin
                    {...defaultProps}
                    outputs={[{ id: 'step1', outputs: { out1: { type: 'string' } } }]}
                    showAutocomplete
                />
            </Wrapper>
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
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin {...defaultProps} showAutocomplete />
            </Wrapper>
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

    // ─── Filter with params opens dialog ────────────────────────────────

    it('opens the param dialog when a filter requiring params is selected', async () => {
        const FilterParamDialogMock = require('./FilterParamDialog').FilterParamDialog;
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin {...defaultProps} showAutocomplete />
            </Wrapper>
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
        const FilterParamDialogMock = require('./FilterParamDialog').FilterParamDialog;
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin {...defaultProps} showAutocomplete />
            </Wrapper>
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
            expect(token!.fullExpression).toBe('parameters.myParam | replace("foo", "bar")');
        });
    });

    // ─── Autocomplete trigger on ${{ ─────────────────────────────────────

    it('fires setShowAutocomplete(true) when ${{ is typed', async () => {
        const editorRef: { current: LexicalEditor | null } = { current: null };
        const setShowAutocomplete = jest.fn();

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin {...defaultProps} setShowAutocomplete={setShowAutocomplete} />
            </Wrapper>
        );

        await waitForEditorReady(editorRef);

        await act(async () => {
            editorRef.current!.update(() => {
                const root = $getRoot();
                const p = root.getFirstChild() as ParagraphNode;
                if (p) {
                    p.clear();
                    p.append($createTextNode('${{'));
                    p.selectEnd();
                }
            });
        });

        await waitFor(() => {
            expect(setShowAutocomplete).toHaveBeenCalledWith(true);
        });
    });

    // ─── Full flow: type ${{ → select param → verify ${{ token  }} ────

    it('inserts token wrapped in ${{  }} when typing ${{ and selecting a param', async () => {
        const AutocompletePopperMock = require('./AutocompletePopper').AutocompletePopper;
        const editorRef: { current: LexicalEditor | null } = { current: null };
        const setShowAutocomplete = jest.fn();

        render(
            <Wrapper onEditorReady={e => { editorRef.current = e; }}>
                <ShowPopperPlugin
                    {...defaultProps}
                    parameters={[{ name: 'myParam', type: 'string' }]}
                    setShowAutocomplete={setShowAutocomplete}
                />
            </Wrapper>
        );

        await waitForEditorReady(editorRef);

        // Step 1: Simulate typing ${{
        await act(async () => {
            editorRef.current!.update(() => {
                const root = $getRoot();
                const p = root.getFirstChild() as ParagraphNode;
                if (p) {
                    p.clear();
                    p.append($createTextNode('${{'));
                    p.selectEnd();
                }
            });
        });

        // Step 2: Wait for the plugin to auto-insert "  }}" and trigger autocomplete
        await waitFor(() => {
            expect(setShowAutocomplete).toHaveBeenCalledWith(true);
        });

        // Wait for the "  }}" insertion to complete
        await waitFor(() => {
            let text = '';
            editorRef.current!.getEditorState().read(() => {
                text = $getRoot().getTextContent();
            });
            expect(text).toContain('}}');
        });

        // Step 3: Select a parameter from the autocomplete popper
        const popperProps = AutocompletePopperMock.mock.lastCall[0];
        await act(async () => {
            popperProps.onParamSelect('myParam');
        });

        // Step 4: Verify the editor content is ${{ <token>  }}
        await waitFor(() => {
            const editor = editorRef.current!;
            let fullText = '';
            let hasToken = false;
            let tokenText = '';

            editor.getEditorState().read(() => {
                fullText = $getRoot().getTextContent();
                const allNodes = $getRoot().getAllTextNodes();
                for (const node of allNodes) {
                    if (node instanceof ExpressionTokenNode) {
                        hasToken = true;
                        tokenText = node.getTextContent();
                    }
                }
            });

            // The token should exist with the correct text
            expect(hasToken).toBe(true);
            expect(tokenText).toBe('myParam');

            // The full text should contain the ${{ wrapper, token text, and closing }}
            expect(fullText).toContain('${{');
            expect(fullText).toContain('myParam');
            expect(fullText).toContain('}}');
        });
    });
});
