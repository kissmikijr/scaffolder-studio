import { useState, SyntheticEvent } from 'react';
import { Box, Tabs, Tab, Paper, Typography, Button } from '@mui/material';
import { MarkdownContent } from '@backstage/core-components';
import { StepNodeExpressionField } from '../nodes/step/StepNodeExpressionField';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  parameters: Array<{ name: string; type: string }>;
  outputs: Array<{ id: string; outputs: any }>;
  minHeight?: number | string;
  disabled?: boolean;
  commentMode?: boolean;
  onClose?: () => void;
}

export const MarkdownEditor = ({
  value,
  onChange,
  parameters,
  outputs,
  minHeight = 200,
  disabled = false,
  commentMode = false,
  onClose,
}: MarkdownEditorProps) => {
  const [tabIndex, setTabIndex] = useState(value ? 1 : 0);

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box data-testid="markdown-editor" sx={{ width: '100%' }}>
      {commentMode && (
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Comment
          </Typography>
          {onClose && (
            <Button size="small" onClick={onClose}>
              Done
            </Button>
          )}
        </Box>
      )}
      <Box sx={{ borderColor: 'divider' }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="markdown editor tabs"
          variant={commentMode ? 'fullWidth' : 'standard'}
          sx={
            commentMode
              ? {
                  minHeight: 32,
                  '& .MuiTab-root': { minHeight: 32, textTransform: 'none' },
                }
              : undefined
          }
        >
          <Tab label="Write" />
          <Tab label="Preview" />
        </Tabs>
      </Box>
      <Box
        sx={{
          p: 1,
          borderTop: 0,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
        }}
      >
        {tabIndex === 0 && (
          <StepNodeExpressionField
            value={value}
            onChange={onChange}
            parameters={parameters}
            outputs={outputs}
            disableWrapper
            minHeight={commentMode ? 120 : minHeight}
            disabled={disabled}
            showAutocompletePopper={!commentMode}
          />
        )}
        {tabIndex === 1 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              minHeight: minHeight,
              maxHeight: 400,
              overflowY: 'auto',
              bgcolor: 'background.default',
            }}
          >
            <MarkdownContent content={value || '_No content_'} />
          </Paper>
        )}
      </Box>
    </Box>
  );
};
