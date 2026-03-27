import { List, ListItemButton, Typography, Tooltip } from '@mui/material';
import { NunjucksFilter, listItemButtonStyles } from './filterDefinitions';

interface FilterListProps {
  title: string;
  filters: NunjucksFilter[];
  onFilterSelect: (filter: NunjucksFilter) => void;
  optionIndexStart?: number;
  activeOptionIndex?: number;
  onActiveOptionChange?: (index: number) => void;
}

export function FilterList({
  title,
  filters,
  onFilterSelect,
  optionIndexStart = 0,
  activeOptionIndex,
  onActiveOptionChange,
}: FilterListProps) {
  if (filters.length === 0) return null;

  return (
    <>
      <Typography
        variant="caption"
        sx={{
          paddingTop: 1,
          paddingLeft: 2,
          color: 'text.secondary',
          fontWeight: 'bold',
        }}
      >
        {title}
      </Typography>
      <List
        dense
        className="nodrag nopan"
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filters.map((filter, localIndex) => {
          const optionIndex = optionIndexStart + localIndex;

          return (
            <Tooltip
              key={filter.name}
              title={filter.description}
              arrow
              placement="left"
              slotProps={{
                popper: {
                  sx: {
                    zIndex: 100001,
                  },
                },
              }}
            >
              <ListItemButton
                sx={{
                  ...listItemButtonStyles,
                  paddingTop: '4px',
                  paddingBottom: '4px',
                }}
                selected={activeOptionIndex === optionIndex}
                onMouseEnter={() => onActiveOptionChange?.(optionIndex)}
                onMouseDown={e => {
                  e.preventDefault();
                  onFilterSelect(filter);
                }}
              >
                <Typography
                  sx={{
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {filter.name}
                </Typography>
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </>
  );
}
