import { useCallback, useMemo, useState } from 'react';
import { Typography, TextField, Box } from '@mui/material';
import { ParametersNodeData } from '../../types';
import { useNodes } from '@xyflow/react';
import { parametersSchema, ParametersForm } from './schema';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export const ParametersNodeSideContent = ({ id }: { id: string }) => {
  const nodes = useNodes();
  const currentNode = useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentData = currentNode?.data as ParametersNodeData;
  const [formData, setFormData] = useState<ParametersForm>({
    title: currentData?.title || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (newData: Pick<ParametersNodeData, 'title' | 'parameters'>) => {
      const updated = { ...formData, ...newData };
      const result = parametersSchema.safeParse(updated);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach(err => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({});
        currentData.onChange?.(id, newData);
      }

      setFormData(updated);
    },
    [currentData, id, formData],
  );

  if (!currentNode) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            backgroundColor: NodeTypeColors.parameters,
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" sx={{ m: 0 }}>
          Parameters: {formData.title || 'Unnamed'}
        </Typography>
      </Box>
      <TextField
        error={!!errors?.title}
        helperText={errors?.title}
        label="Title"
        variant="outlined"
        size="small"
        fullWidth
        value={formData?.title}
        onChange={e =>
          handleChange({
            title: e.target.value,
            parameters: currentData.parameters,
          })
        }
      />
    </Box>
  );
};
