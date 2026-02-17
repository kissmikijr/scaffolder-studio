import React from 'react';
import { Popper, Box } from '@mui/material';
import { ViewMode, SelectedToken, NunjucksFilter } from './filterDefinitions';
import { MainView } from './MainView';
import { FilterView } from './FilterView';

interface AutocompletePopperProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    viewMode: ViewMode;
    selectedToken: SelectedToken | null;
    parameters: Array<{ name: string; type: string }>;
    outputs: Array<{ id: string; outputs: any }>;
    nunjucksFilters: NunjucksFilter[];
    backstageFilters: NunjucksFilter[];
    onParamSelect: (param: string) => void;
    onOutputSelect: (output: { stepId: string; outputName: string }) => void;
    onFilterSelect: (filter: NunjucksFilter) => void;
    onBack: () => void;
    onNext: () => void;
}

export function AutocompletePopper({
    open,
    anchorEl,
    viewMode,
    selectedToken,
    parameters,
    outputs,
    nunjucksFilters,
    backstageFilters,
    onParamSelect,
    onOutputSelect,
    onFilterSelect,
    onBack,
    onNext,
}: AutocompletePopperProps) {
    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement="bottom"
            style={{ zIndex: 100000, pointerEvents: 'auto' }}
        >
            <Box
                onMouseDown={(e) => e.preventDefault()}
                sx={{
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    boxShadow: 3,
                    padding: 2,
                    maxHeight: '400px',
                    overflowY: 'auto',
                    minWidth: '300px',
                    pointerEvents: 'all',
                }}
            >
                {viewMode === 'main' ? (
                    <MainView
                        parameters={parameters}
                        outputs={outputs}
                        onParamSelect={onParamSelect}
                        onOutputSelect={onOutputSelect}
                        onNext={onNext}
                    />
                ) : (
                    <FilterView
                        selectedToken={selectedToken}
                        nunjucksFilters={nunjucksFilters}
                        backstageFilters={backstageFilters}
                        onFilterSelect={onFilterSelect}
                        onBack={onBack}
                    />
                )}
            </Box>
        </Popper>
    );
}
