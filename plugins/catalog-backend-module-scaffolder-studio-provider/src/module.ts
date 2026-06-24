import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { ScaffolderStudioEntityProvider } from './EntityProvider';
import { eventsServiceRef } from '@backstage/plugin-events-node';

export const catalogModuleScaffolderStudioProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'scaffolder-studio-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        processing: catalogProcessingExtensionPoint,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        events: eventsServiceRef,
        auth: coreServices.auth,
      },
      async init({ logger, processing, discovery, scheduler, events, auth }) {
        const entityProvider = new ScaffolderStudioEntityProvider(
          logger,
          discovery,
          scheduler,
          events,
          auth,
        );
        logger.info('Registering Scaffolder Studio Entity Provider');
        processing.addEntityProvider(entityProvider);
      },
    });
  },
});
