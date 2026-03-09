import { useMemo } from 'react';
import { NodeProps, Position, Node, Handle as FlowHandle } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { Box, useTheme, Chip, Typography, Divider, alpha } from '@mui/material';
import { PropertyNodeData } from '../../types';
import { getBackgroundColor } from '../../utils/colorUtils';
import { RELATIONSHIP_PROPERTY_OUTPUT_HANDLE } from '../../hooks/useDependencyEdges';

import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';

export const PropertyNodeContent = ({
  id,
  selected,
  data,
  disabled = false,
}: NodeProps<Node<PropertyNodeData>> & { disabled?: boolean }) => {
  const theme = useTheme();
  const {
    getIncomingConnectionCount,
    getOutgoingConnectionCount,
    getRelationshipHandleColor,
  } = useGraphPerformanceContext();
  const canAcceptIncoming = useMemo(
    () => hasIncomingCapacity('property', getIncomingConnectionCount(id)),
    [getIncomingConnectionCount, id],
  );
  const canAcceptOutgoing = useMemo(
    () => hasOutgoingCapacity('property', getOutgoingConnectionCount(id)),
    [getOutgoingConnectionCount, id],
  );
  const relationshipAccent =
    theme.palette.mode === 'light'
      ? theme.palette.primary.main
      : theme.palette.info.light;
  const relationshipHandleColor = getRelationshipHandleColor(
    id,
    RELATIONSHIP_PROPERTY_OUTPUT_HANDLE,
    'source',
  );
  const relationshipBaseColor = relationshipHandleColor ?? relationshipAccent;

  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 180,
        borderRadius: '20px',
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${
          selected ? SELECTED_BORDER_COLOR : theme.palette.divider
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
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {!disabled && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              Property
            </Typography>
          )}
        </Box>
      )}
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
                label="required"
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
          <FlowHandle
            type="source"
            position={Position.Right}
            id={RELATIONSHIP_PROPERTY_OUTPUT_HANDLE}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: `1.5px solid ${
                theme.palette.mode === 'light'
                  ? alpha(theme.palette.common.black, 0.55)
                  : alpha(theme.palette.common.black, 0.78)
              }`,
              backgroundColor: relationshipHandleColor
                ? relationshipBaseColor
                : theme.palette.background.paper,
              right: 0,
              top: '28%',
              transform: 'translate(50%, -50%)',
              cursor: 'crosshair',
              boxShadow: 'none',
              zIndex: 4600,
              pointerEvents: 'all',
            }}
            data-testid={`property-relationship-handle-${id}`}
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
