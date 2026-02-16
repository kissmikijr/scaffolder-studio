import React from 'react';
import { Box, Tooltip } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { TemplateSyncStatus } from '../../hooks/useTemplateDraftPersistence';

export const SyncStatusIndicator = ({
    syncStatus,
    lastSyncedAt,
}: {
    syncStatus: TemplateSyncStatus;
    lastSyncedAt: string | null;
}) => {
    return (
        <Tooltip
            title={
                syncStatus === 'saved' && lastSyncedAt
                    ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
                    : syncStatus === 'pending'
                        ? 'Changes pending sync'
                        : syncStatus === 'syncing'
                            ? 'Syncing changes'
                            : syncStatus === 'offline'
                                ? 'Changes are saved locally and will sync once online'
                                : syncStatus === 'error'
                                    ? 'Sync failed, retrying automatically'
                                    : ''
            }
            disableHoverListener={
                !(
                    (syncStatus === 'saved' && lastSyncedAt) ||
                    syncStatus === 'pending' ||
                    syncStatus === 'syncing' ||
                    syncStatus === 'offline' ||
                    syncStatus === 'error'
                )
            }
        >
            <Box
                sx={{
                    ml: 1.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    color:
                        syncStatus === 'error'
                            ? 'warning.main'
                            : syncStatus === 'offline'
                                ? 'text.disabled'
                                : 'text.secondary',
                }}
            >
                {syncStatus === 'syncing' ? (
                    <SyncRoundedIcon
                        sx={{
                            fontSize: 16,
                            animation: 'sync-spin 1s linear infinite',
                            '@keyframes sync-spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                            },
                        }}
                    />
                ) : syncStatus === 'pending' ? (
                    <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />
                ) : syncStatus === 'offline' ? (
                    <CloudOffOutlinedIcon sx={{ fontSize: 16 }} />
                ) : syncStatus === 'error' ? (
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />
                ) : (
                    <CloudDoneOutlinedIcon sx={{ fontSize: 16 }} />
                )}
            </Box>
        </Tooltip>
    );
};
