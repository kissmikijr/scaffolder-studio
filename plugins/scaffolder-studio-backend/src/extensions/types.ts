export interface PublishContext {
  visualTemplateId: string;
  scaffolderTemplate: string;
  user: string;
  options?: Record<string, unknown>;
}

export interface UnpublishContext {
  visualTemplateId: string;
  scaffolderTemplate: string;
  user: string;
}

export interface PublisherExtension {
  id: string;
  title: string;
  publish(context: PublishContext): Promise<void>;
  unpublish?(context: UnpublishContext): Promise<void>;
}
