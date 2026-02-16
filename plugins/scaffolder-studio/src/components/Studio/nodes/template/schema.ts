import { z } from 'zod';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import { VisualTemplateProject } from '../../types';

// Direct catalog API check without debounce (debounce will be handled in UI)
const checkCatalogAvailability = async (
  catalogApi: CatalogApi,
  value: string,
) => {
  try {
    const entities = await catalogApi.getEntities({
      filter: { 'metadata.name': value },
    });
    return entities.items.length === 0;
  } catch {
    // Return true (available) if API fails to avoid blocking user
    return true;
  }
};

export const templateSchema = (
  catalogApi: CatalogApi,
  projects: VisualTemplateProject[],
) => {
  return z.object({
    name: z
      .string()
      .min(1, { message: 'Template name is required' })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message:
          'Name must consist of lower-case alphanumeric characters or "-", and must start and end with an alphanumeric character.',
      })
      .refine(
        async value => {
          return await checkCatalogAvailability(catalogApi, value);
        },
        { message: 'Template with this name already exists in catalog' },
      )
      .refine(
        value => {
          const project = projects.find(p => p.metadata.name === value);
          return !project;
        },
        { message: 'Template with this name already exists in your projects' },
      ),
    owner: z
      .string()
      .min(1, 'Owner is required')
      .regex(/^[a-z0-9]+:[a-z0-9-]+\/[a-z0-9-_]+$/, {
        message: 'Must be a valid entity ref like kind:namespace/name',
      }),
    description: z.string().optional(),
    type: z.string().min(1, 'Type is required'),
    annotations: z.string().optional(),
  });
};

export type TemplateForm = z.infer<ReturnType<typeof templateSchema>>;
