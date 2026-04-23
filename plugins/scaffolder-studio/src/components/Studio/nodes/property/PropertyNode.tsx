import { useMemo } from 'react';
import { NodeProps, Position, Node, Handle as FlowHandle } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { getStudioRelationshipHandleBaseStyle } from '../../components/studioHandleStyles';
import {
  Box,
  useTheme,
  Chip,
  Typography,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material';
import { PropertyNodeData } from '../../types';
import { getBackgroundColor } from '../../utils/colorUtils';
import { RELATIONSHIP_PROPERTY_OUTPUT_HANDLE } from '../../hooks/useDependencyEdges';

import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';
import { useNodeLintIssues } from '../../TemplateLintContext';
import {
  NodeLintBadge,
  getLintSeverityColor,
  getNodeLintSeverity,
  getNodeLintTooltipTitle,
} from '../NodeLintBadge';

export const PropertyNodeContent = ({
  id,
  selected,
  data,
  disabled = false,
  showLintBadge = true,
}: NodeProps<Node<PropertyNodeData>> & {
  disabled?: boolean;
  showLintBadge?: boolean;
}) => {
  const theme = useTheme();
  const lintIssues = useNodeLintIssues(id);
  const { getIncomingConnectionCount, getOutgoingConnectionCount } =
    useGraphPerformanceContext();
  const canAcceptIncoming = useMemo(
    () => hasIncomingCapacity('property', getIncomingConnectionCount(id)),
    [getIncomingConnectionCount, id],
  );
  const canAcceptOutgoing = useMemo(
    () => hasOutgoingCapacity('property', getOutgoingConnectionCount(id)),
    [getOutgoingConnectionCount, id],
  );
  const lintSeverity = getNodeLintSeverity(lintIssues);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  const borderColor = selected ? SELECTED_BORDER_COLOR : theme.palette.divider;

  return (
    <Tooltip
      arrow
      enterDelay={150}
      disableHoverListener={lintIssues.length === 0 || disabled}
      title={getNodeLintTooltipTitle(lintIssues)}
    >
      <Box
        sx={{
          position: 'relative',
          minWidth: 180,
          borderTopLeftRadius: '20px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${borderColor}`,
          pointerEvents: disabled ? 'none' : 'auto',
          filter: disabled ? 'grayscale(1)' : 'none',
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
          '&:hover': {
            boxShadow: 3,
            cursor: 'pointer',
          },
          outline: 'none',
        }}
        data-interactive="true"
      >
        {showLintBadge ? <NodeLintBadge nodeId={id} /> : null}
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
                lineHeight: 2,
                display: 'flex',
                justifyContent: 'center',
                textDecorationLine:
                  lintIssues.length > 0 ? 'underline' : 'none',
                textDecorationStyle: lintIssues.length > 0 ? 'wavy' : undefined,
                textDecorationColor:
                  lintIssues.length > 0 ? theme.palette.error.main : undefined,
                textDecorationThickness:
                  lintIssues.length > 0 ? '2px' : undefined,
                textUnderlineOffset: lintIssues.length > 0 ? '4px' : undefined,
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
              nodeId={id}
              type="target"
              position={Position.Top}
              id="top"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Right}
              id="right"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Bottom}
              id="bottom"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Left}
              id="left"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Top}
              id="top"
              disabled={!canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
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
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: 'none',
                right: 10,
                top: '15%',
                ...getStudioRelationshipHandleBaseStyle(theme),
              }}
              data-testid={`property-relationship-handle-${id}`}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Bottom}
              id="bottom"
              disabled={!canAcceptOutgoing}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Left}
              id="left"
              disabled={!canAcceptOutgoing}
            />
          </>
        )}
      </Box>
    </Tooltip>
  );
};

const PropertyNode = (
  props: NodeProps<Node<PropertyNodeData>> & { disabled?: boolean },
) => {
  return <PropertyNodeContent {...props} />;
};

export default PropertyNode;
