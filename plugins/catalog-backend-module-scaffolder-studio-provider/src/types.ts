namespace ScaffolderVisualTemplateEvents {
  interface Event {
    eventKey: string;
  }

  export interface TemplatePublishedEvent extends Event {
    scaffolderTemplate: string;
  }
}
export type { ScaffolderVisualTemplateEvents };
