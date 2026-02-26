import { useEffect, useState, useMemo } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { Form } from '@backstage/plugin-scaffolder-react/alpha';
import SelectWidget from '../../widgets/SelectWidget';
import { useFieldExtensions } from '../../../../context/FieldExtensionsContext';

import { PropertyNodeData } from '../../types';

const customWidgets = {
  SelectWidget: SelectWidget,
};

type UIFieldConfigProps = {
  data: PropertyNodeData;
  onChange: (
    data: Partial<Pick<PropertyNodeData, 'ui:field' | 'ui:options'>>,
  ) => void;
  disabled?: boolean;
};

export const UIFieldConfig = ({
  data,
  onChange,
  disabled = false,
}: UIFieldConfigProps) => {
  const [selectedField, setSelectedField] = useState<{
    label: string;
    schema: RJSFSchema;
  } | null>(null);
  const customFieldExtensions = useFieldExtensions();

  // In the new frontend system, the schema is nested under an extra `.schema` key.
  // Support both: legacy `ext.schema.uiOptions` and NFS `ext.schema.schema.uiOptions`.
  const getUiOptions = (schema: RJSFSchema): RJSFSchema | undefined =>
    (schema as any).uiOptions ?? (schema as any).schema?.uiOptions;

  const uiFieldOptions = useMemo(
    () => [
      { label: 'None', schema: {} as RJSFSchema },
      ...customFieldExtensions
        .map(ui => ({ schema: ui.schema as RJSFSchema, label: ui.name }))
        .filter(ui => getUiOptions(ui.schema)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customFieldExtensions],
  );

  useEffect(() => {
    setSelectedField(
      uiFieldOptions.find(f => f.label === data['ui:field']) || null,
    );
  }, [data, uiFieldOptions]);

  const handleFieldChange = (field: { label: string; schema: RJSFSchema }) => {
    if (field.label === 'None') {
      setSelectedField(null);
      onChange({ 'ui:field': undefined });
    } else {
      setSelectedField(field);
      onChange({ 'ui:field': field.label });
    }
  };
  return (
    <Box>
      <Box>
        <Typography>Select: ui:field</Typography>
      </Box>
      <Box>
        <Autocomplete
          disabled={disabled}
          value={selectedField}
          onChange={(_event, newValue) => {
            if (newValue) {
              handleFieldChange(newValue);
            } else {
              setSelectedField(null);
              onChange({ 'ui:field': undefined });
            }
          }}
          options={uiFieldOptions}
          getOptionLabel={option => option.label}
          isOptionEqualToValue={(option, value) => {
            if (!option || !value) return false;
            return option.label === value.label;
          }}
          renderInput={params => (
            <TextField
              {...params}
              size="small"
              placeholder="Select a UI field..."
            />
          )}
          renderOption={(props, option) => (
            <li
              {...props}
              style={{
                cursor: 'pointer',
                padding: '8px 16px',
              }}
            >
              {option.label}
            </li>
          )}
          slotProps={{
            paper: {
              sx: {
                boxShadow: 3,
                '& .MuiAutocomplete-listbox': {
                  padding: 0,
                  '& .MuiAutocomplete-option': {
                    cursor: 'pointer',
                    padding: '10px 16px',
                    transition: 'background-color 0.15s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 0, 0, 1)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                    '&[aria-selected="true"]': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'red',
                      },
                    },
                  },
                },
              },
            },
          }}
        />
      </Box>
      <Box>
        {selectedField?.schema && getUiOptions(selectedField.schema) && (
          <Form
            disabled={disabled}
            schema={getUiOptions(selectedField.schema) as RJSFSchema}
            onChange={e => onChange({ 'ui:options': e.formData as string })}
            formData={data['ui:options']}
            formContext={{ fieldFormState: data['ui:options'] }}
            validator={validator}
            widgets={customWidgets}
          >
            <div />
          </Form>
        )}
      </Box>
    </Box>
  );
};
