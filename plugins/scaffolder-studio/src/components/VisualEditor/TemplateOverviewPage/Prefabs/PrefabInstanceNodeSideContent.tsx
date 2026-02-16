import React, { useEffect, useState } from 'react';
import { Node } from '@xyflow/react';
import { useApi } from '@backstage/core-plugin-api';
import { prefabLibraryApiRef } from '../../../../api/PrefabLibraryClient';
import {
  Prefab,
  ScaffolderAction,
  isStepNode,
  isTemplateNode,
  isParametersNode,
  isOutputNode,
  isPropertyNode,
  PrefabInstanceNodeData,
  NodeTypeColors,
  getPropertyBackgroundColor,
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
}: {
  node: Node<PrefabInstanceNodeData>;
  availableActions: ScaffolderAction[];
}) => {
  const [prefab, setPrefab] = useState<Prefab>();
  const [error, setError] = useState<string | null>(null);
  const prefabLibraryApi = useApi(prefabLibraryApiRef);

  useEffect(() => {
    if (!node.data.id) {
      setError('No prefab ID provided');
      return;
    }
    setError(null);
    prefabLibraryApi
      .get(node.data.id, node.data.version)
      .then(setPrefab)
      .catch(() => {
        setError('This prefab may have been deleted or is no longer available.');
        setPrefab(undefined);
      });
  }, [node.data.id, node.data.version, prefabLibraryApi]);

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="warning.main" gutterBottom>
          Prefab Not Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          ID: {node.data.id}
        </Typography>
      </Box>
    );
  }

  if (!prefab) return null;

  const prefabNode = prefab.node;

  // Get the color for the prefab based on its inner node type
  const getPrefabColor = () => {
    if (isStepNode(prefabNode)) return NodeTypeColors.step;
    if (isTemplateNode(prefabNode)) return NodeTypeColors.template;
    if (isParametersNode(prefabNode)) return NodeTypeColors.parameters;
    if (isOutputNode(prefabNode)) return NodeTypeColors.templateOutput;
    if (isPropertyNode(prefabNode)) return getPropertyBackgroundColor((prefabNode.data as any)?.variableType);
    return NodeTypeColors.unknown;
  };

  const nodeWithHandlers = {
    ...prefabNode,
    data: {
      ...prefabNode.data,
      onChange: () => { },
    },
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            backgroundColor: getPrefabColor(),
            flexShrink: 0,
          }}
        />
        <Typography variant="h5" sx={{ m: 0 }}>
          Prefab: {prefab.title}
        </Typography>
      </Box>

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
