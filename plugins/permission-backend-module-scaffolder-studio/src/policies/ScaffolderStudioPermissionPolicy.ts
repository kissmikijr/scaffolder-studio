import {
    PolicyDecision,
    AuthorizeResult,
    isPermission,
} from '@backstage/plugin-permission-common';
import {
    PermissionPolicy,
    PolicyQuery,
} from '@backstage/plugin-permission-node';
import {
    scaffolderStudioPublishPermission,
    scaffolderStudioUnpublishPermission,
    scaffolderStudioPrefabReadPermission,
    scaffolderStudioPrefabCreatePermission,
    scaffolderStudioPrefabDeletePermission,
    scaffolderStudioPrefabPublishPermission,
    scaffolderStudioPermanentlyDeletePermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

export class ScaffolderStudioPermissionPolicy implements PermissionPolicy {
    async handle(request: PolicyQuery): Promise<PolicyDecision> {
        const { permission } = request;

        if (isPermission(permission, scaffolderStudioPermanentlyDeletePermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioPublishPermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioUnpublishPermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioPrefabReadPermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioPrefabCreatePermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioPrefabDeletePermission)) {
            return { result: AuthorizeResult.ALLOW };
        }
        if (isPermission(permission, scaffolderStudioPrefabPublishPermission)) {
            return { result: AuthorizeResult.ALLOW };
        }

        return { result: AuthorizeResult.ALLOW };
    }
}
