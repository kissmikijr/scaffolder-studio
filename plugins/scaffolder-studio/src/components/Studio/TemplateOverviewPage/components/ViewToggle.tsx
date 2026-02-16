import { Box, IconButton, useTheme } from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import type { ViewMode } from '../hooks/useViewMode';

type ViewToggleProps = {
    viewMode: ViewMode;
    onChange: (mode: ViewMode) => void;
};

export const ViewToggle = ({ viewMode, onChange }: ViewToggleProps) => {
    const theme = useTheme();

    const buttonBase = {
        borderRadius: 0,
        px: 1,
        py: 0.5,
        transition: 'all 0.15s ease',
    };

    const activeStyle = {
        ...buttonBase,
        color: theme.palette.primary.main,
        bgcolor:
            theme.palette.mode === 'dark'
                ? 'rgba(144,202,249,0.12)'
                : 'rgba(25,118,210,0.08)',
    };

    const inactiveStyle = {
        ...buttonBase,
        color: theme.palette.text.secondary,
        bgcolor: 'transparent',
        '&:hover': {
            bgcolor:
                theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)',
        },
    };

    return (
        <Box
            sx={{
                display: 'inline-flex',
                border: '1px solid',
                borderColor:
                    theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.1)',
                borderRadius: '10px',
                overflow: 'hidden',
            }}
        >
            <IconButton
                size="small"
                onClick={() => onChange('card')}
                sx={viewMode === 'card' ? activeStyle : inactiveStyle}
                aria-label="Card view"
            >
                <GridViewRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                onClick={() => onChange('list')}
                sx={viewMode === 'list' ? activeStyle : inactiveStyle}
                aria-label="List view"
            >
                <ViewListRoundedIcon fontSize="small" />
            </IconButton>
        </Box>
    );
};
