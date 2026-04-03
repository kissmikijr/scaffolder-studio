import { EventsService } from '@backstage/plugin-events-node';
import {
  VisualTemplateProjectStore,
  PublishedTemplatesStore,
  VisualTemplateProject,
  ScaffolderAction,
  isPrefabNode,
  isStepNode,
  applyPrefabInstanceOverridesToNode,
  serializeToYaml,
  AllNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { SchemaPatcher } from '../SchemaPatcher/SchemaPatcher';
import parseScaffolderTemplate from './parseScaffolderTemplate';
import { PrefabLibraryStore, PrefabStore } from '../database/types';
import type { Edge, Node } from '@xyflow/react';
import { PublisherExtension } from '../extensions/types';
import {
  builtinRules,
  lintTemplateGraph,
  normalizeRequestToSnapshot,
  type TemplateLintResult,
  type TemplateLintRule,
} from '@kissmiklosjr/scaffolder-studio-linter';

export class ScaffolderStudioService {
  private static readonly ENTITY_PROVIDER_PUBLISHER_ID = 'event-publisher';
  private static readonly LINT_RULES_VERSION = '1';
  private readonly visualTemplateProjectStore: VisualTemplateProjectStore;
  private readonly publishedTemplatesStore: PublishedTemplatesStore;
  private readonly prefabLibraryStore: PrefabLibraryStore;
  private readonly prefabStore: PrefabStore;
  private readonly schemaPatcher: SchemaPatcher;
  private readonly publishers: PublisherExtension[];
  private readonly lintRules: TemplateLintRule[];
  private readonly lintEnabled: boolean;

  constructor({
    visualTemplateProjectStore,
    publishedTemplatesStore,
    prefabLibraryStore,
    prefabStore,
    schemaPatcher,
    publishers,
    lintRules = [],
    lintEnabled = true,
  }: {
    events: EventsService;
    visualTemplateProjectStore: VisualTemplateProjectStore;
    publishedTemplatesStore: PublishedTemplatesStore;
    prefabLibraryStore: PrefabLibraryStore;
    prefabStore: PrefabStore;
    schemaPatcher: SchemaPatcher;
    publishers: PublisherExtension[];
    lintRules?: TemplateLintRule[];
    lintEnabled?: boolean;
  }) {
    this.visualTemplateProjectStore = visualTemplateProjectStore;
    this.publishedTemplatesStore = publishedTemplatesStore;
    this.prefabLibraryStore = prefabLibraryStore;
    this.prefabStore = prefabStore;
    this.schemaPatcher = schemaPatcher;
    this.publishers = publishers;
    this.lintRules = lintRules;
    this.lintEnabled = lintEnabled;
  }

  get stores() {
    return {
      visualTemplateProjectStore: this.visualTemplateProjectStore,
      publishedTemplatesStore: this.publishedTemplatesStore,
    };
  }

  async cleanup(): Promise<void> {
    // Clean up database connections
    if (
      this.visualTemplateProjectStore &&
      'cleanup' in this.visualTemplateProjectStore
    ) {
      await (this.visualTemplateProjectStore as any).cleanup();
    }
    if (
      this.publishedTemplatesStore &&
      'cleanup' in this.publishedTemplatesStore
    ) {
      await (this.publishedTemplatesStore as any).cleanup();
    }
  }

  async serializeScaffolderTemplate({
    template,
    actions,
  }: {
    template: object;
    actions: ScaffolderAction[];
  }) {
    const data = parseScaffolderTemplate(template, actions);
    return data;
  }
  async nodesToYaml({
    nodes,
    edges,
    sourceNodeId,
  }: {
    nodes: Node<AllNodeData>[];
    edges: Edge[];
    sourceNodeId: string;
  }) {
    const resolvedNodes = await this.resolveNodes(nodes);
    const hasEntityProviderPublisher = this.publishers.some(
      publisher =>
        publisher.id === ScaffolderStudioService.ENTITY_PROVIDER_PUBLISHER_ID,
    );

    return serializeToYaml({
      nodes: resolvedNodes,
      edges,
      sourceNodeId,
      includeManagedByAnnotations: hasEntityProviderPublisher,
    });
  }
  private async resolveNodes(
    nodes: Node<AllNodeData>[],
  ): Promise<Node<AllNodeData>[]> {
    const actualNodes: Node<AllNodeData>[] = [];
    for (const node of nodes) {
      if (isPrefabNode(node)) {
        let prefab;
        try {
          prefab = await this.prefabLibraryStore.get({
            id: node.data.id as string,
            version: node.data.version,
          });
        } catch (libraryError) {
          // If not in library, try the personal prefab store
          try {
            prefab = await this.prefabStore.get({
              id: node.data.id as string,
            });
          } catch (personalError) {
            throw new Error(
              `Prefab with id ${node.data.id} not found in library or personal store`,
            );
          }
        }

        const resolvedPrefabNode = applyPrefabInstanceOverridesToNode(
          prefab.node,
          node.data,
        );

        actualNodes.push({
          ...resolvedPrefabNode,
          id: node.id as string,
          parentId: node.parentId,
          position: node.position,
        });
      } else {
        actualNodes.push(node);
      }
    }
    return actualNodes;
  }
  async resolve({ nodes }: { nodes: Node<AllNodeData>[] }) {
    return this.resolveNodes(nodes);
  }
  async lintTemplateGraph({
    templateId,
    nodes,
    edges,
  }: {
    templateId?: string;
    nodes: Node<AllNodeData>[];
    edges: Edge[];
  }): Promise<TemplateLintResult> {
    if (!this.lintEnabled) {
      return {
        issues: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
        meta: {
          rulesVersion: ScaffolderStudioService.LINT_RULES_VERSION,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const [resolvedNodes, actions] = await Promise.all([
      this.resolveNodes(nodes),
      this.getActions(),
    ]);

    const enrichedNodes = resolvedNodes.map(node => {
      if (!isStepNode(node)) {
        return node;
      }

      const actionId = node.data.actionId;
      const actionSchema = actionId
        ? actions.find(action => action.id === actionId)?.schema
        : undefined;

      if (!actionSchema) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          schema: actionSchema,
        },
      };
    });

    return lintTemplateGraph(
      normalizeRequestToSnapshot({
        templateId,
        nodes: enrichedNodes,
        edges,
      }),
      {
        actions,
        rules: [...builtinRules, ...this.lintRules],
      },
    );
  }
  async createOrUpdateTemplate({
    data,
  }: {
    data: Omit<VisualTemplateProject, 'deleted'>;
  }) {
    await this.visualTemplateProjectStore.set(data);
  }
  async getActions() {
    const actions = await this.schemaPatcher.getActions();
    return actions;
  }
  async getPublishers() {
    return this.publishers.map(p => ({
      id: p.id,
      title: p.title,
    }));
  }

  async publishTemplate({
    visualTemplateId,
    publishedBy,
    scaffolderTemplate,
    publisherId,
    options,
  }: {
    visualTemplateId: string;
    publishedBy: string;
    scaffolderTemplate: string;
    publisherId?: string;
    options?: Record<string, unknown>;
  }) {
    let publisher: PublisherExtension | undefined;
    if (publisherId) {
      publisher = this.publishers.find(p => p.id === publisherId);
      if (!publisher) {
        throw new Error(`Publisher with id ${publisherId} not found`);
      }
    } else {
      publisher = this.publishers[0];
    }

    await this.publishedTemplatesStore.publish({
      visualTemplateId,
      publishedBy,
      scaffolderTemplate,
    });

    await publisher.publish({
      visualTemplateId,
      scaffolderTemplate,
      user: publishedBy,
      options,
    });
  }

  async unpublishTemplate({
    id,
    scaffolderTemplate,
    publisherId,
  }: {
    id: string;
    scaffolderTemplate: string;
    publisherId?: string;
  }) {
    // For unpublishing, we might need to know which publisher was used.
    // For now, we'll try to use the provided ID or fallback to default.
    // Ideally, we should store the publisher ID with the published record.
    let publisher: PublisherExtension | undefined;
    if (publisherId) {
      publisher = this.publishers.find(p => p.id === publisherId);
    } else {
      publisher = this.publishers[0];
    }

    await this.publishedTemplatesStore.unpublish(id);

    if (publisher && publisher.unpublish) {
      await publisher.unpublish({
        visualTemplateId: id,
        scaffolderTemplate,
        user: 'unknown', // We might need to fetch who is unpublishing
      });
    }
  }
}
