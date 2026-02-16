import React, { useCallback, useMemo, useState } from 'react';
import {
  Typography,
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { PropertyNodeData, AllNodeData } from '../../types';
import { Node, useNodes } from '@xyflow/react';
import { propertySchema } from './schema';
import { UIFieldConfig } from './UIFieldConfig';
import { getPropertyBackgroundColor } from '@kissmiklosjr/plugin-scaffolder-studio-common';

type PropertyFormData = Pick<
  PropertyNodeData,
  'name'
  | 'variableType'
  | 'required'
  | 'description'
  | 'ui:field'
  | 'ui:options'
  | 'pattern'
  | 'enum'
  | 'title'
>;

const paramTypes = ['string', 'number', 'boolean'];

export const PropertyNodeSideContent = ({
  id,
  node,
  disabled = false,
}: {
  id: string;
  node?: Node<PropertyNodeData>;
  disabled?: boolean;
}) => {
  const nodes = useNodes<Node<AllNodeData>>();

  const currentNode =
    node || useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentData = currentNode?.data as PropertyNodeData;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PropertyFormData>({
    name: currentData?.name || '',
    variableType: currentData?.variableType || 'string',
    required: currentData?.required || false,
    description: currentData?.description || '',
    'ui:field': currentData?.['ui:field'],
    'ui:options': currentData?.['ui:options'],
    pattern: currentData?.pattern,
    enum: currentData?.enum,
    title: currentData?.title,
  });

  const handleChange = useCallback(
    (
      newData: Partial<
        PropertyFormData &
        Pick<PropertyNodeData, 'ui:field' | 'ui:options' | 'pattern' | 'enum' | 'title'>
      >,
    ) => {
      const updated = { ...formData, ...newData };
      const result = propertySchema({ nodes, excludeId: id }).safeParse(updated);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach(err => {
          const fieldName = err.path[0];
          if (typeof fieldName === 'string') {
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({});
        const dataToSave: Pick<
          PropertyNodeData,
          | 'name'
          | 'variableType'
          | 'required'
          | 'description'
          | 'ui:field'
          | 'ui:options'
          | 'pattern'
          | 'enum'
          | 'title'
        > = {
          name: updated.name,
          variableType: updated.variableType,
          required: updated.required,
          description: updated.description,
          'ui:field': updated['ui:field'],
          'ui:options': updated['ui:options'],
          pattern: updated.pattern,
          enum: updated.enum,
          title: updated.title,
        };
        currentData.onChange?.(id, dataToSave);
      }

      setFormData(updated);
    },
    [currentData, id, formData, nodes],
  );

  if (!currentNode) {
    return null;
  }

  return (

    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,

        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            backgroundColor: getPropertyBackgroundColor(formData.variableType),
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" sx={{ m: 0 }}>
          Property: {formData.name || 'Unnamed'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Name"
              variant="outlined"
              size="small"
              value={formData?.name}
              error={!!errors.name}
              helperText={errors.name}
              onChange={e => {
                handleChange({
                  ...formData,
                  name: e.target.value,
                });
              }}
            />
            <TextField
              select
              label="Type"
              variant="outlined"
              size="small"
              value={formData.variableType}
              onChange={e => {
                handleChange({
                  ...formData,
                  variableType: e.target.value,
                });
              }}
              SelectProps={{ native: true }}
            >
              {paramTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Title"
            variant="outlined"
            size="small"
            value={formData.title || ''}
            onChange={e => {
              handleChange({
                ...formData,
                title: e.target.value,
              });
            }}
            fullWidth
          />
          <TextField
            label="Description"
            variant="outlined"
            size="small"
            value={formData.description || ''}
            onChange={e => {
              handleChange({
                ...formData,
                description: e.target.value,
              });
            }}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Pattern"
            variant="outlined"
            size="small"
            value={formData.pattern || ''}
            onChange={e => {
              handleChange({
                ...formData,
                pattern: e.target.value,
              });
            }}
            fullWidth
          />
          <TextField
            label="Enum (comma separated)"
            variant="outlined"
            size="small"
            value={(formData.enum || []).join(', ')}
            onChange={e => {
              const enumArray = e.target.value
                ? e.target.value.split(',').map(s => s.trim())
                : undefined;
              handleChange({
                ...formData,
                enum: enumArray,
              });
            }}
            fullWidth
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              pl: 1,
              py: 0.5,
              backgroundColor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={formData.required || false}
                  onChange={e => {
                    handleChange({
                      ...formData,
                      required: e.target.checked,
                    });
                  }}
                />
              }
              label="Required"
              sx={{ m: 0 }}
            />
          </Box>
        </Box>
      </Box>
      <UIFieldConfig data={currentData} onChange={handleChange} />
    </Box>
  );

};
