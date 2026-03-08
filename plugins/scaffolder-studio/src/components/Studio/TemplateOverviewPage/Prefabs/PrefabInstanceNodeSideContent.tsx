import { Node } from '@xyflow/react';
import {
  AllNodeData,
  Prefab,
  ScaffolderAction,
  isStepNode,
  isTemplateNode,
  isParametersNode,
  isOutputNode,
  isPropertyNode,
  PrefabInstanceNodeData,
  applyPrefabInstanceOverridesToNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { StepNodeSideContent } from '../../nodes/step/StepNodeSideContent';
import { TemplateNodeSideContent } from '../../nodes/template/TemplateNodeSideContent';
import { ParametersNodeSideContent } from '../../nodes/parameters/ParametersNodeSideContent';
import { OutputNodeSideContent } from '../../nodes/output/OutputNodeSideContent';
import { PropertyNodeSideContent } from '../../nodes/property/PropertyNodeSideContent';
import { Typography, Box, Divider, Chip } from '@mui/material';

export const PrefabInstanceNodeSideContent = ({
  node,
  availableActions,
  prefab,
  isLoading,
  error,
}: {
  node: Node<PrefabInstanceNodeData>;
  availableActions: ScaffolderAction[];
  prefab: Prefab | null;
  isLoading: boolean;
  error: string | null;
}) => {
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="warning.main" gutterBottom>
          Prefab Not Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 1, display: 'block' }}
        >
          ID: {node.data.id}
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading prefab...
        </Typography>
      </Box>
    );
  }

  if (!prefab) return null;

  const prefabNode = applyPrefabInstanceOverridesToNode(
    prefab.node as Node<AllNodeData>,
    node.data,
  );

  const nodeWithHandlers = {
    ...prefabNode,
    data: {
      ...prefabNode.data,
      onChange: () => {},
    },
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        {prefab.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {prefab.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {prefab.version && (
            <Chip
              label={`Version ${prefab.version}`}
              size="small"
              variant="outlined"
            />
          )}
          {prefab.owner && (
            <Chip
              label={`Owner: ${prefab.owner}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {prefab.created_at && (
          <Typography variant="caption" color="text.secondary" display="block">
            Created: {new Date(prefab.created_at).toLocaleString()}
          </Typography>
        )}
        {prefab.updated_at && (
          <Typography variant="caption" color="text.secondary" display="block">
            Updated: {new Date(prefab.updated_at).toLocaleString()}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {isStepNode(prefabNode) && (
        <StepNodeSideContent
          disabled
          node={nodeWithHandlers as any}
          key={`${prefabNode.id}-step`}
          id={prefabNode.id}
          availableActions={availableActions}
        />
      )}
      {isTemplateNode(prefabNode) && (
        <TemplateNodeSideContent
          key={`${prefabNode.id}-template`}
          id={prefabNode.id}
        />
      )}
      {isParametersNode(prefabNode) && (
        <ParametersNodeSideContent
          key={`${prefabNode.id}-parameters`}
          id={prefabNode.id}
        />
      )}
      {isOutputNode(prefabNode) && (
        <OutputNodeSideContent
          disabled
          node={nodeWithHandlers as any}
          key={`${prefabNode.id}-output`}
          id={prefabNode.id}
        />
      )}
      {isPropertyNode(prefabNode) && (
        <PropertyNodeSideContent
          disabled
          node={nodeWithHandlers as any}
          key={`${prefabNode.id}-property`}
          id={prefabNode.id}
        />
      )}
    </>
  );
};
