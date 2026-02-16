import React from 'react';
import {
    List,
    ListItemButton,
    Typography,
    Tooltip,
} from '@mui/material';
import { NunjucksFilter, listItemButtonStyles } from './filterDefinitions';

interface FilterListProps {
    title: string;
    filters: NunjucksFilter[];
    onFilterSelect: (filter: NunjucksFilter) => void;
}

export function FilterList({ title, filters, onFilterSelect }: FilterListProps) {
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
                {filters.map((filter) => (
                    <Tooltip
                        key={filter.name}
                        title={filter.description}
                        arrow
                        placement="left"
                    >
                        <ListItemButton
                            sx={{
                                ...listItemButtonStyles,
                                paddingTop: '4px',
                                paddingBottom: '4px',
                            }}
                            onMouseDown={(e) => {
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
                ))}
            </List>
        </>
    );
}
