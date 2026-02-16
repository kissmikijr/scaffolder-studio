import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Typography,
  Grid,
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
} from '@mui/material';
import { TemplateNodeData, VisualTemplateProject } from '../../types';
import { useNodes } from '@xyflow/react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { templateSchema, TemplateForm } from './schema';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import debounce from 'lodash.debounce';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

// Maximum number of owners to display in dropdown at once
const MAX_OWNERS_DISPLAY = 100;

export const TemplateNodeSideContent = ({ id }: { id?: string }) => {
  if (!id) {
    return <></>;
  }
  const nodes = useNodes();
  const currentNode = useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentData = currentNode?.data as TemplateNodeData;
  const catalogApi = useApi(catalogApiRef);
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);

  // Owner search state
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [totalOwners, setTotalOwners] = useState(0);

  const [projects, setProjects] = useState<VisualTemplateProject[]>([]);
  useEffect(() => {
    scaffolderVisualApi.listProjects({ trashed: false }).then(setProjects);
  }, [scaffolderVisualApi]);

  // Helper function to convert annotations object to string
  const annotationsToString = (annotations: Record<string, string>): string => {
    return Object.entries(annotations || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  };

  // Helper function to convert string to annotations object
  const stringToAnnotations = (str: string): Record<string, string> => {
    if (!str.trim()) return {};
    const annotations: Record<string, string> = {};
    str.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          annotations[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return annotations;
  };

  const [formValues, setFormValues] = useState<TemplateForm>({
    name: currentData?.name || '',
    owner: currentData?.owner || '',
    description: currentData?.description || '',
    type: currentData?.spec.type || '',
    annotations: annotationsToString(currentData?.annotations || {}),
  });

  // Debounced search for owners
  const searchOwners = useCallback(
    debounce(async (query: string) => {
      setOwnerLoading(true);
      try {
        // Build filter based on search query
        const filter: Record<string, string | string[]> = {
          kind: ['User', 'Group'],
        };

        // Use text search if available, otherwise filter client-side
        const res = await catalogApi.getEntities({
          filter,
          limit: MAX_OWNERS_DISPLAY,
          // offset: 0, // Only get first batch
        });

        let ownerRefs = res.items.map(e => stringifyEntityRef(e));

        // Client-side filtering if query provided
        if (query) {
          const lowerQuery = query.toLowerCase();
          ownerRefs = ownerRefs.filter(ref =>
            ref.toLowerCase().includes(lowerQuery),
          );
        }

        // Store total count for display
        setTotalOwners(res.items.length);
        setOwnerOptions(ownerRefs.slice(0, MAX_OWNERS_DISPLAY));
      } catch (error) {
        console.error('Error searching owners:', error);
        setOwnerOptions([]);
      } finally {
        setOwnerLoading(false);
      }
    }, 300),
    [catalogApi],
  );

  // Initial load of owners (empty search)
  useEffect(() => {
    searchOwners('');
  }, [searchOwners]);

  // Search when query changes
  useEffect(() => {
    if (ownerSearchQuery) {
      searchOwners(ownerSearchQuery);
    }
  }, [ownerSearchQuery, searchOwners]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced validation for name field only
  const debouncedNameValidation = useCallback(
    debounce(async (formData: TemplateForm) => {
      const result = await templateSchema(catalogApi, projects).safeParseAsync(
        formData,
      );
      if (!result.success) {
        const nameError = result.error.issues.find(
          err => err.path[0] === 'name',
        );
        if (nameError) {
          setErrors(prev => ({ ...prev, name: nameError.message }));
        }
      } else {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    }, 500),
    [catalogApi, projects],
  );

  const handleChange =
    (field: keyof TemplateForm) =>
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const updated = { ...formValues, [field]: newValue };

        // Update form values immediately
        setFormValues(updated);

        // For name field, use debounced validation
        if (field === 'name') {
          debouncedNameValidation(updated);
        } else {
          // For other fields, validate immediately but skip async name validation
          const schema = templateSchema(catalogApi, projects);
          const fieldSchema = schema.shape[field];

          try {
            if (fieldSchema) {
              await fieldSchema.parseAsync(newValue);
              setErrors(prev => ({ ...prev, [field]: '' }));
            }
          } catch (error: any) {
            if (error.errors?.[0]?.message) {
              setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
            }
          }
        }

        // Update node data regardless of validation
        const parsedAnnotations =
          field === 'annotations'
            ? stringToAnnotations(newValue)
            : currentData.annotations || {};

        currentData.onChange?.(id, {
          ...currentData,
          name: updated.name,
          owner: updated.owner,
          description: updated.description || '',
          spec: { type: updated.type },
          annotations: parsedAnnotations,
        });
      };

  // Generate helper text for owner field
  const getOwnerHelperText = () => {
    if (errors.owner) return errors.owner;
    if (totalOwners > MAX_OWNERS_DISPLAY) {
      return `Showing ${MAX_OWNERS_DISPLAY} of ${totalOwners}+ owners. Type to search...`;
    }
    return undefined;
  };

  return (
    <Grid>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            backgroundColor: NodeTypeColors.template,
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" sx={{ m: 0 }}>
          Template: {formValues.name || 'Unnamed'}
        </Typography>
      </Box>
      <TextField
        label="Name"
        variant="outlined"
        size="small"
        fullWidth
        value={formValues.name}
        onChange={handleChange('name')}
        error={!!errors.name}
        helperText={errors.name}
        style={{ marginTop: 12 }}
      />

      <Autocomplete
        onError={() => { }}
        freeSolo
        style={{ marginTop: 12 }}
        options={ownerOptions}
        value={formValues.owner}
        loading={ownerLoading}
        onInputChange={(_, newVal, reason) => {
          // Update search query for filtering
          if (reason === 'input') {
            setOwnerSearchQuery(newVal);
          }
          // Update form value
          handleChange('owner')({
            target: { value: newVal },
          } as unknown as React.ChangeEvent<HTMLInputElement>);
        }}
        filterOptions={x => x} // Disable built-in filtering, we do it server/client-side
        renderInput={params => (
          <TextField
            error={!!errors.owner}
            helperText={getOwnerHelperText()}
            {...params}
            label="Owner"
            placeholder="Type to search owners..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {ownerLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={
          ownerSearchQuery
            ? 'No owners found matching your search'
            : 'Start typing to search owners'
        }
      />

      <TextField
        error={!!errors.description}
        helperText={errors.description}
        label="Description"
        variant="outlined"
        size="small"
        fullWidth
        multiline
        minRows={4}
        maxRows={8}
        value={formValues.description || ''}
        onChange={handleChange('description')}
        style={{ marginTop: 12 }}
      />

      <TextField
        error={!!errors.type}
        helperText={errors.type}
        label="Type"
        variant="outlined"
        size="small"
        fullWidth
        value={formValues.type}
        onChange={handleChange('type')}
        style={{ marginTop: 12 }}
      />

      <TextField
        error={!!errors.annotations}
        helperText={
          errors.annotations ||
          'Enter annotations as key=value pairs, one per line'
        }
        label="Annotations"
        variant="outlined"
        size="small"
        fullWidth
        multiline
        minRows={3}
        maxRows={6}
        value={formValues.annotations || ''}
        onChange={handleChange('annotations')}
        style={{ marginTop: 12 }}
        placeholder={`github.com/project-slug=my-org/my-repo
backstage.io/techdocs-ref=dir:.`}
      />
    </Grid>
  );
};
