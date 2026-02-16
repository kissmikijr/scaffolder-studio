import {
  AuthService,
  DiscoveryService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  ScaffolderActionPatch,
  ScaffolderAction,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

export class SchemaPatcher {
  patchedActions: ScaffolderAction[] = [];
  actions: ScaffolderAction[] = [];
  patches: ScaffolderActionPatch[];

  private constructor(
    private readonly discovery: DiscoveryService,
    private readonly auth: AuthService,
    private readonly config: RootConfigService,
  ) {
    this.discovery = discovery;
    this.auth = auth;
    this.config = config;
    this.patches = this.loadPatchesFromConfig();
    this.patch();
  }

  static async init(
    discovery: DiscoveryService,
    auth: AuthService,
    config: RootConfigService,
  ) {
    return new SchemaPatcher(discovery, auth, config);
  }

  /**
   * Load schema patches from app-config.yaml
   * Example config:
   * 
   * scaffolder:
   *   studio:
   *     schemaPatches:
   *       - id: 'catalog:register'
   *         patch:
   *           input:
   *             type: object
   *             properties:
   *               customField:
   *                 type: string
   *          output:
   *             type: object
   *             properties: {}
   */
  private loadPatchesFromConfig(): ScaffolderActionPatch[] {
    const patches: ScaffolderActionPatch[] = [];

    const configPatches = this.config.getOptionalConfigArray(
      'scaffolder.studio.schemaPatches',
    );

    if (!configPatches) {
      return patches;
    }

    for (const patchConfig of configPatches) {
      const id = patchConfig.getString('id');
      const inputType = patchConfig.getOptionalString('patch.input.type') || 'object';
      const inputProperties = patchConfig.getOptional('patch.input.properties') || {};
      const outputType = patchConfig.getOptionalString('patch.output.type') || 'object';
      const outputProperties = patchConfig.getOptional('patch.output.properties') || {};

      patches.push({
        id,
        patch: {
          input: {
            type: inputType,
            properties: inputProperties as Record<string, any>,
          },
          output: {
            type: outputType,
            properties: outputProperties as Record<string, any>,
          },
        },
      });
    }

    return patches;
  }

  private async patch() {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'scaffolder',
    });

    const scafffolderUrl = await this.discovery.getBaseUrl('scaffolder');
    const scafffolderActions = await fetch(`${scafffolderUrl}/v2/actions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const scafffolderActionsJson = await scafffolderActions.json();
    this.actions = scafffolderActionsJson as ScaffolderAction[];

    this.patchedActions = this.actions.map(action => {
      const patch = this.patches.find(p => p.id === action.id);
      if (patch) {
        return {
          ...action,
          schema: {
            input: {
              type: action.schema?.input?.type || 'object',
              properties: {
                ...action.schema?.input?.properties,
                ...patch.patch.input.properties,
              },
            },
            output: {
              type: action.schema?.output?.type || 'object',
              properties: {
                ...action.schema?.output?.properties,
                ...patch.patch.output.properties,
              },
            },
          },
        };
      }
      return action;
    });
  }

  getActions() {
    return this.patchedActions;
  }
}
