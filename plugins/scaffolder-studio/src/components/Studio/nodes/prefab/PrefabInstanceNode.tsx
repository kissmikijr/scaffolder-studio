import { useEffect, useState } from 'react';
import { Box, useTheme, Typography, Tooltip, alpha } from '@mui/material';
import { Node, NodeProps, Position } from '@xyflow/react';
import { PrefabInstanceNodeData } from '../../types';
import {
  AllNodeData,
  Prefab,
  NodeTypeColors,
  applyPrefabInstanceOverridesToNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { prefabLibraryApiRef } from '../../../../api/PrefabLibraryClient';

import { useApi } from '@backstage/core-plugin-api';
import StepNode from '../step/StepNode';
import { PropertyNodeContent } from '../property/PropertyNode';
import OutputNode from '../output/OutputNode';
import { Handle } from '../../components/Handle';
import { getBackgroundColor } from '../../utils/colorUtils';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';
import { useTemplateLintContext } from '../../TemplateLintContext';
import {
  NodeLintBadge,
  getLintSeverityColor,
  getNodeLintSeverity,
  getNodeLintTooltipTitle,
} from '../NodeLintBadge';

type LoadingState = 'loading' | 'loaded' | 'error' | 'not-found';

import { SELECTED_BORDER_COLOR } from '../../styles';

const PrefabInstanceNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<PrefabInstanceNodeData>>) => {
  const theme = useTheme();
  const { issuesByNodeId } = useTemplateLintContext();
  const libraryApi = useApi(prefabLibraryApiRef);
  const personalApi = useApi(prefabsApiRef);
  const { getIncomingConnectionCount, getOutgoingConnectionCount } =
    useGraphPerformanceContext();
  const [prefab, setPrefab] = useState<Prefab>();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const canAcceptIncoming = hasIncomingCapacity(
    'prefab',
    getIncomingConnectionCount(id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'prefab',
    getOutgoingConnectionCount(id),
  );

  useEffect(() => {
    if (!data?.id) {
      setLoadingState('error');
      return;
    }

    setLoadingState('loading');

    const fetchPrefab = async () => {
      try {
        // Try personal api first (for unpublished prefabs)
        if (!data.version) {
          try {
            const p = await personalApi.get({ id: data.id });
            if (p) {
              setPrefab(p as Prefab);
              setLoadingState('loaded');
              return;
            }
          } catch {
            // Ignore and try library
          }
        }

        // Try library api
        const p = await libraryApi.get(data.id, data.version);
        if (p) {
          setPrefab(p);
          setLoadingState('loaded');
        } else {
          setLoadingState('not-found');
        }
      } catch {
        setLoadingState('not-found');
      }
    };

    fetchPrefab();
  }, [data?.id, data?.version, libraryApi, personalApi]);

  const getBorderColor = (nodeType: string) => {
    switch (nodeType) {
      case 'step':
        return NodeTypeColors.step;
      case 'templateOutput':
        return NodeTypeColors.templateOutput;
      case 'property':
        // Use the property's variableType to determine color
        return getBackgroundColor((prefab?.node?.data as any)?.variableType);
      default:
        return NodeTypeColors.unknown;
    }
  };

  const effectivePrefabNode = prefab?.node
    ? applyPrefabInstanceOverridesToNode(prefab.node as Node<AllNodeData>, data)
    : undefined;
  const isError = loadingState === 'not-found' || loadingState === 'error';
  const lintSeverity = getNodeLintSeverity(issuesByNodeId.get(id) ?? []);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  let fallbackBorderColor = NodeTypeColors.unknown as string;
  if (selected) {
    fallbackBorderColor = SELECTED_BORDER_COLOR;
  } else if (isError) {
    fallbackBorderColor = theme.palette.warning.main;
  } else if (effectivePrefabNode?.type) {
    fallbackBorderColor = getBorderColor(effectivePrefabNode.type);
  }
  const lintBorderColor = lintSeverityColor ?? fallbackBorderColor;
  const lintIssues = issuesByNodeId.get(id) ?? [];

  const renderNode = () => {
    if (loadingState === 'loading') {
      return (
        <Box sx={{ padding: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      );
    }

    if (loadingState === 'not-found' || loadingState === 'error') {
      return (
        <Box
          sx={{
            padding: 2,
            minWidth: 180,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 32,
              color: theme.palette.warning.main,
            }}
          />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Prefab Not Found
          </Typography>
          <Typography variant="caption" color="text.disabled">
            ID: {data?.id?.slice(0, 8)}...
          </Typography>
          <Typography variant="caption" color="text.disabled">
            This prefab may have been deleted
          </Typography>
        </Box>
      );
    }

    if (!effectivePrefabNode) {
      return (
        <Box sx={{ padding: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Invalid prefab data
          </Typography>
        </Box>
      );
    }

    const nodeWithHandlers = {
      ...effectivePrefabNode,
      data: {
        ...effectivePrefabNode.data,
        onChange: () => {},
      },
    };

    switch (effectivePrefabNode.type) {
      case 'step':
        return (
          <StepNode
            {...(nodeWithHandlers as any)}
            disabled
            selected={false}
            showLintBadge={false}
          />
        );
      case 'property':
        return (
          <PropertyNodeContent
            {...(nodeWithHandlers as any)}
            disabled
            selected={false}
            showLintBadge={false}
          />
        );
      case 'templateOutput':
        return (
          <OutputNode
            {...(nodeWithHandlers as any)}
            disabled
            selected={false}
            showLintBadge={false}
          />
        );
      default:
        return (
          <Box sx={{ padding: 2, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Unknown node type
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box>
      <NodeLintBadge nodeId={id} />
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          left: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isError ? 'warning.main' : 'text.secondary',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 120,
        }}
      >
        {isError
          ? 'Missing Prefab'
          : `Prefab: ${prefab?.title} v${prefab?.version}`}
      </Box>
      {!isError && (
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            pointerEvents: 'none',
          }}
        >
          {prefab?.node?.type === 'templateOutput'
            ? 'Output'
            : effectivePrefabNode?.type}
        </Box>
      )}
      <Tooltip
        arrow
        enterDelay={150}
        disableHoverListener={lintIssues.length === 0}
        title={getNodeLintTooltipTitle(lintIssues)}
      >
        <Box
          sx={{
            borderRadius: '24px',
            color: theme.palette.text.primary,
            backgroundColor: theme.complimentBackground,
            position: 'relative',
            display: 'block',
            border: `4px ${isError ? 'dashed' : 'solid'} ${lintBorderColor}`,
            '&::after':
              lintIssues.length > 0
                ? {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    backgroundColor: alpha(
                      lintSeverityColor ?? theme.palette.warning.main,
                      0.08,
                    ),
                    pointerEvents: 'none',
                  }
                : undefined,

            overflow: 'visible',
            '&:hover': {
              boxShadow: 2,
            },
            outline: 'none',
          }}
        >
          <Box
            sx={{
              overflow: 'visible',
            }}
          >
            {renderNode()}
          </Box>
        </Box>
      </Tooltip>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        disabled={!canAcceptIncoming}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        disabled={!canAcceptIncoming}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        disabled={!canAcceptIncoming}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        disabled={!canAcceptIncoming}
      />

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        disabled={!canAcceptOutgoing}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        disabled={!canAcceptOutgoing}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        disabled={!canAcceptOutgoing}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        disabled={!canAcceptOutgoing}
      />
    </Box>
  );
};

export default PrefabInstanceNode;
