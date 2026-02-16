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
    const getTitle = () => {
        switch (syncStatus) {
            case 'saved':
                return lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}` : '';
            case 'pending':
                return 'Changes pending sync';
            case 'syncing':
                return 'Syncing changes';
            case 'offline':
                return 'Changes are saved locally and will sync once online';
            case 'error':
                return 'Sync failed, retrying automatically';
            default:
                return '';
        }
    };

    const getColor = () => {
        switch (syncStatus) {
            case 'error':
                return 'warning.main';
            case 'offline':
                return 'text.disabled';
            default:
                return 'text.secondary';
        }
    };

    const renderIcon = () => {
        switch (syncStatus) {
            case 'syncing':
                return (
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
                );
            case 'pending':
                return <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />;
            case 'offline':
                return <CloudOffOutlinedIcon sx={{ fontSize: 16 }} />;
            case 'error':
                return <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />;
            default:
                return <CloudDoneOutlinedIcon sx={{ fontSize: 16 }} />;
        }
    };

    const hasData =
        (syncStatus === 'saved' && lastSyncedAt) ||
        ['pending', 'syncing', 'offline', 'error'].includes(syncStatus);

    return (
        <Tooltip title={getTitle()} disableHoverListener={!hasData}>
            <Box
                sx={{
                    ml: 1.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: getColor(),
                }}
            >
                {renderIcon()}
            </Box>
        </Tooltip>
    );
};
