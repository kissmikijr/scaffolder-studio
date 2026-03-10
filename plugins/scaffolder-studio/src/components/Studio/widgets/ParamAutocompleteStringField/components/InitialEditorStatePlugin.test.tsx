import { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
  LexicalEditor,
} from 'lexical';

import { ExpressionTokenNode } from '../ExpressionTokenNode';
import { InitialEditorStatePlugin } from './InitialEditorStatePlugin';

const initialConfig = {
  namespace: 'InitialEditorStatePluginTest',
  nodes: [ExpressionTokenNode],
  onError: (error: Error) => {
    throw error;
  },
};

const EditorRefPlugin = ({
  onReady,
}: {
  onReady: (editor: LexicalEditor) => void;
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
};

const readSerializedText = (editor: LexicalEditor) => {
  let value = '';

  editor.getEditorState().read(() => {
    const root = $getRoot();
    const textNodes = root.getAllTextNodes();

    value = textNodes
      .map(node => {
        if (node.getType() === 'expression-token-node') {
          return (node as any).getFullExpression?.() ?? '';
        }
        return node.getTextContent();
      })
      .join('');
  });

  return value;
};

const Wrapper = ({
  value,
  parameters = [],
  onEditorReady,
}: {
  value: string;
  parameters?: Array<{ name: string; type: string }>;
  onEditorReady: (editor: LexicalEditor) => void;
}) => {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <EditorRefPlugin
        onReady={editor => {
          onEditorReady(editor);
        }}
      />
      <InitialEditorStatePlugin
        initialEditorState={value}
        parameters={parameters}
      />
    </LexicalComposer>
  );
};

describe('InitialEditorStatePlugin', () => {
  it('syncs editor content when external initialEditorState changes', async () => {
    const initialValue = '${{ parameters.repoUrl }}';
    const updatedValue =
      "${{ steps['createPullRequest'].output['remoteUrl'] }}";
    const editorRef: { current: LexicalEditor | null } = { current: null };

    const { rerender } = render(
      <Wrapper
        value={initialValue}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(editorRef.current).not.toBeNull();
      expect(readSerializedText(editorRef.current!)).toBe(initialValue);
    });

    rerender(
      <Wrapper
        value={updatedValue}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(editorRef.current).not.toBeNull();
      expect(readSerializedText(editorRef.current!)).toBe(updatedValue);
    });
  });

  it('does not reset local edits when parameters are re-created with same values', async () => {
    const initialValue = 'parameters.repoUrl';
    const editorRef: { current: LexicalEditor | null } = { current: null };

    const { rerender } = render(
      <Wrapper
        value={initialValue}
        parameters={[{ name: 'repoUrl', type: 'string' }]}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(editorRef.current).not.toBeNull();
      expect(readSerializedText(editorRef.current!)).toBe(initialValue);
    });

    editorRef.current!.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild();
      if ($isElementNode(paragraph)) {
        paragraph.append($createTextNode(' | lower'));
      }
    });

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe(
        'parameters.repoUrl | lower',
      );
    });

    rerender(
      <Wrapper
        value={initialValue}
        parameters={[{ name: 'repoUrl', type: 'string' }]}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe(
        'parameters.repoUrl | lower',
      );
    });
  });

  it('does not override local edits from external value changes while focused', async () => {
    const initialValue = 'parameters.repoUrl';
    const editorRef: { current: LexicalEditor | null } = { current: null };

    const { rerender } = render(
      <Wrapper
        value={initialValue}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(editorRef.current).not.toBeNull();
      expect(readSerializedText(editorRef.current!)).toBe(initialValue);
    });

    const originalActiveElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'activeElement',
    );
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => editorRef.current!.getRootElement(),
    });

    act(() => {
      editorRef.current!.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if ($isElementNode(paragraph)) {
          paragraph.append($createTextNode(' | lower'));
        }
      });
    });

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe(
        'parameters.repoUrl | lower',
      );
    });

    rerender(
      <Wrapper
        value="parameters.repoUrl | abs"
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe(
        'parameters.repoUrl | lower',
      );
    });

    if (originalActiveElementDescriptor) {
      Object.defineProperty(
        document,
        'activeElement',
        originalActiveElementDescriptor,
      );
    } else {
      delete (document as any).activeElement;
    }
  });

  it('does not re-apply stale external value after local delete-all while focused', async () => {
    const initialValue = 'parameters.repoUrl';
    const editorRef: { current: LexicalEditor | null } = { current: null };

    const { rerender } = render(
      <Wrapper
        value={initialValue}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(editorRef.current).not.toBeNull();
      expect(readSerializedText(editorRef.current!)).toBe(initialValue);
    });

    const originalActiveElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'activeElement',
    );
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => editorRef.current!.getRootElement(),
    });

    act(() => {
      editorRef.current!.update(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      });
    });

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe('');
    });

    // Simulate parent rerender before debounced onChange has flushed
    rerender(
      <Wrapper
        value={initialValue}
        onEditorReady={editor => {
          editorRef.current = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(readSerializedText(editorRef.current!)).toBe('');
    });

    if (originalActiveElementDescriptor) {
      Object.defineProperty(
        document,
        'activeElement',
        originalActiveElementDescriptor,
      );
    } else {
      delete (document as any).activeElement;
    }
  });
});
