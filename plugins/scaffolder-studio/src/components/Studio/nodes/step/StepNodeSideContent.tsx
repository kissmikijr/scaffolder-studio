import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Autocomplete,
  TextField,
  Tooltip,
  Box,
} from '@mui/material';
import validator from '@rjsf/validator-ajv8';
import { Form } from '@backstage/plugin-scaffolder-react/alpha';
import { styledMenuProps } from '../../components/menuStyles';
import { AllNodeData, StepNodeData, PropertyNodeData } from '../../types';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { ParamAutocompleteStringField } from '../../widgets/ParamAutocompleteStringField/ParamAutocompleteStringField';
import { useEdges, useNodes, Node } from '@xyflow/react';
import { RJSFSchema } from '@rjsf/utils';
import { StepForm, stepSchema } from './schema';
import { traverseUpFromNode } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import SelectWidget from '../../widgets/SelectWidget';
import { isStepNode } from '../../types';
import { StepNodeExpressionField } from './StepNodeExpressionField';
import { fixSchema, normalizeFormDataForSchema } from '../../utils/schemaUtils';

const customFields = {
  StringField: ParamAutocompleteStringField as any,
  NumberField: ParamAutocompleteStringField as any,
  IntegerField: ParamAutocompleteStringField as any,
};
const customWidgets = {
  SelectWidget: SelectWidget as any,
};

