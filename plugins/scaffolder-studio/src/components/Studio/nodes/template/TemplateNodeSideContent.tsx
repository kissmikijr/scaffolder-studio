import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from 'react';
import { Grid, TextField, Autocomplete, CircularProgress } from '@mui/material';
import { TemplateNodeData, VisualTemplateProject } from '../../types';
import { useNodes } from '@xyflow/react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { templateSchema, TemplateForm } from './schema';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import debounce from 'lodash.debounce';

const OWNER_PAGE_SIZE = 40;

export const TemplateNodeSideContent = ({ id }: { id?: string }) => {
  const nodes = useNodes();
  const currentNode = useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentData = currentNode?.data as TemplateNodeData;
  const catalogApi = useApi(catalogApiRef);
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);

  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerNextCursor, setOwnerNextCursor] = useState<string | undefined>();
  const [ownerStale, setOwnerStale] = useState(false);
  const ownerRequestIdRef = useRef(0);

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

  const loadOwners = useCallback(
    async ({
      query,
      cursor,
      append = false,
    }: {
      query: string;
      cursor?: string;
      append?: boolean;
    }) => {
      const requestId = ++ownerRequestIdRef.current;
      setOwnerLoading(true);
      setOwnerStale(!append);

      try {
        const trimmedQuery = query.trim();
        const res = await catalogApi.queryEntities(
          cursor
            ? {
                cursor,
                limit: OWNER_PAGE_SIZE,
                fields: ['kind', 'metadata.name', 'metadata.namespace'],
              }
            : {
                filter: [{ kind: 'user' }, { kind: 'group' }],
                fullTextFilter: trimmedQuery
                  ? {
                      term: trimmedQuery,
                      fields: ['metadata.name', 'metadata.title'],
                    }
                  : undefined,
                limit: OWNER_PAGE_SIZE,
                fields: ['kind', 'metadata.name', 'metadata.namespace'],
                orderFields: [{ field: 'metadata.name', order: 'asc' }],
                totalItems: 'exclude',
              },
        );

        if (requestId !== ownerRequestIdRef.current) {
          return;
        }

        const nextOwnerRefs = res.items.map(e => stringifyEntityRef(e));
        setOwnerOptions(current =>
          append ? [...current, ...nextOwnerRefs] : nextOwnerRefs,
        );
        setOwnerNextCursor(res.pageInfo.nextCursor);
      } catch {
        if (requestId === ownerRequestIdRef.current) {
          setOwnerOptions([]);
          setOwnerNextCursor(undefined);
        }
      } finally {
        if (requestId === ownerRequestIdRef.current) {
          setOwnerLoading(false);
          setOwnerStale(false);
        }
      }
    },
    [catalogApi],
  );

  const debouncedSearchOwners = useMemo(
    () =>
      debounce((query: string) => {
        loadOwners({ query });
      }, 300),
    [loadOwners],
  );

  useEffect(() => {
    debouncedSearchOwners(ownerSearchQuery);
    return () => debouncedSearchOwners.cancel();
  }, [debouncedSearchOwners, ownerSearchQuery]);

  const loadNextOwnerPage = useCallback(() => {
    if (!ownerNextCursor || ownerLoading) {
      return;
    }

    loadOwners({
      query: ownerSearchQuery,
      cursor: ownerNextCursor,
      append: true,
    });
  }, [loadOwners, ownerLoading, ownerNextCursor, ownerSearchQuery]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced validation for name field only
  const debouncedNameValidation = useMemo(
    () =>
      debounce(async (formData: TemplateForm) => {
        const result = await templateSchema(
          catalogApi,
          projects,
        ).safeParseAsync(formData);
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
      }, 300),
    [catalogApi, projects],
  );

  const handleChange =
    (field: keyof TemplateForm) => async (e: ChangeEvent<HTMLInputElement>) => {
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

      if (id) {
        currentData.onChange?.(id, {
          ...currentData,
          name: updated.name,
          owner: updated.owner,
          description: updated.description || '',
          spec: { type: updated.type },
          annotations: parsedAnnotations,
        });
      }
    };

  const getOwnerHelperText = () => {
    if (errors.owner) return errors.owner;
    if (ownerStale) {
      return 'Refreshing matching owners...';
    }
    if (ownerNextCursor) {
      return `Showing ${ownerOptions.length} owners. Scroll for more.`;
    }
    return ownerOptions.length
      ? `Showing ${ownerOptions.length} matching owners.`
      : undefined;
  };

  if (!id) {
    return <></>;
  }

  return (
    <Grid>
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
        onError={() => {}}
        freeSolo
        style={{ marginTop: 12 }}
        options={ownerOptions}
        value={formValues.owner}
        loading={ownerLoading}
        onInputChange={(_, newVal, reason) => {
          if (reason === 'input' || reason === 'clear') {
            setOwnerSearchQuery(newVal);
          }
          handleChange('owner')({
            target: { value: newVal },
          } as unknown as ChangeEvent<HTMLInputElement>);
        }}
        filterOptions={x => x}
        ListboxProps={{
          onScroll: event => {
            const listbox = event.currentTarget;
            const distanceToBottom =
              listbox.scrollHeight - listbox.scrollTop - listbox.clientHeight;
            if (distanceToBottom < 80) {
              loadNextOwnerPage();
            }
          },
        }}
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
