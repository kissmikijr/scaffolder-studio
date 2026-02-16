import { EventsService } from '@backstage/plugin-events-node';
import { PublisherExtension, PublishContext, UnpublishContext } from './types';
import { SCAFFOLDER_VISUAL_EDITOR_EVENTS } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export class EventPublisherExtension implements PublisherExtension {
  readonly id = 'event-publisher';
  readonly title = 'Publish to Catalog (Event)';

  constructor(private readonly events: EventsService) {}

  async publish({ scaffolderTemplate }: PublishContext): Promise<void> {
    await this.events.publish({
      topic: SCAFFOLDER_VISUAL_EDITOR_EVENTS.TEMPLATE_PUBLISHED,
      eventPayload: {
        scaffolderTemplate,
      },
    });
  }

  async unpublish({ scaffolderTemplate }: UnpublishContext): Promise<void> {
    await this.events.publish({
      topic: SCAFFOLDER_VISUAL_EDITOR_EVENTS.TEMPLATE_UNPUBLISHED,
      eventPayload: {
        scaffolderTemplate,
      },
    });
  }
}
