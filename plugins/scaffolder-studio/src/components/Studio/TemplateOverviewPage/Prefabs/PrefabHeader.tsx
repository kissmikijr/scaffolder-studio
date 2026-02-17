import React from 'react';
import {
    Box,
    useTheme,
    IconButton,
    InputBase,
    Chip,
    Tooltip,
    Select,
    FormControl,
    MenuItem,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { StoredPrefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useNavigate } from 'react-router-dom';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { TemplateSyncStatus } from '../../hooks/useTemplateDraftPersistence';

interface PrefabHeaderProps {
    prefab: StoredPrefab | null;
    onPrefabChange: (id: string, data: Partial<StoredPrefab>) => void;
    syncStatus: TemplateSyncStatus;
    lastSyncedAt: string | null;
    nodeType: string;
    onNodeTypeChange: (type: string) => void;
    children?: React.ReactNode;
    onBack?: () => void;
}

export const PrefabHeader = ({
    prefab,
    onPrefabChange,
    syncStatus,
    lastSyncedAt,
    nodeType,
    onNodeTypeChange,
    children,
    onBack,
}: PrefabHeaderProps) => {
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: '64px',
                backgroundColor:
                    theme.palette.mode === 'dark' ? '#16161a' : '#fafafa',
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                px: 2,
                gap: 2,
                zIndex: 1100,
            }}
        >
            <IconButton
                onClick={() => {
                    if (onBack) {
                        onBack();
                    } else {
                        navigate('/scaffolder-studio/prefabs');
                    }
                }}
                size="small"

                sx={{
                    mr: 1,
                    color: 'text.secondary',
                    opacity: 0.6,
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: 'action.hover',
                    },
                }}
            >
                <ArrowBackIosNewRoundedIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <InputBase
                    value={prefab?.title || ''}
                    onChange={e =>
                        prefab && onPrefabChange(prefab.id!, { title: e.target.value })
                    }
                    placeholder="Prefab Title"
                    sx={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: theme.palette.text.primary,
                        '& .MuiInputBase-input': {
                            padding: '2px 4px',
                            borderRadius: 1,
                            transition: 'background-color 0.2s',
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                            },
                            '&:focus': {
                                backgroundColor: theme.palette.action.selected,
                            },
                        },
                    }}
                />
                <InputBase
                    value={prefab?.description || ''}
                    onChange={e =>
                        prefab && onPrefabChange(prefab.id!, { description: e.target.value })
                    }
                    placeholder="Add description..."
                    fullWidth
                    multiline
                    sx={{
                        fontSize: '0.8125rem',
                        color: theme.palette.text.secondary,
                        '& .MuiInputBase-input': {
                            padding: '2px 4px',
                            borderRadius: 1,
                            transition: 'background-color 0.2s',
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                            },
                            '&:focus': {
                                backgroundColor: theme.palette.action.selected,
                            },
                        },
                    }}
                />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 320 }}>
                    <Select
                        value={nodeType}
                        onChange={e => onNodeTypeChange(e.target.value as string)}
                        variant="outlined"
                        size="small"
                        displayEmpty
                        sx={{
                            height: 32,
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                            '& .MuiSelect-select': {
                                py: 0.5,
                                pl: 1.5,
                            },
                        }}
                    >
                        <MenuItem value="" disabled>
                            <em>Target Node Type</em>
                        </MenuItem>
                        <MenuItem value="step">Step (Action)</MenuItem>
                        <MenuItem value="output">Output</MenuItem>
                        <MenuItem value="property">Property (Input)</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
                {prefab?.published_at && !prefab.is_published && (
                    <Tooltip title="This prefab has unpublished changes that are not live in the library.">
                        <WarningRoundedIcon
                            sx={{
                                fontSize: '1.25rem',
                                color: theme.palette.warning.main,
                                opacity: 0.9,
                            }}
                        />
                    </Tooltip>
                )}
                {prefab?.published_at && prefab.is_published && (
                    <Tooltip title="Published to Library">
                        <CheckCircleRoundedIcon
                            sx={{
                                fontSize: '1.25rem',
                                color: theme.palette.success.main,
                                opacity: 0.9,
                            }}
                        />
                    </Tooltip>
                )}
                <SyncStatusIndicator
                    syncStatus={syncStatus}
                    lastSyncedAt={lastSyncedAt}
                />
                {prefab?.published_at && (
                    <Chip
                        label={`v${prefab.version || '1'}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            opacity: 0.8,
                        }}
                    />
                )}

                {!prefab?.published_at && prefab && (
                    <Chip
                        label="Not Published"
                        size="small"
                        variant="outlined"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 500,
                            color: 'text.disabled',
                            borderColor: 'divider',
                        }}
                    />
                )}
                {children}
            </Box>
        </Box>
    );
};
