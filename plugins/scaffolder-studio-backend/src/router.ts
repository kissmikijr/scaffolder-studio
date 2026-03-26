import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod';
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
import {
  HttpAuthService,
  PermissionsService,
} from '@backstage/backend-plugin-api';

import { ScaffolderStudioService } from './service/ScaffolderVisualTemplateEditorService';
import { PrefabService } from './service/PrefabService';
import { PrefabLibraryService } from './service/PrefabLibraryService';
import {
  scaffolderStudioPermanentlyDeletePermission,
  scaffolderStudioPrefabCreatePermission,
  scaffolderStudioPrefabDeletePermission,
  scaffolderStudioPrefabPublishPermission,
  scaffolderStudioPrefabReadPermission,
  scaffolderStudioPublishPermission,
  scaffolderStudioUnpublishPermission,
  VisualTemplateProject,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { AuthorizeResult } from '@backstage/plugin-permission-common';

const restoreSchema = z.object({
  ids: z.array(z.string()),
});
const deleteHardSchema = z.object({
  ids: z.array(z.string()),
});
const publishSchema = z.object({
  scaffolderTemplate: z.string(),
  publisherId: z.string().optional(),
});
const unpublishSchema = z.object({
  scaffolderTemplate: z.string(),
  publisherId: z.string().optional(),
});
const importTemplateSchema = z.object({
  template: z.record(z.string(), z.any()),
  id: z.string(),
});
const lintTemplateSchema = z.object({
  templateId: z.string().optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  options: z
    .object({
      includeRuleMetadata: z.boolean().optional(),
    })
    .optional(),
});

export async function createRouter({
  httpAuth,
  scaffolderStudioService,
  prefabService,
  prefabLibraryService,
  permissions,
}: {
  httpAuth: HttpAuthService;
  scaffolderStudioService: ScaffolderStudioService;
  prefabService: PrefabService;
  prefabLibraryService: PrefabLibraryService;
  permissions: PermissionsService;
}): Promise<express.Router> {
  const { visualTemplateProjectStore, publishedTemplatesStore } =
    scaffolderStudioService.stores;
  const router = Router();
  router.use((req, res, next) => {
    if (req.body !== undefined) {
      next();
      return;
    }
    express.json()(req, res, next);
  });

  const projectSchema = z.object({
    id: z.string(),
    metadata: z.preprocess(
      val => (typeof val === 'string' ? JSON.parse(val) : val),
      z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
    ),
    viewport: z.preprocess(
      val => (typeof val === 'string' ? JSON.parse(val) : val),
      z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      }),
    ),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    updated: z.string(),
    published_at: z.string().optional().nullable(),
  });

  router.get('/templates', async (req, res) => {
    const trashed = req.query.trashed === 'true';

    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const owner = credentials.principal.userEntityRef;

    const result = await visualTemplateProjectStore.list({ trashed, owner });
    res.json(result);
  });
  router.get('/templates/published', async (_req, res) => {
    const result = await publishedTemplatesStore.list();
    res.json(result);
  });

  router.get('/templates/:id', async (req, res) => {
    const result = await visualTemplateProjectStore.get(req.params.id);
    res.json(result);
  });
  router.post('/templates/delete/hard', async (req, res) => {
    // const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPermanentlyDeletePermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }
    const parsed = deleteHardSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    await visualTemplateProjectStore.hardDelete(parsed.data.ids);
    res.status(204).send();
  });

  router.post('/templates/trash', async (req, res) => {
    // const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const parsed = z.object({ ids: z.array(z.string()) }).safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    await visualTemplateProjectStore.delete(parsed.data.ids);
    res.status(204).send();
  });

  router.post('/templates/restore', async (req, res) => {
    const parsed = restoreSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    // const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    await visualTemplateProjectStore.restore(parsed.data.ids);
    res.status(200).send();
  });

  router.post('/templates', async (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const owner = credentials.principal.userEntityRef;

    try {
      await visualTemplateProjectStore.get(parsed.data.id);
      throw new InputError(`Template ${parsed.data.id} already exists.`);
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }

    const nodesWithDefaultTemplate =
      parsed.data.nodes.length > 0
        ? parsed.data.nodes
        : [
            {
              id: `${parsed.data.id}-template`,
              type: 'template',
              position: { x: 100, y: 100 },
              data: {
                nodeType: 'template',
                name: 'Untitled',
                owner: '',
                description: 'This is an example template',
                annotations: {},
                spec: { type: 'component' },
              },
            },
          ];

    await scaffolderStudioService.createOrUpdateTemplate({
      data: {
        ...parsed.data,
        nodes: nodesWithDefaultTemplate,
        owner,
        metadata: {
          name: parsed.data.metadata?.name || '',
          description: parsed.data.metadata?.description || '',
        },
        published_at: parsed.data.published_at ?? null,
      },
    });

    res.status(201).send();
  });

  router.put('/templates/:id', async (req, res) => {
    const parsed = projectSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const owner = credentials.principal.userEntityRef;

    await visualTemplateProjectStore.get(req.params.id);

    await scaffolderStudioService.createOrUpdateTemplate({
      data: {
        ...parsed.data,
        owner,
        metadata: {
          name: parsed.data.metadata?.name || '',
          description: parsed.data.metadata?.description || '',
        },
        published_at: parsed.data.published_at ?? null,
      },
    });

    res.status(204).send();
  });

  router.get('/actions', async (_req, res) => {
    const actions = await scaffolderStudioService.getActions();
    res.json(actions);
  });

  // Dry run inputs persistence endpoints
  router.get('/templates/:id/dry-run-inputs', async (req, res) => {
    const result = await visualTemplateProjectStore.getDryRunInputs(
      req.params.id,
    );
    res.json(result || {});
  });

  router.put('/templates/:id/dry-run-inputs', async (req, res) => {
    const dryRunInputsSchema = z.object({
      inputs: z.record(z.string(), z.unknown()),
    });
    const parsed = dryRunInputsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    await visualTemplateProjectStore.setDryRunInputs(
      req.params.id,
      parsed.data.inputs,
    );
    res.status(204).send();
  });

  router.get('/publishers', async (_req, res) => {
    const publishers = await scaffolderStudioService.getPublishers();
    res.json(publishers);
  });

  router.post('/templates/:id/publish', async (req, res) => {
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const owner = credentials.principal.userEntityRef;
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPublishPermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const template = await visualTemplateProjectStore.get(req.params.id);
    if (!template) {
      throw new InputError('Template not found');
    }

    if (template.owner !== owner) {
      throw new InputError('Not authorized to publish this template');
    }
    try {
      await scaffolderStudioService.publishTemplate({
        visualTemplateId: req.params.id,
        publishedBy: owner,
        scaffolderTemplate: parsed.data.scaffolderTemplate,
        publisherId: parsed.data.publisherId,
      });
    } catch (error) {
      console.error(error);
      throw new InputError('Failed to publish template');
    }

    res.status(204).send();
  });
  router.post('/templates/:id/unpublish', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioUnpublishPermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const parsed = unpublishSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    await scaffolderStudioService.unpublishTemplate({
      id: req.params.id,
      scaffolderTemplate: parsed.data.scaffolderTemplate,
      publisherId: parsed.data.publisherId,
    });
    res.status(204).send();
  });
  router.post('/templates/import', async (req, res) => {
    const parsed = importTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    const data = await scaffolderStudioService.serializeScaffolderTemplate({
      template: parsed.data.template,
      actions: await scaffolderStudioService.getActions(),
    });
    const credentials = await httpAuth.credentials(req, {
      allow: ['user', 'service'],
    });
    let owner;
    if (credentials.principal.type === 'user') {
      owner = credentials.principal.userEntityRef;
    } else if (credentials.principal.type === 'service') {
      owner = credentials.principal.subject;
    }
    if (!owner) {
      throw new InputError('No owner found');
    }
    await scaffolderStudioService.createOrUpdateTemplate({
      data: {
        id: parsed.data.id,
        owner,
        nodes: data.nodes as VisualTemplateProject['nodes'],
        edges: data.edges,
        updated: new Date().toISOString(),
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        metadata: {
          name:
            ((
              (parsed.data.template as Record<string, unknown>)
                ?.metadata as Record<string, unknown>
            )?.name as string) || '',
          description:
            ((
              (parsed.data.template as Record<string, unknown>)
                ?.metadata as Record<string, unknown>
            )?.description as string) || '',
        },
        published_at: null,
      },
    });
    res.status(204).send();
  });
  router.post('/template/serialize', async (req, res) => {
    const serializeSchema = z.object({
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      sourceNodeId: z.string(),
    });
    const parsed = serializeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    const yaml = await scaffolderStudioService.nodesToYaml({
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
      sourceNodeId: parsed.data.sourceNodeId,
    });
    res.json(yaml);
  });
  router.post('/templates/lint', async (req, res) => {
    const parsed = lintTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const result = await scaffolderStudioService.lintTemplateGraph({
      templateId: parsed.data.templateId,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
    });
    res.json(result);
  });

  router.get('/prefabs', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabReadPermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }
    const result = await prefabService.list();
    res.json(result);
  });
  router.get('/prefabs/:id', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabReadPermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }
    const result = await prefabService.get(req.params.id);
    res.json(result);
  });
  router.put('/prefabs/:id', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabCreatePermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }
    const result = await prefabService.update({
      id: req.params.id,
      node: req.body.node,
      title: req.body.title,
      description: req.body.description,
    });
    res.json(result);
  });
  router.post('/prefabs', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabCreatePermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const result = await prefabService.create({
      node: req.body.node,
      owner: credentials.principal.userEntityRef,
      title: req.body.title,
      description: req.body.description,
    });
    res.json(result);
  });
  router.post('/prefabs/resolve', async (req, res) => {
    const result = await scaffolderStudioService.resolve({
      nodes: req.body.nodes,
    });
    res.json(result);
  });
  router.delete('/prefabs/:id', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabDeletePermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const result = await prefabService.delete(req.params.id);
    res.json(result);
  });

  router.get('/prefab-library/all', async (_req, res) => {
    const result = await prefabLibraryService.list();
    res.json(result);
  });

  router.get('/prefab-library/:id', async (req, res) => {
    const version = req.query.version as string | undefined;
    const result = await prefabLibraryService.get(req.params.id, version);
    res.json(result);
  });

  router.post('/prefab-library', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const owner = credentials.principal.userEntityRef;

    const decision = (
      await permissions.authorize(
        [{ permission: scaffolderStudioPrefabPublishPermission }],
        { credentials },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const result = await prefabLibraryService.create({
      prefabId: req.body.prefabId,
      owner,
    });
    res.json(result);
  });
  router.delete('/prefab-library/:id', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user'] });
    const result = await prefabLibraryService.delete({ id: req.params.id });
    res.json(result);
  });

  return router;
}
