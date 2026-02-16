import { Box, Typography, Collapse, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { StyledIconButton } from '../../components/StyledIconButton';

interface PrefabListHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearchExpanded: boolean;
    handleSearchToggle: () => void;
    handleSearchClose: () => void;
    searchInputRef: React.RefObject<HTMLInputElement>;
    header?: boolean;
}

export const PrefabListHeader = ({
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    handleSearchToggle,
    handleSearchClose,
    searchInputRef,
    header = false,
}: PrefabListHeaderProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                pl: 0,
                pr: 2,
                pt: 2,
                pb: 2,
                borderColor: 'divider',
            }}
        >
            {header ? (
                <Typography variant="h5" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
                    Prefabs
                </Typography>
            ) : (
                <Box />
            )}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <Collapse in={isSearchExpanded} orientation="horizontal">
                    <TextField
                        inputRef={searchInputRef}
                        size="small"
                        placeholder="Search prefabs..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') {
                                handleSearchClose();
                            }
                        }}
                        sx={{
                            width: '200px',
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '24px',
                                height: '32px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                '& fieldset': {
                                    borderColor: 'rgba(255,255,255,0.2)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255,255,255,0.3)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'text.secondary',
                                },
                            },
                            '& .MuiInputBase-input': {
                                color: 'text.primary',
                                fontSize: '0.75rem',
                                padding: '6px 12px',
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: 'text.secondary',
                                opacity: 0.7,
                            },
                        }}
                    />
                </Collapse>
                <StyledIconButton
                    onClick={handleSearchToggle}
                    size="small"
                    sx={{
                        width: '32px',
                        height: '32px',
                        color: isSearchExpanded ? 'primary.main' : 'text.secondary',
                        backgroundColor: isSearchExpanded
                            ? 'rgba(255,255,255,0.05)'
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        transition: 'all 0.2s ease-in-out',
                    }}
                >
                    {isSearchExpanded && searchQuery ? (
                        <CloseIcon sx={{ fontSize: '1rem' }} />
                    ) : (
                        <SearchIcon sx={{ fontSize: '1rem' }} />
                    )}
                </StyledIconButton>
            </Box>
        </Box>
    );
};
