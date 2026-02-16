import { Extension } from '@codemirror/state';
import { draculaInit } from '@uiw/codemirror-theme-dracula';
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';
import { githubLightInit } from '@uiw/codemirror-theme-github';

const yamlHighlighting = createTheme({
  theme: 'dark',
  settings: {},
  styles: [
    { tag: [t.string, t.literal, t.content], color: '#f1fa8c' },
    { tag: [t.propertyName], color: '#8be9fd' },
    { tag: [t.comment], color: '#6272a4' },
    { tag: [t.number, t.bool, t.null], color: '#bd93f9' },
  ],
});



export const customDarkTheme: Extension = [
  draculaInit({
    settings: { background: '#1e1e1e', gutterBackground: '#1e1e1e' },
  }),
  yamlHighlighting,
];
export const customLightTheme: Extension = [
  githubLightInit({
    settings: {  gutterBackground: '#ffffff' },
  }),
];
