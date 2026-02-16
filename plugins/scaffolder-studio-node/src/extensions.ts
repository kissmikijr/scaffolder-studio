import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { UIMessage, StreamTextResult } from 'ai';

export interface ScaffolderAgentInterface {
  streamText: (
    messages: UIMessage[],
    projectId: string,
    token: string,
  ) => Promise<StreamTextResult<any, any>>;
  generateConversationTitle: (content: string) => Promise<string>;
}
export interface ScaffolderAgentExtensionPoint {
  setAgent: (scaffolderAgent: ScaffolderAgentInterface) => void;
}

export const scaffolderAgentExtensionPoint =
  createExtensionPoint<ScaffolderAgentExtensionPoint>({
    id: 'scaffolder-studio-agent',
  });
