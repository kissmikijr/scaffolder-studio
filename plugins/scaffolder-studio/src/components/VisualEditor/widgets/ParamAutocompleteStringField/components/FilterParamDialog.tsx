import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
} from '@mui/material';
import { NunjucksFilter } from './filterDefinitions';

interface FilterParamDialogProps {
    open: boolean;
    filter: NunjucksFilter | null;
    paramValues: Record<string, string>;
    onParamChange: (paramName: string, value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export function FilterParamDialog({
    open,
    filter,
    paramValues,
    onParamChange,
    onSubmit,
    onCancel,
}: FilterParamDialogProps) {
    if (!filter) return null;

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            sx={{ zIndex: '100000 !important' }}
        >
            <DialogTitle>
                Configure {filter.name} filter
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {filter.params?.map((param) => (
                        <TextField
                            key={param.name}
                            label={param.label}
                            value={paramValues[param.name] || ''}
                            onChange={(e) => onParamChange(param.name, e.target.value)}
                            fullWidth
                        />
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={onSubmit} variant="contained">
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
}
