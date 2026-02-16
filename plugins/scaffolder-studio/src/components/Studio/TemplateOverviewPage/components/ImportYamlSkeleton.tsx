import { useState } from 'react';
import { MouseEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import yaml from 'yaml';
import { CodeEditor } from '../../components/CodeEditor';

export const ImportTemplateDialog = ({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (parsedYaml: any) => void;
}) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');

  const handleFormatChange = (
    _: MouseEvent<HTMLElement>,
    newFormat: 'yaml' | 'json' | null,
  ) => {
    if (newFormat !== null) {
      setFormat(newFormat);
      setInputText('');
      // Clear error when switching formats
      setError(null);
    }
  };

  const handleParseAndImport = () => {
    try {
      // Check if input is empty
      if (!inputText || inputText.trim() === '') {
        setError('Please enter template YAML or JSON');
        return;
      }

      let parsed;

      if (format === 'yaml') {
        parsed = yaml.parse(inputText);
      } else {
        parsed = JSON.parse(inputText);
      }

      // Check if parsed result is valid
      if (!parsed || typeof parsed !== 'object') {
        setError('Invalid template format');
        return;
      }

      if (parsed.kind !== 'Template') {
        setError('Input must be a Backstage Template (kind: Template)');
        return;
      }

      setError(null);
      onImport(parsed);
    } catch (e) {
      setError(`Invalid ${format.toUpperCase()}: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setInputText('');
        onClose();
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Import Template</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Paste a valid Backstage Template in YAML or JSON format.
          </Typography>

          <ToggleButtonGroup
            value={format}
            exclusive
            onChange={handleFormatChange}
            aria-label="file format"
            size="small"
          >
            <ToggleButton value="yaml" aria-label="YAML format">
              YAML
            </ToggleButton>
            <ToggleButton value="json" aria-label="JSON format">
              JSON
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            minHeight: '250px',
          }}
        >
          <CodeEditor
            code={inputText}
            language={format}
            onChange={setInputText}
            showCopyButton={false}
            showImportButton={false}
            maxHeight="350px"
          />
        </Box>

        {error && (
          <Typography color="error" mt={1}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setInputText('');
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleParseAndImport} variant="contained">
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};
