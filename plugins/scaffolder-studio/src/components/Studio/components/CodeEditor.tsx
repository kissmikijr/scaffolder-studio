import React from 'react';
import { Box, useTheme, Button } from '@mui/material';
import { StyledIconButton } from './StyledIconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import { readOnlyDecorations } from './extensions/readOnlyDecorations';
import { readOnlyTheme } from './extensions/readOnlyTheme';
import { readOnlyTransactionFilter } from './extensions/readOnlyTransactionFilter';
import { customDarkTheme, customLightTheme } from './extensions/customTheme';

interface CodeEditorProps {
  code: string;
  language?: string;
  onCopy?: () => void;
  onImport?: (code: string) => void;
  onChange?: (code: string) => void;
  showCopyButton?: boolean;
  showImportButton?: boolean;
  maxHeight?: string;
  width?: string;
  editable?: boolean;
  readOnlyRanges?: Array<{ from: number; to: number }>;
}

export const CodeEditor = ({
  code,
  onCopy,
  onImport,
  onChange,
  showCopyButton = true,
  showImportButton = true,
  maxHeight = '90vh',
  width = '100%',
  editable = true,
  readOnlyRanges = [],
}: CodeEditorProps) => {
  const theme = useTheme();


  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    if (onCopy) {
      onCopy();
    }
  };

  const handleImport = () => {
    if (onImport) {
      if (onImport) {
        onImport(code);
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          backgroundColor:
            theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          maxHeight,
          '& .cm-editor': {
            height: '100%',
            fontSize: '14px',
          },
          '& .cm-scroller': {
            overflow: 'auto',
          },
          '& .cm-gutters': {
            border: 'none',
          },
          '& .cm-activeLineGutter': {
            backgroundColor: 'transparent',
          },
        }}
      >
        <CodeMirror
          value={code}
          height="100%"
          maxHeight={maxHeight}
          lang={"yaml"}
          theme={
            theme.palette.mode === 'dark' ? customDarkTheme : customLightTheme
          }
          extensions={[
            yaml(),
            EditorView.lineWrapping,
            readOnlyTransactionFilter(readOnlyRanges),
            readOnlyTheme,
            readOnlyDecorations(readOnlyRanges, theme),
          ]}
          editable={editable}
          onChange={value => {
            if (onChange) {
              onChange(value);
            }
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignSelf: 'flex-end', justifyContent: 'center' }}>
        {showCopyButton && (
          <StyledIconButton
            onClick={handleCopy}
            aria-label="Copy code"
            color="secondary"
            size="small"
            sx={{
              width: 48,
              height: 34,
              margin: '8px',
              borderRadius: '12px !important',
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </StyledIconButton>
        )}
        {showImportButton && editable && (
          <Button onClick={handleImport}>Save</Button>
        )}
      </Box>
    </Box>
  );
};
