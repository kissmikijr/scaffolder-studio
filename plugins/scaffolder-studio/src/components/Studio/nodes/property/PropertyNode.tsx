import React from 'react';
import { NodeProps, Position, Node, useEdges } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { Box, useTheme, Chip, Typography, Divider } from '@mui/material';
import { PropertyNodeData } from '../../types';
import { getBackgroundColor } from '../../utils/colorUtils';

import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  countIncomingConnections,
  countOutgoingConnections,
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';

export const PropertyNodeContent = ({
  id,
  selected,
  data,
  disabled = false,
}: NodeProps<Node<PropertyNodeData>> & { disabled?: boolean }) => {
  const theme = useTheme();
  const edges = useEdges();
  const canAcceptIncoming = hasIncomingCapacity(
    'property',
    countIncomingConnections(edges, id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'property',
    countOutgoingConnections(edges, id),
  );

  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 180,
        borderRadius: '20px',
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${selected ? SELECTED_BORDER_COLOR : theme.palette.divider
          }`,
        pointerEvents: disabled ? 'none' : 'auto',
        filter: disabled ? 'grayscale(1)' : 'none',
        '&:hover': {
          boxShadow: 3,
          cursor: 'pointer',
        },
        outline: 'none',
      }}
      data-interactive="true"
    >
      {!disabled && (
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            pointerEvents: 'none',
          }}
        >
          {'Property'}
        </Box>
      )}

      {
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              justifyContent: 'center',
              backgroundColor: getBackgroundColor(data.variableType),
              borderTopLeftRadius: '18px',
              borderTopRightRadius: '18px',
              ...(!data?.name && {
                borderBottomLeftRadius: '18px',
                borderBottomRightRadius: '18px',
              }),
              color: 'black',
              px: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
                display: 'flex',
                justifyContent: 'center',
              }}
              noWrap
            >
              {data?.name || 'Property'}
            </Typography>
            <Divider />
          </Box>
          {data?.name && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                width: '100%',
                px: 1,
              }}
            >
              <Chip
                size="small"
                label={data.variableType}
                variant="outlined"
                sx={{
                  backgroundColor: 'transparent',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: 500,
                }}
              />
              {data['ui:field'] && (
                <Chip
                  size="small"
                  label={data['ui:field']}
                  variant="outlined"
                  sx={{
                    backgroundColor: 'transparent',
                    fontWeight: 500,
                  }}
                />
              )}
              {data?.required && (
                <Chip
                  size="small"
                  label={'required'}
                  variant="outlined"
                  sx={{
                    backgroundColor: '#FF5555',
                    borderColor: '#FF5555',
                    color: 'white',
                    fontWeight: 500,
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      }

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
        </>
      )}
    </Box>
  );
};

const PropertyNode = (
  props: NodeProps<Node<PropertyNodeData>> & { disabled?: boolean },
) => {
  return <PropertyNodeContent {...props} />;
};

export default PropertyNode;
