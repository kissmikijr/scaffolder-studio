import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Box,
} from '@mui/material';
import { useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';

type PublishDialogProps = {
    open: boolean;
    onClose: () => void;
    onPublish: (publisherId: string, options?: Record<string, unknown>) => void;
};

export const PublishDialog = ({
    open,
    onClose,
    onPublish,
}: PublishDialogProps) => {
    const api = useApi(scaffolderVisualApiRef);
    const [publishers, setPublishers] = useState<{ id: string; title: string }[]>(
        [],
    );
    const [selectedPublisher, setSelectedPublisher] = useState<string>('');
    const [repoUrl, setRepoUrl] = useState('');

    useEffect(() => {
        if (open) {
            api.listPublishers().then(data => {
                setPublishers(data);
                if (data.length > 0) {
                    setSelectedPublisher(data[0].id);
                }
            });
        }
    }, [open, api]);

    const handlePublish = () => {
        const options: Record<string, unknown> = {};
        if (selectedPublisher === 'github-publisher') {
            options.repositoryUrl = repoUrl;
        }
        onPublish(selectedPublisher, options);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Publish Template</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Publisher</InputLabel>
                        <Select
                            value={selectedPublisher}
                            label="Publisher"
                            onChange={e => setSelectedPublisher(e.target.value)}
                        >
                            {publishers.map(p => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedPublisher === 'github-publisher' && (
                        <TextField
                            label="Repository URL"
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                            helperText="e.g. https://github.com/owner/repo"
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handlePublish} variant="contained" color="primary">
                    Publish
                </Button>
            </DialogActions>
        </Dialog>
    );
};
