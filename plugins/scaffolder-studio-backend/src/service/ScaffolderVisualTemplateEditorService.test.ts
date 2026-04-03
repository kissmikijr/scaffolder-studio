import { ScaffolderStudioService } from './ScaffolderVisualTemplateEditorService';
import { PublisherExtension } from '../extensions/types';
import { EventsService } from '@backstage/plugin-events-node';
import yaml from 'js-yaml';
import type { TemplateLintRule } from '@kissmiklosjr/scaffolder-studio-linter';
import parseScaffolderTemplate from './parseScaffolderTemplate';

const mockEventService = {
  publish: jest.fn(),
} as unknown as EventsService;

const mockStore = {
  publish: jest.fn(),
  unpublish: jest.fn(),
  cleanup: jest.fn(),
} as any;

const mockVisualProjectStore = {
  set: jest.fn(),
  cleanup: jest.fn(),
} as any;

const mockPrefabLibraryStore = {
  get: jest.fn(),
  create: jest.fn(),
} as any;

const mockSchemaPatcher = {
  getActions: jest.fn(),
} as any;

const mockPublisher1: PublisherExtension = {
  id: 'pub-1',
  title: 'Publisher 1',
  publish: jest.fn(),
  unpublish: jest.fn(),
};

const mockPublisher2: PublisherExtension = {
  id: 'pub-2',
  title: 'Publisher 2',
  publish: jest.fn(),
};

const customLintRule: TemplateLintRule = {
  id: 'custom-test-rule',
  run(context) {
    const stepNode = context.snapshot.nodes.find(node => node.type === 'step');
    if (!stepNode) {
      return [];
    }

    return [
      {
        id: 'custom-test-rule:1',
        ruleId: 'custom-test-rule',
        code: 'custom-test-issue',
        severity: 'info',
        message: 'Custom lint rule executed.',
        nodeId: stepNode.id,
      },
    ];
  },
};

