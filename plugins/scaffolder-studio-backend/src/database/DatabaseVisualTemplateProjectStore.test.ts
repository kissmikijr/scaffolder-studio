import { DatabaseService } from '@backstage/backend-plugin-api';
import { mockServices } from '@backstage/backend-test-utils';
import { Knex } from 'knex';
import { DatabaseVisualTemplateProjectStore } from './DatabaseVisualTemplateProjectStore';
import { VisualTemplateProject } from '@kissmiklosjr/plugin-scaffolder-studio-common';

describe('DatabaseVisualTemplateProjectStore', () => {
  let store: DatabaseVisualTemplateProjectStore;
  let database: DatabaseService;
  let knex: Knex;

  beforeEach(async () => {
    database = mockServices.database.mock();
    knex = await database.getClient();

    // Mock the migrations
    jest.spyOn(knex.migrate, 'latest').mockResolvedValue([]);

    store = await DatabaseVisualTemplateProjectStore.create({ database });
  });

  afterEach(async () => {
    await store.cleanup();
    jest.clearAllMocks();
  });

  describe('prefab connection management', () => {
    const mockTemplateWithoutPrefabs: VisualTemplateProject = {
      id: 'template-1',
      owner: 'user:default/testuser',
      metadata: { name: 'Test Template' },
      nodes: [
        {
          id: 'node-1',
          type: 'step',
          position: { x: 0, y: 0 },
          data: { actionId: 'test:action' },
        },
      ] as VisualTemplateProject['nodes'],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      updated: '2024-01-01T00:00:00Z',
      deleted: false,
      published_at: null,
    };

    const mockTemplateWithPrefabs: VisualTemplateProject = {
      ...mockTemplateWithoutPrefabs,
      nodes: [
        {
          id: 'node-1',
          type: 'step',
          position: { x: 0, y: 0 },
          data: {
            type: 'step' as const,
            actionId: 'test:action',
            formData: {},
            if: '',
            onChange: () => {},
          },
        },
        {
          id: 'prefab-node-1',
          type: 'prefab',
          position: { x: 100, y: 100 },
          data: { type: 'prefab' as const, id: 'prefab-123' },
        },
        {
          id: 'prefab-node-2',
          type: 'prefab',
          position: { x: 200, y: 200 },
          data: { type: 'prefab' as const, id: 'prefab-456' },
        },
      ] as VisualTemplateProject['nodes'],
    };

    describe('set method', () => {
      beforeEach(() => {
        // Mock database operations
        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: jest.fn().mockReturnThis(),
              onConflict: jest.fn().mockReturnThis(),
              merge: jest.fn().mockResolvedValue(undefined),
              where: jest.fn().mockReturnThis(),
              whereIn: jest.fn().mockReturnThis(),
              delete: jest.fn().mockResolvedValue(1),
              ignore: jest.fn().mockResolvedValue(undefined),
            };
            return callback(mockTrx);
          });
      });

      it('should create prefab connections for new template with prefabs', async () => {
        // Mock that template doesn't exist yet (new template)
        jest.spyOn(store, 'get').mockRejectedValue(new Error('Not found'));

        const mockInsert = jest.fn().mockReturnThis();
        const mockOnConflict = jest.fn().mockReturnThis();
        const mockIgnore = jest.fn().mockResolvedValue(undefined);

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: mockInsert,
              onConflict: mockOnConflict,
              merge: jest.fn().mockResolvedValue(undefined),
              ignore: mockIgnore,
            };
            return callback(mockTrx);
          });

        await store.set(mockTemplateWithPrefabs);

        // Verify prefab connections were created
        expect(mockInsert).toHaveBeenCalledWith([
          {
            id: 'prefab-123-template-1',
            prefab_id: 'prefab-123',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
          {
            id: 'prefab-456-template-1',
            prefab_id: 'prefab-456',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
        ]);
      });

      it('should add new prefab connections when prefabs are added to existing template', async () => {
        // Mock existing template without prefabs
        jest.spyOn(store, 'get').mockResolvedValue(mockTemplateWithoutPrefabs);

        const mockInsert = jest.fn().mockReturnThis();
        const mockDelete = jest.fn().mockResolvedValue(0);

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: mockInsert,
              onConflict: jest.fn().mockReturnThis(),
              merge: jest.fn().mockResolvedValue(undefined),
              where: jest.fn().mockReturnThis(),
              whereIn: jest.fn().mockReturnThis(),
              delete: mockDelete,
              ignore: jest.fn().mockResolvedValue(undefined),
            };
            return callback(mockTrx);
          });

        await store.set(mockTemplateWithPrefabs);

        // Should not delete any connections (no removed prefabs)
        expect(mockDelete).not.toHaveBeenCalled();

        // Should add new connections
        expect(mockInsert).toHaveBeenCalledWith([
          {
            id: 'prefab-123-template-1',
            prefab_id: 'prefab-123',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
          {
            id: 'prefab-456-template-1',
            prefab_id: 'prefab-456',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
        ]);
      });

      it('should remove prefab connections when prefabs are removed from template', async () => {
        // Mock existing template with prefabs
        jest.spyOn(store, 'get').mockResolvedValue(mockTemplateWithPrefabs);

        const mockDelete = jest.fn().mockResolvedValue(2);
        const mockWhere = jest.fn().mockReturnThis();
        const mockWhereIn = jest.fn().mockReturnThis();

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: jest.fn().mockReturnThis(),
              onConflict: jest.fn().mockReturnThis(),
              merge: jest.fn().mockResolvedValue(undefined),
              where: mockWhere,
              whereIn: mockWhereIn,
              delete: mockDelete,
            };
            return callback(mockTrx);
          });

        // Update to template without prefabs
        await store.set(mockTemplateWithoutPrefabs);

        // Should delete removed prefab connections
        expect(mockWhere).toHaveBeenCalledWith('template_id', 'template-1');
        expect(mockWhereIn).toHaveBeenCalledWith('prefab_id', [
          'prefab-123',
          'prefab-456',
        ]);
        expect(mockDelete).toHaveBeenCalled();
      });

      it('should handle partial prefab updates (some added, some removed)', async () => {
        // Mock existing template with one prefab
        const existingTemplateWithOnePrefab: VisualTemplateProject = {
          ...mockTemplateWithoutPrefabs,
          nodes: [
            ...mockTemplateWithoutPrefabs.nodes,
            {
              id: 'prefab-node-old',
              type: 'prefab',
              position: { x: 50, y: 50 },
              data: { type: 'prefab' as const, id: 'prefab-old' },
            },
          ] as VisualTemplateProject['nodes'],
        };

        jest
          .spyOn(store, 'get')
          .mockResolvedValue(existingTemplateWithOnePrefab);

        const mockInsert = jest.fn().mockReturnThis();
        const mockDelete = jest.fn().mockResolvedValue(1);
        const mockWhere = jest.fn().mockReturnThis();
        const mockWhereIn = jest.fn().mockReturnThis();

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: mockInsert,
              onConflict: jest.fn().mockReturnThis(),
              merge: jest.fn().mockResolvedValue(undefined),
              where: mockWhere,
              whereIn: mockWhereIn,
              delete: mockDelete,
              ignore: jest.fn().mockResolvedValue(undefined),
            };
            return callback(mockTrx);
          });

        await store.set(mockTemplateWithPrefabs);

        // Should delete old prefab connection
        expect(mockWhere).toHaveBeenCalledWith('template_id', 'template-1');
        expect(mockWhereIn).toHaveBeenCalledWith('prefab_id', ['prefab-old']);
        expect(mockDelete).toHaveBeenCalled();

        // Should add new prefab connections
        expect(mockInsert).toHaveBeenCalledWith([
          {
            id: 'prefab-123-template-1',
            prefab_id: 'prefab-123',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
          {
            id: 'prefab-456-template-1',
            prefab_id: 'prefab-456',
            template_id: 'template-1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
        ]);
      });

      it('should handle templates with no prefab changes', async () => {
        // Mock existing template with same prefabs
        jest.spyOn(store, 'get').mockResolvedValue(mockTemplateWithPrefabs);

        const mockInsert = jest.fn();
        const mockDelete = jest.fn();

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              insert: mockInsert,
              onConflict: jest.fn().mockReturnThis(),
              merge: jest.fn().mockResolvedValue(undefined),
              where: jest.fn().mockReturnThis(),
              whereIn: jest.fn().mockReturnThis(),
              delete: mockDelete,
            };
            return callback(mockTrx);
          });

        await store.set(mockTemplateWithPrefabs);

        // Should not insert or delete any connections
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockDelete).not.toHaveBeenCalled();
      });
    });

    describe('hardDelete method', () => {
      it('should delete prefab connections when templates are hard deleted', async () => {
        const mockDelete = jest.fn().mockResolvedValue(2);
        const mockWhereIn = jest.fn().mockReturnThis();

        jest
          .spyOn(knex, 'transaction')
          .mockImplementation(async (callback: any) => {
            const mockTrx = {
              ...knex,
              whereIn: mockWhereIn,
              delete: mockDelete,
            };
            return callback(mockTrx);
          });

        await store.hardDelete(['template-1', 'template-2']);

        // Should delete prefab connections first
        expect(mockWhereIn).toHaveBeenCalledWith('template_id', [
          'template-1',
          'template-2',
        ]);
        expect(mockDelete).toHaveBeenCalledTimes(2); // Once for connections, once for templates
      });
    });

    describe('helper methods', () => {
      describe('extractPrefabIds', () => {
        it('should extract prefab IDs from nodes array', () => {
          const nodes = [
            { id: 'node-1', type: 'step', data: {} },
            { id: 'node-2', type: 'prefab', data: { id: 'prefab-123' } },
            { id: 'node-3', type: 'property', data: {} },
            { id: 'node-4', type: 'prefab', data: { id: 'prefab-456' } },
            { id: 'node-5', type: 'prefab', data: {} }, // No ID
          ];

          // Access private method for testing
          const result = (store as any).extractPrefabIds(nodes);

          expect(result).toEqual(['prefab-123', 'prefab-456']);
        });

        it('should return empty array when no prefab nodes exist', () => {
          const nodes = [
            { id: 'node-1', type: 'step', data: {} },
            { id: 'node-2', type: 'property', data: {} },
          ];

          const result = (store as any).extractPrefabIds(nodes);

          expect(result).toEqual([]);
        });

        it('should handle empty nodes array', () => {
          const result = (store as any).extractPrefabIds([]);
          expect(result).toEqual([]);
        });
      });

      describe('generateConnectionId', () => {
        it('should generate consistent connection ID', () => {
          const result = (store as any).generateConnectionId(
            'prefab-123',
            'template-456',
          );
          expect(result).toBe('prefab-123-template-456');
        });

        it('should generate different IDs for different inputs', () => {
          const result1 = (store as any).generateConnectionId(
            'prefab-1',
            'template-1',
          );
          const result2 = (store as any).generateConnectionId(
            'prefab-2',
            'template-1',
          );
          const result3 = (store as any).generateConnectionId(
            'prefab-1',
            'template-2',
          );

          expect(result1).toBe('prefab-1-template-1');
          expect(result2).toBe('prefab-2-template-1');
          expect(result3).toBe('prefab-1-template-2');
          expect(result1).not.toBe(result2);
          expect(result1).not.toBe(result3);
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully during prefab connection management', async () => {
      const mockTemplate: VisualTemplateProject = {
        id: 'template-1',
        owner: 'user:default/testuser',
        metadata: { name: 'Test Template' },
        nodes: [
          {
            id: 'prefab-node-1',
            type: 'prefab',
            position: { x: 0, y: 0 },
            data: { type: 'prefab' as const, id: 'prefab-123' },
          },
        ] as unknown as VisualTemplateProject['nodes'],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        updated: '2024-01-01T00:00:00Z',
        deleted: false,
        published_at: null,
      };

      // Mock that template doesn't exist
      jest.spyOn(store, 'get').mockRejectedValue(new Error('Not found'));

      // Mock transaction failure
      jest
        .spyOn(knex, 'transaction')
        .mockRejectedValue(new Error('Database error'));

      await expect(store.set(mockTemplate)).rejects.toThrow('Database error');
    });

    it('should handle missing prefab data gracefully', async () => {
      const nodesWithMissingData = [
        { id: 'node-1', type: 'prefab', data: null },
        { id: 'node-2', type: 'prefab', data: undefined },
        { id: 'node-3', type: 'prefab', data: { id: 'valid-prefab' } },
      ];

      const result = (store as any).extractPrefabIds(nodesWithMissingData);
      expect(result).toEqual(['valid-prefab']);
    });
  });
});
