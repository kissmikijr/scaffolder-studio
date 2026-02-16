import { templateSchema } from './schema';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import { VisualTemplateProject } from '../../types';

describe('templateSchema', () => {
    const mockCatalogApi = {
        getEntities: jest.fn().mockResolvedValue({ items: [] }),
    } as unknown as CatalogApi;

    const mockProjects: VisualTemplateProject[] = [];

    it('validates a correct name', async () => {
        const schema = templateSchema(mockCatalogApi, mockProjects);
        await expect(schema.shape.name.parseAsync('alma-123-456-a')).resolves.toBe('alma-123-456-a');
    });

    it('rejects invalid names', async () => {
        const schema = templateSchema(mockCatalogApi, mockProjects);
        await expect(schema.shape.name.parseAsync('-start-dash')).rejects.toThrow();
        await expect(schema.shape.name.parseAsync('end-dash-')).rejects.toThrow();
        await expect(schema.shape.name.parseAsync('Uppercase')).rejects.toThrow();
        await expect(schema.shape.name.parseAsync('space embedded')).rejects.toThrow();
    });
});
