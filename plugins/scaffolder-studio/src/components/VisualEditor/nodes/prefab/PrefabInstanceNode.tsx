import React, { useEffect, useState } from 'react';
import { Box, useTheme, Typography } from '@mui/material';
import { Node, NodeProps, Position, useEdges } from '@xyflow/react';
import { PrefabInstanceNodeData } from '../../types';
import {
  Prefab,
  NodeTypeColors,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

import { prefabLibraryApiRef } from '../../../../api/PrefabLibraryClient';

import { useApi } from '@backstage/core-plugin-api';
import StepNode from '../step/StepNode';
import { PropertyNodeContent } from '../property/PropertyNode';
import OutputNode from '../output/OutputNode';
import { Handle } from '../../components/Handle';
import { getBackgroundColor } from '../../utils/colorUtils';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  countIncomingConnections,
  countOutgoingConnections,
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';

type LoadingState = 'loading' | 'loaded' | 'error' | 'not-found';

import { SELECTED_BORDER_COLOR } from '../../styles';

const PrefabInstanceNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<PrefabInstanceNodeData>>) => {
  const theme = useTheme();
  const api = useApi(prefabLibraryApiRef);
  const edges = useEdges();
  const [prefab, setPrefab] = useState<Prefab>();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const canAcceptIncoming = hasIncomingCapacity(
    'prefab',
    countIncomingConnections(edges, id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'prefab',
    countOutgoingConnections(edges, id),
  );

  useEffect(() => {
    if (!data?.id) {
      setLoadingState('error');
      return;
    }

    setLoadingState('loading');
    api
      .get(data.id, data.version)
      .then(prefab => {
        if (prefab) {
          setPrefab(prefab);
          setLoadingState('loaded');
        } else {
          setLoadingState('not-found');
        }
      })
      .catch(() => {
        setLoadingState('not-found');
      });
  }, [data?.id, data?.version, api]);

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

    if (!prefab?.node) {
      return (
        <Box sx={{ padding: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Invalid prefab data
          </Typography>
        </Box>
      );
    }

    const nodeWithHandlers = {
      ...prefab.node,
      data: {
        ...prefab.node.data,
        onChange: () => {},
      },
    };

    switch (prefab.node.type) {
      case 'step':
        return (
          <StepNode {...(nodeWithHandlers as any)} disabled selected={false} />
        );
      case 'property':
        return (
          <PropertyNodeContent
            {...(nodeWithHandlers as any)}
            disabled
            selected={false}
          />
        );
      case 'templateOutput':
        return (
          <OutputNode
            {...(nodeWithHandlers as any)}
            disabled
            selected={false}
          />
        );
    }
    return (
      <Box sx={{ padding: 2, minWidth: 150, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Unknown node type
        </Typography>
      </Box>
    );
  };

  const isError = loadingState === 'not-found' || loadingState === 'error';

  return (
    <Box>
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
          {`${
            prefab?.node?.type === 'templateOutput'
              ? 'Output'
              : prefab?.node?.type
          }`}
        </Box>
      )}
      <Box
        sx={{
          borderRadius: '24px',
          color: theme.palette.text.primary,
          backgroundColor: theme.complimentBackground,
          position: 'relative',
          display: 'block',
          border: `4px ${isError ? 'dashed' : 'solid'} ${
            selected
              ? SELECTED_BORDER_COLOR
              : isError
              ? theme.palette.warning.main
              : prefab?.node?.type
              ? getBorderColor(prefab.node.type)
              : NodeTypeColors.unknown
          }`,

          overflow: 'visible',
          '&:hover': {
            boxShadow: 2,
          },
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
