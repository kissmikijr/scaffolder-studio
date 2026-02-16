import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  PolicyDecision,
  isPermission,
  AuthorizeResult,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  scaffolderStudioPublishPermission,
  scaffolderStudioUnpublishPermission,
  scaffolderStudioPrefabReadPermission,
  scaffolderStudioPrefabCreatePermission,
  scaffolderStudioPrefabDeletePermission,
  scaffolderStudioPermanentlyDeletePermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

class TestPermissionPolicy implements PermissionPolicy {
  async handle(request: PolicyQuery): Promise<PolicyDecision> {
    const { permission } = request;
    if (
      isPermission(
        permission,
        scaffolderStudioPermanentlyDeletePermission,
      )
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (isPermission(permission, scaffolderStudioPublishPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (isPermission(permission, scaffolderStudioUnpublishPermission)) {
      return { result: AuthorizeResult.DENY };
    }
    if (isPermission(permission, scaffolderStudioPrefabReadPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (
      isPermission(permission, scaffolderStudioPrefabCreatePermission)
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    if (
      isPermission(permission, scaffolderStudioPrefabDeletePermission)
    ) {
      return { result: AuthorizeResult.ALLOW };
    }
    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'permission-policy',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new TestPermissionPolicy());
      },
    });
  },
});
