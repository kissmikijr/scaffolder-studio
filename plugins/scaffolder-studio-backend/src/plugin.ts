import {
  coreServices,
  createBackendPlugin,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import {
  DatabasePublishedTemplatesStore,
  DatabaseVisualTemplateProjectStore,
} from './database';
import { SchemaPatcher } from './SchemaPatcher/SchemaPatcher';
import { eventsServiceRef } from '@backstage/plugin-events-node';
import { ScaffolderStudioService } from './service/ScaffolderVisualTemplateEditorService';
import { PrefabService } from './service/PrefabService';
import { DatabasePrefabStore } from './database/DatabasePrefabStore';
import { DatabasePrefabLibraryStore } from './database/DatabasePrefabLibraryStore';
import { PrefabLibraryService } from './service/PrefabLibraryService';
import { scaffolderStudioPublisherExtensionPoint } from './extensions/alpha';
import { PublisherExtension } from './extensions/types';

export const scaffolderStudioServiceRef =
  createServiceRef<ScaffolderStudioService>({
    id: 'scaffolder-studio',
  });

export default createBackendPlugin({
  pluginId: 'scaffolder-studio',
  register(env) {
    const publishers: PublisherExtension[] = [];

    env.registerExtensionPoint(scaffolderStudioPublisherExtensionPoint, {
      addPublisher(publisher) {
        publishers.push(publisher);
      },
    });

    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        rootLifecycle: coreServices.rootLifecycle,
        database: coreServices.database,
        permissions: coreServices.permissions,
        events: eventsServiceRef,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        config: coreServices.rootConfig,
      },
      async init({
        logger,
        httpAuth,
        httpRouter,
        rootLifecycle,
        database,
        permissions,
        events,
        discovery,
        auth,
        config,
      }) {
        logger.info('Initializing editorPlugin backend plugin');

        const schemaPatcher = await SchemaPatcher.init(discovery, auth, config);
        const visualTemplateProjectStore =
          await DatabaseVisualTemplateProjectStore.create({
            database,
          });

        const publishedTemplatesStore =
          await DatabasePublishedTemplatesStore.create({
            database,
          });

        const prefabStore = await DatabasePrefabStore.create({
          database,
        });
        const prefabLibraryStore = await DatabasePrefabLibraryStore.create({
          database,
        });

        const scaffolderStudioService =
          new ScaffolderStudioService({
            events,
            visualTemplateProjectStore,
            publishedTemplatesStore,
            schemaPatcher,
            prefabLibraryStore,
            prefabStore,
            publishers: [...publishers],
          });

        // Register cleanup on shutdown
        rootLifecycle.addShutdownHook(async () => {
          logger.info('Cleaning up editor backend plugin...');
          try {
            await scaffolderStudioService.cleanup();
            logger.info('Editor backend plugin cleaned up successfully');
          } catch (error) {
            logger.error(
              'Error cleaning up editor backend plugin:',
              error as Error,
            );
          }
        });

        const prefabService = new PrefabService({
          prefabStore: await DatabasePrefabStore.create({
            database,
          }),
        });
        const prefabLibraryService = new PrefabLibraryService({
          prefabLibraryStore: await DatabasePrefabLibraryStore.create({
            database,
          }),
        });

        // Use the stores from the service instead of creating duplicates
        httpRouter.use(
          await createRouter({
            httpAuth,
            scaffolderStudioService,
            prefabService,
            prefabLibraryService,
            permissions,
          }),
        );
      },
    });
  },
});
