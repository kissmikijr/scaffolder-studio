import { Box, Typography, Divider, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { NunjucksFilter, SelectedToken } from './filterDefinitions';
import { FilterList } from './FilterList';

export interface FilterViewOption {
  key: string;
  filter: NunjucksFilter;
}

export function getFilterViewOptions(
  nunjucksFilters: NunjucksFilter[],
  backstageFilters: NunjucksFilter[],
): FilterViewOption[] {
  const nunjucksOptions = nunjucksFilters.map((filter, index) => ({
    key: `nunjucks:${filter.name}:${index}`,
    filter,
  }));
  const backstageOptions = backstageFilters.map((filter, index) => ({
    key: `backstage:${filter.name}:${index}`,
    filter,
  }));

  return [...nunjucksOptions, ...backstageOptions];
}

interface FilterViewProps {
  selectedToken: SelectedToken | null;
  nunjucksFilters: NunjucksFilter[];
  backstageFilters: NunjucksFilter[];
  onFilterSelect: (filter: NunjucksFilter) => void;
  onBack: () => void;
  activeOptionIndex?: number;
  onActiveOptionChange?: (index: number) => void;
}

export function FilterView({
  selectedToken,
  nunjucksFilters,
  backstageFilters,
  onFilterSelect,
  onBack,
  activeOptionIndex,
  onActiveOptionChange,
}: FilterViewProps) {
  return (
    <>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingTop: 1 }}
      >
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2">
          {selectedToken ? `Apply filter` : 'Select a filter'}
        </Typography>
      </Box>
      <Divider sx={{ mt: 1 }} />

      <FilterList
        title="Nunjucks Filters"
        filters={nunjucksFilters}
        onFilterSelect={onFilterSelect}
        optionIndexStart={0}
        activeOptionIndex={activeOptionIndex}
        onActiveOptionChange={onActiveOptionChange}
      />

      <FilterList
        title="Backstage Filters"
        filters={backstageFilters}
        onFilterSelect={onFilterSelect}
        optionIndexStart={nunjucksFilters.length}
        activeOptionIndex={activeOptionIndex}
        onActiveOptionChange={onActiveOptionChange}
      />
    </>
  );
}
