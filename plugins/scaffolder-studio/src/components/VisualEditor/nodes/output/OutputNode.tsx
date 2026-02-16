import React from 'react';
import { NodeProps, Position, Node, useEdges } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { Box, Typography, useTheme, Stack } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import InfoIcon from '@mui/icons-material/Info';
import { OutputNodeData } from '../../types';
import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  countIncomingConnections,
  hasIncomingCapacity,
} from '../../utils/connectionLimits';

const OutputNode = ({
  id,
  selected,
  data,
  disabled = false,
}: NodeProps<Node<OutputNodeData>> & { disabled?: boolean }) => {
  const theme = useTheme();
  const edges = useEdges();
  const canAcceptIncoming = hasIncomingCapacity(
    'templateOutput',
    countIncomingConnections(edges, id),
  );
  const renderContent = () => {
    const linksCount = data?.links?.length || 0;
    const textsCount = data?.text?.length || 0;

    if (linksCount === 0 && textsCount === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            px: 2,
            py: 2,
            color: '#282a36',
            borderRadius: '18px',
            backgroundColor: '#4ae1fc',
            minHeight: '60px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Add links or texts
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{}}>
        <Box
          sx={{
            color: '#282a36',
            backgroundColor: '#4ae1fc',
            minHeight: '30px',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
          }}
        >
          <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Links & Texts
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ px: 1 }}>
          {linksCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LaunchIcon fontSize="small" />
              <Typography variant="body2">
                {linksCount} link{linksCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}

          {textsCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              <Typography variant="body2">
                {textsCount} text block{textsCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    );
  };
  return (
    <Box
      sx={{
        position: 'relative',
        width: 260,
        borderRadius: '20px',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `2px solid ${
          selected ? SELECTED_BORDER_COLOR : theme.palette.divider
        }`,
        pointerEvents: disabled ? 'none' : 'auto',
        filter: disabled ? 'grayscale(1)' : 'none',
        '&:hover': {
          boxShadow: 3,
          cursor: 'pointer',
        },
      }}
      data-interactive="true"
    >
      {!disabled && (
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            left: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            pointerEvents: 'none',
          }}
        >
          {'Output'}
        </Box>
      )}

      {renderContent()}

      {!disabled && (
        <>
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
        </>
      )}
    </Box>
  );
};

export default OutputNode;
