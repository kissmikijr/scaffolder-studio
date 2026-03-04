import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $getRoot, LexicalEditor } from 'lexical';

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
  onEditorReady,
}: {
  value: string;
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
      <InitialEditorStatePlugin initialEditorState={value} />
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
});
