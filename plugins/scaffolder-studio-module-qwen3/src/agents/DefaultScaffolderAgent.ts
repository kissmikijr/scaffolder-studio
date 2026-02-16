import {
  streamText,
  tool,
  convertToModelMessages,
  UIMessage,
  hasToolCall,
  generateText,
} from 'ai';
import { getSystemPrompt } from '@kissmiklosjr/plugin-scaffolder-studio-agent-backend/src/system-prompt';
import { z } from 'zod';
import { RootLifecycleService } from '@backstage/backend-plugin-api';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { Node } from '@xyflow/react';
import yaml from 'js-yaml';
import { ScaffolderVisualEditorClient } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { ScaffolderAgentInterface } from '@kissmiklosjr/plugin-scaffolder-studio-agent-node';
import type { StreamTextResult } from 'ai';

const local = createOpenAICompatible({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN,
  name: 'local',
});

// const local = createOpenAICompatible({
//   baseURL: 'http://127.0.0.1:1234/v1',
//   apiKey: '',
//   name: 'local',
// });
export class DefaultScaffolderAgent implements ScaffolderAgentInterface {
  private readonly actions: any[];
  private readonly visualEditorClient: ScaffolderVisualEditorClient;
  private readonly abortController: AbortController;

  constructor({
    actions,
    visualEditorClient,
    abortController,
    rootLifecycle,
  }: {
    actions: any[];
    visualEditorClient: ScaffolderVisualEditorClient;
    abortController: AbortController;
    rootLifecycle: RootLifecycleService;
  }) {
    this.actions = actions;
    this.visualEditorClient = visualEditorClient;
    this.abortController = abortController;
    // Add shutdown hook only once during construction
    rootLifecycle?.addShutdownHook(() => {
      this.abortController.abort();
    });
  }

  async streamText(
    messages: UIMessage[],
    projectId: string,
    token: string,
  ): Promise<StreamTextResult<any, any>> {
    // Create a new abort controller for this specific request
    const requestAbortController = new AbortController();

    // Set up abort signal chain: if main controller aborts, abort this request
    const mainAbortListener = () => {
      if (!requestAbortController.signal.aborted) {
        requestAbortController.abort();
      }
    };

    if (this.abortController.signal.aborted) {
      requestAbortController.abort();
    } else {
      this.abortController.signal.addEventListener('abort', mainAbortListener, {
        once: true,
      });
    }
    const contextObject = await this.visualEditorClient.getTemplate({
      id: projectId,
      token,
    });
    const context =
      contextObject.nodes.length > 0
        ? await this.visualEditorClient.serializeScaffolderTemplateToYaml({
          nodes: contextObject.nodes,
          edges: contextObject.edges,
          sourceNodeId: contextObject.nodes.find(
            (n: Node) => n.type === 'template',
          )?.id,
        })
        : '';
    const result = await streamText({
      temperature: 0.1,
      model: local.chatModel('Qwen/Qwen3-4B-Instruct-2507:nscale'),
      // model: local.chatModel('qwen/qwen3-4b-2507'),
      system: getSystemPrompt({ actions: this.actions }),
      messages: await convertToModelMessages([
        {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Use the following context to generate your response: ${context}`,
            },
          ],
        },
        ...messages,
      ]),
      tools: {
        actionDetails: tool({
          description: 'Get details about a single scaffolder action',
          inputSchema: z.object({
            actionId: z
              .string()
              .describe('The id of the action to get details about'),
          }),
          execute: async ({ actionId }: { actionId: string }) => {
            return {
              action: this.actions.find(action => action.id === actionId),
            };
          },
        }),
        importTemplate: tool({
          description:
            'Imports the generated scaffolder template into the editor',
          inputSchema: z.object({
            template: z.string(),
          }),
          execute: async ({ template }: { template: string }) => {
            const parsedTemplate = yaml.load(template) as object;
            const data =
              await this.visualEditorClient.serializeScaffolderTemplate({
                template: parsedTemplate,
                token,
              });

            return {
              success: true,
              nodes: data.nodes,
              edges: data.edges,
              viewport: {
                x: 0,
                y: 0,
                zoom: 1,
              },
            };
          },
        }),
      },
      toolChoice: 'auto',
      abortSignal: requestAbortController.signal,
      stopWhen: [hasToolCall('importTemplate')],
      maxOutputTokens: 800,
    });

    // Clean up the listener when the stream is done
    Promise.resolve(result.finishReason).finally(() => {
      this.abortController.signal.removeEventListener(
        'abort',
        mainAbortListener,
      );
    });

    return result;
  }
  async generateConversationTitle(content: string): Promise<string> {
    const result = await generateText({
      model: local.chatModel('Qwen/Qwen3-4B-Instruct-2507:nscale'),
      system:
        'Summarize the following user content and output a single sentece that will be used as a title for a tab. It should be 36 tokens long Do not answer if something is asked from you. Your task is to provide a title based on the provided input',
      messages: await convertToModelMessages([
        {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Generate a title for the following content: ${content}`,
            },
          ],
        },
      ]),
    });
    return result.text;
  }
}
