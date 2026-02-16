import { useState, SyntheticEvent } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { MarkdownContent } from '@backstage/core-components';
import { StepNodeExpressionField } from '../nodes/step/StepNodeExpressionField';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    parameters: Array<{ name: string; type: string }>;
    outputs: Array<{ id: string; outputs: any }>;
    minHeight?: number | string;
    disabled?: boolean;
}

export const MarkdownEditor = ({
    value,
    onChange,
    parameters,
    outputs,
    minHeight = 200,
    disabled = false,
}: MarkdownEditorProps) => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="markdown editor tabs">
                    <Tab label="Write" />
                    <Tab label="Preview" />
                </Tabs>
            </Box>
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderTop: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
                {tabIndex === 0 && (
                    <StepNodeExpressionField
                        value={value}
                        onChange={onChange}
                        parameters={parameters}
                        outputs={outputs}
                        disableWrapper
                        minHeight={minHeight}
                        disabled={disabled}
                    />
                )}
                {tabIndex === 1 && (
                    <Paper elevation={0} sx={{ p: 2, minHeight: minHeight, maxHeight: 400, overflowY: 'auto', bgcolor: 'background.default' }}>
                        <MarkdownContent content={value || '_No content_'} />
                    </Paper>
                )}
            </Box>
        </Box>
    );
};