export const StepNodeSideContent = ({
  node,
  availableActions,
  id,
  disabled = false,
}: {
  node?: Node<StepNodeData>;
  availableActions: ScaffolderAction[];
  id: string;
  disabled?: boolean;
}) => {
  const nodes = useNodes<Node<AllNodeData>>();
  const edges = useEdges();

  const foundNode = useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentNode = node || foundNode;
  const currentData = currentNode?.data as StepNodeData;

  const allParentSteps = traverseUpFromNode(
    id,
    edges,
    nodes.filter(n => n.type === 'step'),
  ).slice(1);

  const allParentStepsOutputs = (
    allParentSteps as Node<StepNodeData>[]
  ).flatMap(s => {
    return {
      id: s.data.stepId || '',
      outputs: (s.data.schema?.output as any)?.properties,
    };
  });

  const [formData, setFormData] = useState<StepForm>({
    id: currentData?.stepId ?? '',
    name: currentData?.name ?? '',
    if: currentData?.if ?? '',
  });

  const [errors, setErrors] = useState<
    Record<keyof StepForm, string | undefined>
  >({ id: '', name: '', if: '' });

  useEffect(() => {
    if (!currentData) {
      return;
    }

    setFormData({
      id: currentData.stepId ?? '',
      name: currentData.name ?? '',
      if: currentData.if ?? '',
    });
  }, [currentData]);

  const handleChange = useCallback(
    (
      newData: Partial<
        Pick<
          StepNodeData,
          | 'name'
          | 'stepId'
          | 'if'
          | 'formData'
          | 'actionId'
          | 'schema'
          | 'description'
        >
      >,
    ) => {
      const current = currentData;
      if (!current?.onChange) {
        return;
      }

      const rawFormData = newData.formData ?? current.formData ?? {};
      const inputSchema = current.schema?.input;

      const normalizedFormData =
        typeof rawFormData === 'object' && rawFormData !== null
          ? normalizeFormDataForSchema(
              inputSchema as any,
              rawFormData as Record<string, unknown>,
            )
          : rawFormData;

      const mergedData: Pick<
        StepNodeData,
        'name' | 'stepId' | 'if' | 'formData' | 'schema' | 'description'
      > = {
        stepId: newData.stepId ?? current.stepId ?? formData.id,
        name: newData.name ?? current.name ?? formData.name,
        if: newData.if ?? current.if ?? formData.if,
        formData: normalizedFormData,
        schema: newData.schema ?? current.schema,
        description: newData.description ?? current.description,
      };

      const payload =
        newData.actionId !== undefined
          ? { ...mergedData, actionId: newData.actionId }
          : mergedData;

      current.onChange(id, payload as any);
    },
    [formData.id, formData.name, formData.if, id, currentData],
  );

  const validateAndSet = (field: keyof StepForm, value: string) => {
    const updated = { ...formData, [field]: value };

    const result = stepSchema.safeParse(updated);
    if (!result.success) {
      const fieldError = result.error.issues.find(
        issue => issue.path[0] === field,
      )?.message;
      setErrors(prev => ({ ...prev, [field]: fieldError }));
    } else {
      setErrors(prev => ({ ...prev, [field]: undefined }));
      handleChange({
        stepId: updated.id,
        name: updated.name,
        if: updated.if,
      });
    }

    setFormData(updated);
  };

  const handleActionChange = useCallback(
    (_: React.SyntheticEvent, newValue: ScaffolderAction | null) => {
      if (newValue) {
        const baseId = newValue.id.replace(/:/g, '-');

        // Get all existing step IDs except current node
        const existingStepIds = nodes
          .filter(n => isStepNode(n) && n.id !== id)
          .map(n => (n.data as StepNodeData).stepId);

        // Find unique ID with autoincrement
        let uniqueId = baseId;
        let counter = 1;
        while (existingStepIds.includes(uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter++;
        }

        setFormData({
          id: uniqueId,
          name: uniqueId,
          if: '',
        });
        handleChange({
          stepId: uniqueId,
          name: uniqueId,
          if: '',
          formData: {},
          schema: newValue.schema,
          description: newValue.description,
          actionId: newValue.id,
        });
      }
    },
    [handleChange, id, nodes],
  );

  const propertyNodes = useMemo(
    () => nodes.filter(n => n.type === 'property'),
    [nodes],
  );

  const parameters = useMemo(
    () =>
      propertyNodes.map(pn => ({
        name: (pn.data as PropertyNodeData).name,
        type: (pn.data as PropertyNodeData).variableType,
      })),
    [propertyNodes],
  );

  const selectedAction = useCallback(
    (actionId: string) => availableActions.find(a => a.id === actionId) ?? null,
    [availableActions],
  );

  const formSchema = useMemo(() => {
    return fixSchema(currentData?.schema?.input) as RJSFSchema;
  }, [currentData?.schema?.input]);

  if (!currentData) {
    return null;
  }

  return (
    <Box
      sx={{
        opacity: disabled ? 0.7 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Autocomplete
        disabled={disabled}
        options={[...(availableActions || [])].sort((a, b) => {
          const groupA = a.id.split(':')[0] ?? 'Other';
          const groupB = b.id.split(':')[0] ?? 'Other';
          return groupA.localeCompare(groupB);
        })}
        getOptionLabel={option => option.id}
        groupBy={option => option.id.split(':')[0] ?? 'Other'}
        value={selectedAction(currentData?.actionId ?? '')}
        onChange={handleActionChange}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        fullWidth
        size="medium"
        className="nodrag nopan"
        {...styledMenuProps}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              backgroundImage: 'none', // Remove elevation gradient in dark mode so it matches background.paper exactly
              '& .v5-MuiListSubheader-root, & .v5-MuiAutocomplete-groupLabel': {
                bgcolor: 'background.paper',
              },
              '& .MuiListSubheader-root, & .MuiAutocomplete-groupLabel': {
                bgcolor: 'background.paper',
              },
            },
          },
        }}
        renderOption={(props, option) => (
          <Tooltip title={option.description || ''} arrow placement="right">
            <li {...props}>{option.id}</li>
          </Tooltip>
        )}
        renderInput={params => (
          <TextField
            {...params}
            size="small"
            label="Select Action"
            placeholder="Start typing..."
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <TextField
        disabled={disabled}
        label="id"
        variant="outlined"
        size="small"
        fullWidth
        error={!!errors.id}
        helperText={errors.id}
        value={formData.id}
        onChange={e => validateAndSet('id', e.target.value)}
        style={{ marginTop: 12 }}
      />
      <TextField
        disabled={disabled}
        label="name"
        variant="outlined"
        size="medium"
        fullWidth
        error={!!errors.name}
        helperText={errors.name}
        value={formData.name}
        onChange={e => validateAndSet('name', e.target.value)}
        style={{ marginTop: 12 }}
      />
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="textSecondary" gutterBottom>
          if
        </Typography>
        <StepNodeExpressionField
          disabled={disabled}
          value={formData.if || ''}
          onChange={val => validateAndSet('if', val)}
          parameters={parameters}
          outputs={allParentStepsOutputs}
        />
        {errors.if && (
          <Typography variant="caption" color="error">
            {errors.if}
          </Typography>
        )}
      </Box>
      <Typography variant="h6" gutterBottom>
        {currentData?.actionId}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {currentData?.description}
      </Typography>
      {currentData?.schema && formSchema && (
        <Form
          disabled={disabled}
          schema={formSchema}
          formData={currentData?.formData}
          onChange={newData => {
            const formDataPayload =
              newData.formData ?? (newData as any).formData ?? {};
            handleChange({
              formData: formDataPayload,
            });
          }}
          formContext={{
            parameters,
            outputs: allParentStepsOutputs,
          }}
          validator={validator}
          fields={customFields}
          widgets={customWidgets}
        >
          <div />
        </Form>
      )}
    </Box>
  );
};
