import express from 'express';
import Router from 'express-promise-router';
import { ScaffolderAgentServiceInterface } from './service/ScaffolderAgentService';
import { AuthService, HttpAuthService } from '@backstage/backend-plugin-api';
import { ScaffolderAgentInterface } from '@kissmiklosjr/plugin-scaffolder-studio-agent-node';

export async function createRouter({
  scaffolderAgent,
  scaffolderAgentService,
  httpAuth,
  auth,
}: {
  scaffolderAgent: ScaffolderAgentInterface;
  scaffolderAgentService: ScaffolderAgentServiceInterface;
  httpAuth: HttpAuthService;
  auth: AuthService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.post('/chat/message', async (req, res) => {
    try {
      const { messages, id } = req.body;

      const messageWithMetadata = messages[0];
      const visualTemplateId = messageWithMetadata?.metadata?.id;
      let title: string | undefined = messageWithMetadata?.metadata?.title;
      if (!title || title === 'New Chat') {
        title = await scaffolderAgent.generateConversationTitle(
          messages[0].parts[0].text,
        );
      }
      const credentials = await httpAuth.credentials(req);
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'scaffolder-studio',
      });

      const result = await scaffolderAgent.streamText(
        messages,
        messageWithMetadata?.metadata?.id,
        token,
      );

      result.pipeUIMessageStreamToResponse(res, {
        originalMessages: messages,
        onFinish: ({ responseMessage }) => {
          scaffolderAgentService.saveConversation({
            id,
            messages: [...messages, responseMessage],
            visual_template_id: visualTemplateId,
            title,
          });
        },
      });
    } catch (error) {
      console.error('Error in chat message handler:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  router.get('/:visualTemplateId/conversations/:id', async (req, res) => {
    const { id, visualTemplateId } = req.params;
    let conversation = await scaffolderAgentService.getConversation({
      conversationId: id,
      visualTemplateId,
    });
    if (!conversation) {
      conversation = await scaffolderAgentService.saveConversation({
        id,
        messages: [],
        visual_template_id: visualTemplateId,
        title: 'New Chat',
      });
    }
    res.json(conversation);
  });
  router.get('/:visualTemplateId/conversations', async (req, res) => {
    const { visualTemplateId } = req.params;
    const conversations = await scaffolderAgentService.getAllConversations({
      visualTemplateId,
    });
    res.json(conversations);
  });

  router.delete('/conversations/:id', async (req, res) => {
    const { id } = req.params;
    await scaffolderAgentService.deleteConversation(id);
    res.json({ success: true });
  });

  return router;
}
