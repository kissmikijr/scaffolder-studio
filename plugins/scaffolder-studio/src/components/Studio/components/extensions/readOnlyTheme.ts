import { EditorView } from '@codemirror/view';

export const readOnlyTheme = EditorView.theme({
  '.cm-readonly-start': {
    position: 'relative',
  },
  '.cm-readonly-start::after': {
    content: '"Prefab (Read-only)"',
    position: 'absolute',
    right: '10px',
    top: '0',
    fontSize: '10px',
    color: '#666',
    background: 'rgba(255, 255, 255, 0.8)',
    padding: '2px 4px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '10',
  },
});
