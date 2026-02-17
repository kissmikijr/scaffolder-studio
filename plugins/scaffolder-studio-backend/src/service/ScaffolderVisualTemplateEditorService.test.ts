import { ScaffolderStudioService } from './ScaffolderVisualTemplateEditorService';
import { PublisherExtension } from '../extensions/types';
import { EventsService } from '@backstage/plugin-events-node';

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

describe('ScaffolderVisualTemplateEditorService', () => {
  let service: ScaffolderStudioService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScaffolderStudioService({
      events: mockEventService,
      visualTemplateProjectStore: mockVisualProjectStore,
      publishedTemplatesStore: mockStore,
      prefabLibraryStore: mockPrefabLibraryStore,
      schemaPatcher: mockSchemaPatcher,
      publishers: [mockPublisher1, mockPublisher2],
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
});
