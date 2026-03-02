import { ReactNode, useEffect, useRef, useState } from 'react';
import { Node } from '@xyflow/react';
import { StepNodeSideContent } from '../nodes/step/StepNodeSideContent';
import { TemplateNodeSideContent } from '../nodes/template/TemplateNodeSideContent';
import { ParametersNodeSideContent } from '../nodes/parameters/ParametersNodeSideContent';
import { OutputNodeSideContent } from '../nodes/output/OutputNodeSideContent';
import { PropertyNodeSideContent } from '../nodes/property/PropertyNodeSideContent';
import { PrefabInstanceNodeSideContent } from '../TemplateOverviewPage/Prefabs/PrefabInstanceNodeSideContent';
import { usePrefabData } from '../hooks/usePrefabData';
import {
  isStepNode,
  isTemplateNode,
  isParametersNode,
  isOutputNode,
  isPropertyNode,
  isPrefabNode,
  AllNodeData,
} from '../types';
import {
  ScaffolderAction,
  NodeTypeColors,
  getPropertyBackgroundColor,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { IconButton, Tooltip, Typography, Box } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ListIcon from '@mui/icons-material/List';
import { YamlNodeEditor } from './YamlNodeEditor';

export interface NodeSideContentProps {
  node: Node<AllNodeData> | undefined;
  availableActions: ScaffolderAction[];
  children?: ReactNode;
  /** Which node types to render. Default: all types */
  supportedTypes?: Array<
    'step' | 'template' | 'parameters' | 'output' | 'property' | 'prefab'
  >;
}

const defaultSupportedTypes: NodeSideContentProps['supportedTypes'] = [
  'step',
  'template',
  'parameters',
  'output',
  'property',
  'prefab',
];

/**
 * Unified component for rendering node-specific side content.
 * Used by both the main template editor and the prefab editor.
 */
export const NodeSideContent = ({
  node,
  availableActions,
  children,
  supportedTypes = defaultSupportedTypes,
}: NodeSideContentProps) => {
  const [isYamlMode, setIsYamlMode] = useState(false);
  const [formRenderVersion, setFormRenderVersion] = useState(0);
  const prevYamlModeRef = useRef(isYamlMode);
  const selectedPrefabNode = node && isPrefabNode(node) ? node : undefined;
  const isSelectedPrefabNode = Boolean(selectedPrefabNode);
  const prefabId = selectedPrefabNode?.data.id;
  const prefabVersion = selectedPrefabNode?.data.version;

  const {
    data: prefab,
    isLoading: prefabLoading,
    error: prefabQueryError,
  } = usePrefabData({
    prefabId,
    version: prefabVersion,
    enabled: isSelectedPrefabNode,
  });

  let prefabError: string | null = null;
  if (isSelectedPrefabNode && !prefabId) {
    prefabError = 'No prefab ID provided';
  } else if (prefabQueryError) {
    prefabError =
      'This prefab may have been deleted or is no longer available.';
  }

  const getHeaderInfo = () => {
    if (!node) return { title: 'Unknown', color: NodeTypeColors.unknown };
    if (isStepNode(node))
      return {
        title: `Step: ${node.data.name || 'Unnamed'}`,
        color: NodeTypeColors.step,
      };
    if (isTemplateNode(node))
      return {
        title: `Template: ${node.data.name || 'Unnamed'}`,
        color: NodeTypeColors.template,
      };
    if (isParametersNode(node))
      return {
        title: `Parameters: ${node.data.title || 'Unnamed'}`,
        color: NodeTypeColors.parameters,
      };
    if (isOutputNode(node))
      return { title: 'Output', color: NodeTypeColors.templateOutput };
    if (isPropertyNode(node))
      return {
        title: `Property: ${node.data.name || 'Unnamed'}`,
        color: getPropertyBackgroundColor(node.data.variableType),
      };
    if (isPrefabNode(node) && prefab)
      return {
        title: `Prefab: ${prefab.title || node.data.id}`,
        color: NodeTypeColors.unknown,
      };
    if (isPrefabNode(node))
      return {
        title: `Prefab: ${node.data.id}`,
        color: NodeTypeColors.unknown,
      };
    return { title: 'Unknown', color: NodeTypeColors.unknown };
  };

  const { title, color } = getHeaderInfo();
  const isTypeSupported = (type: string) =>
    supportedTypes?.includes(type as any);
  useEffect(() => {
    const wasYamlMode = prevYamlModeRef.current;
    if (wasYamlMode && !isYamlMode) {
      // Force form controls to re-read current node state after YAML edits.
      setFormRenderVersion(v => v + 1);
    }
    prevYamlModeRef.current = isYamlMode;
  }, [isYamlMode]);
  const contentPaneSx = (visible: boolean) => ({
    position: 'absolute' as const,
    inset: 0,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity 140ms ease',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  });
  const renderYamlPane = () => {
    if (!node) {
      return null;
    }

    if (!isPrefabNode(node)) {
      return (
        <YamlNodeEditor
          node={node}
          onChange={(id, data) => (node.data as any).onChange(id, data)}
        />
      );
    }

    if (prefab?.node) {
      return (
        <YamlNodeEditor
          node={prefab.node}
          readOnly
          onChange={(id, data) => (node.data as any).onChange(id, data)}
        />
      );
    }

    if (prefabError) {
      return (
        <Typography variant="body2" color="warning.main">
          {prefabError}
        </Typography>
      );
    }

    return (
      <Typography variant="body2" color="text.secondary">
        {prefabLoading ? 'Loading prefab YAML...' : 'Prefab YAML unavailable'}
      </Typography>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        px: 0,
        py: 0,
        overflowY: 'auto',
        position: 'relative',
        wordBreak: 'break-word',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          mt: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '4px',
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <Typography variant="h6" sx={{ m: 0 }}>
            {title}
          </Typography>
        </Box>
        <Tooltip
          title={isYamlMode ? 'Switch to Form View' : 'Switch to YAML View'}
        >
          <IconButton
            data-testid="yaml-toggle-switch"
            size="small"
            onClick={() => setIsYamlMode(!isYamlMode)}
            color={isYamlMode ? 'primary' : 'default'}
          >
            {isYamlMode ? (
              <ListIcon fontSize="small" />
            ) : (
              <CodeIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {children}

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Box
          key={`form-pane-${node?.id ?? 'none'}-${formRenderVersion}`}
          sx={contentPaneSx(!isYamlMode)}
        >
          {node && isStepNode(node) && isTypeSupported('step') && (
            <StepNodeSideContent
              node={node}
              key={`${node.id}-${node.type}-step`}
              id={node.id}
              availableActions={availableActions}
            />
          )}
          {node && isTemplateNode(node) && isTypeSupported('template') && (
            <TemplateNodeSideContent
              key={`${node.id}-${node.type}-template`}
              id={node.id}
            />
          )}
          {node && isParametersNode(node) && isTypeSupported('parameters') && (
            <ParametersNodeSideContent
              key={`${node.id}-${node.type}-parameters`}
              id={node.id}
            />
          )}
          {node && isOutputNode(node) && isTypeSupported('output') && (
            <OutputNodeSideContent
              node={node}
              key={`${node.id}-${node.type}-output`}
              id={node.id}
            />
          )}
          {node && isPropertyNode(node) && isTypeSupported('property') && (
            <PropertyNodeSideContent
              node={node}
              key={`${node.id}-${node.type}-property`}
              id={node.id}
            />
          )}
          {node && isPrefabNode(node) && isTypeSupported('prefab') && (
            <PrefabInstanceNodeSideContent
              node={node}
              availableActions={availableActions}
              prefab={prefab ?? null}
              isLoading={prefabLoading}
              error={prefabError}
              key={`${node.id}-${node.type}-prefab`}
            />
          )}
        </Box>

        <Box sx={contentPaneSx(isYamlMode)}>{renderYamlPane()}</Box>
      </Box>
    </Box>
  );
};
