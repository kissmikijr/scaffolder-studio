import {
    Box,
    Typography,
    Divider,
    IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { NunjucksFilter, SelectedToken } from './filterDefinitions';
import { FilterList } from './FilterList';

interface FilterViewProps {
    selectedToken: SelectedToken | null;
    nunjucksFilters: NunjucksFilter[];
    backstageFilters: NunjucksFilter[];
    onFilterSelect: (filter: NunjucksFilter) => void;
    onBack: () => void;
}

export function FilterView({
    selectedToken,
    nunjucksFilters,
    backstageFilters,
    onFilterSelect,
    onBack,
}: FilterViewProps) {
    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingTop: 1 }}>
                <IconButton size="small" onClick={onBack}>
                    <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2">
                    {selectedToken ? `Apply filter to: ${selectedToken.display}` : 'Select a filter'}
                </Typography>
            </Box>
            <Divider sx={{ mt: 1 }} />

            <FilterList
                title="Nunjucks Filters"
                filters={nunjucksFilters}
                onFilterSelect={onFilterSelect}
            />

            <FilterList
                title="Backstage Filters"
                filters={backstageFilters}
                onFilterSelect={onFilterSelect}
            />
        </>
    );
}

