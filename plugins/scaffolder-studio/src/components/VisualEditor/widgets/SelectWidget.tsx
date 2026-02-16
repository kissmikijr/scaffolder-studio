import React from 'react';
import { WidgetProps } from '@rjsf/utils';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const SelectWidget = (props: WidgetProps) => {
  const theme = useTheme();

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value;
    // Convert to number if the original value was a number
    const convertedValue = typeof props.value === 'number' ? Number(value) : value;
    props.onChange(convertedValue);
  };

  return (
    <Select
      disabled={props.disabled || props.readonly}
      value={props.value ?? ''}
      onChange={handleChange}
      displayEmpty
      size="small"
      MenuProps={{
        PaperProps: {
          sx: {
            maxHeight: 300,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[8],
            borderRadius: 1,
            '& .MuiMenuItem-root': {
              fontSize: '0.875rem',
              padding: '8px 16px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
                '&:hover': {
                  backgroundColor: theme.palette.action.selected,
                },
              },
            },
          },
        },
      }}
      sx={{
        minWidth: 120,
        cursor: 'pointer',
        '& .MuiSelect-select': {
          textTransform: 'none',
          padding: '4px 8px',
          fontSize: '0.875rem',
          color: theme.palette.text.secondary,
          cursor: 'pointer',
        },
        '& .MuiSelect-icon': {
          color: theme.palette.text.secondary,
        },
        '& .MuiOutlinedInput-notchedOutline': {
          border: `1px solid ${theme.palette.divider}`,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          border: `1px solid ${theme.palette.primary.main}`,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          border: `1px solid ${theme.palette.primary.main}`,
        },
      }}
    >
      {props.options.enumOptions?.map((option: any, index: number) => (
        <MenuItem key={index} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
};

export default SelectWidget;
