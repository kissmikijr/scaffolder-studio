import {
  AuthService,
  DiscoveryService,
  LoggerService,
  SchedulerService,
} from '@backstage/backend-plugin-api';
import {
  DeferredEntity,
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import {
  PublishedTemplate,
  SCAFFOLDER_STUDIO_EVENTS,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import yaml from 'js-yaml';
import { EventsService } from '@backstage/plugin-events-node';
import { ScaffolderVisualTemplateEvents } from './types';

export class ScaffolderStudioEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  constructor(
    private readonly logger: LoggerService,
    private readonly discover: DiscoveryService,
    private readonly scheduler: SchedulerService,
    private readonly events: EventsService,
    private readonly auth: AuthService,
  ) {
    this.logger = logger;
    this.discover = discover;
    this.scheduler = scheduler;
    this.events = events;
    this.auth = auth;
  }

  async getEntities() {
    this.logger.info('Providing entities');
  }

  getProviderName() {
    return 'scaffolder-studio';
  }
  async run() {
    this.logger.info('Run Scaffolder Visual Editor Entity Provider');
    if (!this.connection) {
      throw new Error('Not initalized!');
    }
    const baseUrl = await this.discover.getBaseUrl('scaffolder-studio');

    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'scaffolder-studio',
    });

    try {
      const publishedTemplatesResponse = await fetch(
        `${baseUrl}/templates/published`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (publishedTemplatesResponse.status !== 200) {
        throw new Error(
          `Failed to fetch published templates: ${publishedTemplatesResponse.statusText}`,
        );
      }
      const publishedTemplates: PublishedTemplate[] =
        await publishedTemplatesResponse.json();

      const entities: DeferredEntity[] = publishedTemplates?.map(template => {
        return {
          entity: yaml.load(template.scaffolder_template) as Entity,
        };
      });

      this.connection.applyMutation({
        type: 'full',
        entities,
      });
    } catch (error) {
      this.logger.error('Failed to fetch published templates', error as Error);
    }
  }
  async scheduleFn() {
    this.logger.info('Schedule Scaffolder Visual Editor Entity Provider');
    this.scheduler
      .createScheduledTaskRunner({
        frequency: { minutes: 60 },
        timeout: { minutes: 3 },
      })
      .run({
        id: `${this.getProviderName()}:refresh`,
        fn: async () => {
          try {
            await this.run();
          } catch (error) {
            `${this.getProviderName} refresh failed, ${error}`;
          }
        },
      });
    await this.run();
  }
  async onTemplatePublish({
    scaffolderTemplate,
  }: {
    scaffolderTemplate: string;
  }) {
    if (!this.connection) {
      this.logger.error('Not initalized!');
      return;
    }
    const entity = yaml.load(scaffolderTemplate) as Entity;
    this.connection.applyMutation({
      type: 'delta',
      added: [{ entity }],
      removed: [],
    });
  }

  async onTemplateUnpublish({
    scaffolderTemplate,
  }: {
    scaffolderTemplate: string;
  }) {
    if (!this.connection) {
      this.logger.error('Not initalized!');
      return;
    }
    const entity = yaml.load(scaffolderTemplate) as Entity;
    this.connection.applyMutation({
      type: 'delta',
      added: [],
      removed: [{ entity }],
    });
  }

  async connect(connection: EntityProviderConnection) {
    this.connection = connection;

    await this.scheduleFn();

    if (this.events) {
      await this.events.subscribe({
        id: this.getProviderName(),
        topics: [
          SCAFFOLDER_STUDIO_EVENTS.TEMPLATE_PUBLISHED,
          SCAFFOLDER_STUDIO_EVENTS.TEMPLATE_UNPUBLISHED,
        ],
        onEvent: async event => {
          this.logger.info(`Received event: ${event.topic}`);
          const payload =
            event.eventPayload as ScaffolderVisualTemplateEvents.TemplatePublishedEvent;
          switch (event.topic) {
            case SCAFFOLDER_STUDIO_EVENTS.TEMPLATE_PUBLISHED:
              await this.onTemplatePublish({
                scaffolderTemplate: payload.scaffolderTemplate,
              });
              break;
            case SCAFFOLDER_STUDIO_EVENTS.TEMPLATE_UNPUBLISHED:
              await this.onTemplateUnpublish({
                scaffolderTemplate: payload.scaffolderTemplate,
              });
              break;
          }
        },
      });
    }
  }
}