describe('ScaffolderVisualTemplateEditorService', () => {
  let service: ScaffolderStudioService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScaffolderStudioService({
      events: mockEventService,
      visualTemplateProjectStore: mockVisualProjectStore,
      publishedTemplatesStore: mockStore,
      prefabLibraryStore: mockPrefabLibraryStore,
      prefabStore: mockPrefabLibraryStore,
      schemaPatcher: mockSchemaPatcher,
      publishers: [mockPublisher1, mockPublisher2],
      lintRules: [customLintRule],
    });
  });

  describe('getPublishers', () => {
    it('should return list of publishers', async () => {
      const publishers = await service.getPublishers();
      expect(publishers).toHaveLength(2);
      expect(publishers).toEqual([
        { id: 'pub-1', title: 'Publisher 1' },
        { id: 'pub-2', title: 'Publisher 2' },
      ]);
    });
  });

  describe('publishTemplate', () => {
    it('should use the default publisher (first one) if no publisherId provided', async () => {
      await service.publishTemplate({
        visualTemplateId: 'id-1',
        publishedBy: 'user:default/me',
        scaffolderTemplate: 'yaml',
      });

      expect(mockStore.publish).toHaveBeenCalledWith({
        visualTemplateId: 'id-1',
        publishedBy: 'user:default/me',
        scaffolderTemplate: 'yaml',
      });
      expect(mockPublisher1.publish).toHaveBeenCalledWith({
        visualTemplateId: 'id-1',
        scaffolderTemplate: 'yaml',
        user: 'user:default/me',
        options: undefined,
      });
      expect(mockPublisher2.publish).not.toHaveBeenCalled();
    });

    it('should use the specified publisher', async () => {
      await service.publishTemplate({
        visualTemplateId: 'id-1',
        publishedBy: 'user:default/me',
        scaffolderTemplate: 'yaml',
        publisherId: 'pub-2',
        options: { foo: 'bar' },
      });

      expect(mockPublisher1.publish).not.toHaveBeenCalled();
      expect(mockPublisher2.publish).toHaveBeenCalledWith({
        visualTemplateId: 'id-1',
        scaffolderTemplate: 'yaml',
        user: 'user:default/me',
        options: { foo: 'bar' },
      });
    });

    it('should throw if publisher not found', async () => {
      await expect(
        service.publishTemplate({
          visualTemplateId: 'id-1',
          publishedBy: 'user:default/me',
          scaffolderTemplate: 'yaml',
          publisherId: 'unknown',
        }),
      ).rejects.toThrow('Publisher with id unknown not found');
    });
  });

  describe('unpublishTemplate', () => {
    it('should use the specified publisher to unpublish', async () => {
      await service.unpublishTemplate({
        id: 'id-1',
        scaffolderTemplate: 'yaml',
        publisherId: 'pub-1',
      });

      expect(mockStore.unpublish).toHaveBeenCalledWith('id-1');
      expect(mockPublisher1.unpublish).toHaveBeenCalled();
    });
  });

  describe('prefab step id overrides', () => {
    it('applies stepIdOverride when resolving a prefab step instance', async () => {
      mockPrefabLibraryStore.get.mockResolvedValue({
        id: 'prefab-1',
        node: {
          id: 'stored-prefab-step',
          type: 'step',
          position: { x: 0, y: 0 },
          data: {
            type: 'step',
            stepId: 'publish',
            name: 'Publish',
            if: '',
            actionId: 'debug:log',
            formData: {},
          },
        },
      });

      const resolved = await service.resolve({
        nodes: [
          {
            id: 'prefab-instance-node',
            type: 'prefab',
            position: { x: 100, y: 120 },
            data: {
              type: 'prefab',
              id: 'prefab-1',
              stepIdOverride: 'publish-1',
              stepNameOverride: 'Publish Copy',
            },
          } as any,
        ],
      });

      expect(resolved).toEqual([
        expect.objectContaining({
          id: 'prefab-instance-node',
          type: 'step',
          position: { x: 100, y: 120 },
          data: expect.objectContaining({
            stepId: 'publish-1',
            name: 'Publish Copy',
          }),
        }),
      ]);
    });

    it('serializes distinct step ids for a normal step and a colliding prefab step instance', async () => {
      mockPrefabLibraryStore.get.mockResolvedValue({
        id: 'prefab-1',
        node: {
          id: 'stored-prefab-step',
          type: 'step',
          position: { x: 0, y: 0 },
          data: {
            type: 'step',
            stepId: 'publish',
            name: 'Publish',
            if: '',
            actionId: 'debug:log',
            formData: {},
          },
        },
      });

      const yamlOutput = await service.nodesToYaml({
        nodes: [
          {
            id: 'template-node',
            type: 'template',
            position: { x: 0, y: 0 },
            data: {
              nodeType: 'template',
              name: 'Example Template',
              owner: 'guest',
              description: 'desc',
              annotations: {},
              spec: { type: 'service' },
            },
          },
          {
            id: 'step-1',
            type: 'step',
            position: { x: 200, y: 0 },
            data: {
              type: 'step',
              stepId: 'publish',
              name: 'publish',
              if: '',
              actionId: 'debug:log',
              formData: {},
            },
          },
          {
            id: 'prefab-instance-node',
            type: 'prefab',
            position: { x: 400, y: 0 },
            data: {
              type: 'prefab',
              id: 'prefab-1',
              stepIdOverride: 'publish-1',
            },
          } as any,
        ] as any,
        edges: [
          { id: 'e-1', source: 'template-node', target: 'step-1' },
          { id: 'e-2', source: 'step-1', target: 'prefab-instance-node' },
        ] as any,
        sourceNodeId: 'template-node',
      });

      const parsed = yaml.load(yamlOutput) as any;

      expect(parsed.spec.steps.map((step: any) => step.id)).toEqual([
        'publish',
        'publish-1',
      ]);
    });
  });

  describe('lintTemplateGraph', () => {
    it('returns an empty result when linting is disabled', async () => {
      service = new ScaffolderStudioService({
        events: mockEventService,
        visualTemplateProjectStore: mockVisualProjectStore,
        publishedTemplatesStore: mockStore,
        prefabLibraryStore: mockPrefabLibraryStore,
        prefabStore: mockPrefabLibraryStore,
        schemaPatcher: mockSchemaPatcher,
        publishers: [mockPublisher1, mockPublisher2],
        lintRules: [customLintRule],
        lintEnabled: false,
      });

      const result = await service.lintTemplateGraph({
        nodes: [
          {
            id: 'step-1',
            type: 'step',
            position: { x: 100, y: 0 },
            data: {
              type: 'step',
              stepId: 'publish',
              name: 'Publish',
              if: '',
              actionId: 'debug:log',
              formData: {},
            },
          },
        ] as any,
        edges: [] as any,
      });

      expect(result.issues).toEqual([]);
      expect(result.summary).toEqual({
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      });
      expect(result.meta.rulesVersion).toBe('1');
      expect(mockSchemaPatcher.getActions).not.toHaveBeenCalled();
    });

    it('resolves prefabs, enriches step schemas from actions, and returns lint issues', async () => {
      mockSchemaPatcher.getActions.mockResolvedValue([
        {
          id: 'debug:log',
          schema: {
            input: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string' },
              },
            },
            output: {
              type: 'object',
              properties: {
                result: { type: 'string' },
              },
            },
          },
        },
      ]);

      const result = await service.lintTemplateGraph({
        nodes: [
          {
            id: 'property-1',
            type: 'property',
            position: { x: 0, y: 0 },
            data: {
              name: 'repoUrl',
              variableType: 'string',
              onChange: jest.fn(),
            },
          },
          {
            id: 'step-1',
            type: 'step',
            position: { x: 100, y: 0 },
            data: {
              type: 'step',
              stepId: 'publish',
              name: 'Publish',
              if: '',
              actionId: 'debug:log',
              formData: {},
            },
          },
        ] as any,
        edges: [] as any,
      });

      expect(result.summary.warningCount).toBeGreaterThan(0);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unused-parameter',
            nodeId: 'property-1',
          }),
          expect.objectContaining({
            code: 'missing-required-input',
            nodeId: 'step-1',
            fieldPath: 'message',
          }),
          expect.objectContaining({
            code: 'custom-test-issue',
            nodeId: 'step-1',
            severity: 'info',
          }),
        ]),
      );
    });

    it('attaches missing required input issues to the correct parsed step node', async () => {
      mockSchemaPatcher.getActions.mockResolvedValue([
        {
          id: 'debug:log',
          schema: {
            input: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string' },
              },
            },
            output: {
              type: 'object',
              properties: {},
            },
          },
        },
      ]);

      const parsed = parseScaffolderTemplate(
        yaml.load(`
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: alma
  description: This is an example template
spec:
  owner: guest
  type: component
  parameters:
    - title: Example Title
      required: []
      properties:
        property1:
          type: string
  steps:
    - id: debug-log
      name: debug-log
      if: \${{  }}
      action: debug:log
      input: {}
    - id: debug-log-1
      name: debug-log-1
      action: debug:log
      input:
        message: alma1234e \${{parameters.property1 | upper}}
`) as object,
        await service.getActions(),
      );

      const stepNodes = parsed.nodes.filter(
        (node: any) => node.type === 'step',
      );
      expect(stepNodes).toHaveLength(2);

      const result = await service.lintTemplateGraph({
        nodes: parsed.nodes as any,
        edges: parsed.edges as any,
      });

      const missingMessageIssue = result.issues.find(
        issue => issue.code === 'missing-required-input',
      );

      expect(missingMessageIssue?.nodeId).toBe(stepNodes[0].id);
      expect(missingMessageIssue?.nodeId).not.toBe(stepNodes[1].id);
    });
  });
});
