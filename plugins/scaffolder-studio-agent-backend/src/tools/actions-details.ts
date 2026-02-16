import { z } from 'zod';

interface ScaffolderAction {
  id: string;
  description?: string;
  schema?: {
    input?: {
      type: string;
      properties: Record<string, unknown>;
    };
    output?: {
      type: string;
      properties: Record<string, unknown>;
    };
  };
}

const schema = z.object({
  actionId: z
    .string()
    .describe('The ID of the scaffolder action to get details for'),
});

export const actionDetails = (actions: ScaffolderAction[]) => ({
  description: 'Get details about a scaffolder action',
  parameters: schema,
  execute: async ({ actionId }: z.infer<typeof schema>) => {
    return actions.find(action => action.id === actionId);
  },
});
