import React from 'react';
import {
    List,
    ListItemButton,
    Typography,
    Box,
    Divider,
} from '@mui/material';
import { listItemButtonStyles } from './filterDefinitions';
import { getBackgroundColor } from '../../../utils/colorUtils';

interface MainViewProps {
    parameters: Array<{ name: string; type: string }>;
    outputs: Array<{ id: string; outputs: any }>;
    onParamSelect: (param: string) => void;
    onOutputSelect: (output: { stepId: string; outputName: string }) => void;
    onNext: () => void;
}

export function MainView({
    parameters,
    outputs,
    onParamSelect,
    onOutputSelect,
    onNext,
}: MainViewProps) {
    return (
        <>
            <List dense className="nodrag nopan" sx={{ py: 0 }}>
                <ListItemButton
                    onClick={onNext}
                    sx={{ ...listItemButtonStyles }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            fontStyle: 'italic',
                            color: 'text.secondary',
                            width: '100%',
                            textAlign: 'center',
                        }}
                    >
                        Filters &rarr;
                    </Typography>
                </ListItemButton>
            </List>
            <Divider />
            {/* Parameters Section */}
            {parameters.length > 0 && (
                <>
                    <List
                        dense
                        className="nodrag nopan"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {parameters.map((param) => (
                            <Box key={param.name}>
                                <ListItemButton
                                    sx={{ ...listItemButtonStyles }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onParamSelect(param.name);
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '2px',
                                                backgroundColor: getBackgroundColor(param.type),
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Typography
                                            sx={{
                                                textAlign: 'left',
                                                flex: 1,
                                            }}
                                        >
                                            {param.name}
                                        </Typography>
                                    </Box>
                                </ListItemButton>
                            </Box>
                        ))}
                    </List>
                </>
            )}

            {/* Outputs Section */}
            {outputs.length > 0 && (
                <>
                    <List
                        dense
                        className="nodrag nopan"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {outputs.map(
                            (output: { id: string; outputs: any }) =>
                                output.outputs && (
                                    <Box
                                        key={output.id}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                paddingBottom: 1,
                                                color: 'gray',
                                            }}
                                        >
                                            {output.id}
                                        </Typography>
                                        {Object.entries(output.outputs).map(([key, value]: any) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'flex-start',
                                                }}
                                            >
                                                <ListItemButton
                                                    key={key}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        onOutputSelect({
                                                            stepId: output.id,
                                                            outputName: key,
                                                        });
                                                    }}
                                                    sx={{ ...listItemButtonStyles }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                        <Box
                                                            sx={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: '2px',
                                                                backgroundColor: getBackgroundColor(value?.type),
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <Typography
                                                            sx={{
                                                                textAlign: 'left',
                                                                flex: 1,
                                                            }}
                                                        >
                                                            {key}
                                                        </Typography>
                                                    </Box>
                                                </ListItemButton>
                                            </Box>
                                        ))}
                                    </Box>
                                ),
                        )}
                    </List>
                </>
            )}
        </>
    );
}
