import { useRef, useState, useMemo } from 'react';
import { NodeProps, Position, Node, useNodes, useEdges } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import {
  Box,
  useTheme,
  Tooltip,
  Typography,
  Popper,
  alpha,
  Fade,
  Paper,
} from '@mui/material';
import {
  StepNodeData,
  isPropertyNode,
  isStepNode,
  PropertyNodeData,
  AllNodeData,
} from '../../types';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { ExpressionViewer } from './ExpressionViewer';

import { FadableContainer } from '../../components/FadableContainer';

import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  countIncomingConnections,
  countOutgoingConnections,
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';

const StepNode = ({
  selected,
  id,
  data,
  disabled = false,
}: NodeProps<Node<StepNodeData>> & {
  disabled?: boolean;
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const nodes = useNodes<Node<AllNodeData>>();
  const edges = useEdges();

  const canAcceptIncoming = hasIncomingCapacity(
    'step',
    countIncomingConnections(edges, id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'step',
    countOutgoingConnections(edges, id),
  );

  const parameters = useMemo(() => {
    return nodes
      .filter((n): n is Node<PropertyNodeData> => isPropertyNode(n))
      .map(n => ({
        name: n.data.name,
        type: n.data.variableType,
      }));
  }, [nodes]);

  const outputs = useMemo(() => {
    return nodes
      .filter((n): n is Node<StepNodeData> => isStepNode(n) && n.id !== id)
      .map(n => ({
        id: n.data.stepId || '',
        outputs: n.data.schema?.output,
      }));
  }, [nodes, id]);

  return (
    <Box
      ref={nodeRef}
      sx={{
        minWidth: 150,
        maxWidth: 300,
        borderRadius: '20px',
        border: `2px solid ${
          selected ? SELECTED_BORDER_COLOR : theme.palette.divider
        }`,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: selected ? 3 : 1,
        position: 'relative',
        fontSize: '0.85rem',
        filter: disabled ? 'grayscale(1)' : 'none',
        '&:hover': {
          cursor: 'pointer',
          boxShadow: 4,
        },
        pointerEvents: disabled ? 'none' : 'auto', // Corrected from 'none' : 'none'
        outline: 'none',
      }}
      data-testid={`step-node-${id}`}
      data-interactive="true"
    >
      <Popper
        open={Boolean((data.schema as any)?.output?.properties && open)}
        anchorEl={nodeRef.current}
        placement="right-start"
        disablePortal
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper
              elevation={8}
              sx={{
                p: 1.5,
                m: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.85),
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                minWidth: 160,
                boxShadow: `0 4px 20px 0 ${alpha(
                  theme.palette.common.black,
                  0.2,
                )}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: theme.palette.text.secondary,
                  display: 'block',
                  mb: 1,
                  letterSpacing: '0.05rem',
                  fontSize: '0.6rem',
                }}
              >
                Output Fields
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.entries(
                  (data.schema as any)?.output?.properties || {},
                ).map(([key, val]: any) => (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        fontSize: '0.75rem',
                      }}
                    >
                      {key}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor: alpha(NodeTypeColors.step, 0.1),
                        color: NodeTypeColors.step,
                        px: 0.8,
                        py: 0.2,
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: 'Monospace',
                      }}
                    >
                      {val.type}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Fade>
        )}
      </Popper>
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          left: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          width: '100%',
          color: 'text.secondary',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          zIndex: 1000,
        }}
      >
        {!disabled && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>Step</Box>
        )}
        {(data.schema as any)?.output?.properties && (
          <Box
            sx={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Tooltip title={open ? 'Hide output fields' : 'Show output fields'}>
              <Box
                onClick={() =>
                  setAnchorEl(prev => (prev ? null : nodeRef.current))
                }
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {open ? (
                  <ChevronRightIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              backgroundColor: NodeTypeColors.step,
              color: '#282a36',
              px: 1.5,
              py: 0.5,
              borderTopLeftRadius: '18px',
              borderTopRightRadius: '18px',
              width: '100%',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FadableContainer
              component={Typography}
              variant="h6"
              sx={{
                fontSize: '1rem',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                fontWeight: 600,
              }}
            >
              {data.name || 'Select action'}
            </FadableContainer>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderBottomLeftRadius: '18px',
          borderBottomRightRadius: '18px',
          fontFamily: 'Monospace',
          fontSize: '0.75rem',
          padding: 1,
          width: '100%',
          textAlign: 'left',
          color: 'text.primary',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflow: 'hidden',
          minHeight: '64px', // Ensure consistent body size
        }}
      >
        <Box
          sx={{
            backgroundColor: theme.palette.action.hover,
            borderRadius: '12px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            width: data.stepId ? 'fit-content' : '80%',
            height: '24px',
            maxWidth: '100%',
          }}
        >
          {data.stepId ? (
            <FadableContainer
              component={Typography}
              sx={{
                fontFamily: 'Monospace',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span
                style={{
                  color: theme.palette.text.secondary,
                  marginRight: '6px',
                }}
              >
                id:
              </span>
              <span style={{ fontWeight: 600 }}>{data.stepId}</span>
            </FadableContainer>
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '8px',
                backgroundColor: theme.palette.action.disabledBackground,
                borderRadius: '4px',
                opacity: 0.3,
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            backgroundColor: theme.palette.action.hover,
            borderRadius: '12px',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            width: data.actionId ? 'fit-content' : '60%',
            height: '24px',
            maxWidth: '100%',
          }}
        >
          {data.actionId ? (
            <FadableContainer
              component={Typography}
              sx={{
                fontFamily: 'Monospace',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span
                style={{
                  color: theme.palette.text.secondary,
                  marginRight: '6px',
                }}
              >
                action:
              </span>
              <span style={{ fontWeight: 600 }}>{data.actionId}</span>
            </FadableContainer>
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '8px',
                backgroundColor: theme.palette.action.disabledBackground,
                borderRadius: '4px',
                opacity: 0.3,
              }}
            />
          )}
        </Box>

        {data.if && (
          <FadableContainer
            sx={{
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <span
              style={{
                color: 'text.secondary',
                marginRight: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              if:
            </span>
            <div style={{ display: 'inline-block' }}>
              <ExpressionViewer
                value={data.if}
                parameters={parameters}
                outputs={outputs}
              />
            </div>
          </FadableContainer>
        )}
      </Box>
      {!disabled && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            disabled={!canAcceptIncoming}
            data-testid={`step-node-handle-top-${id}`}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right"
            disabled={!canAcceptIncoming}
            data-testid={`step-node-handle-right-${id}`}
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom"
            disabled={!canAcceptIncoming}
            data-testid={`step-node-handle-bottom-${id}`}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            disabled={!canAcceptIncoming}
            data-testid={`step-node-handle-left-${id}`}
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top"
            disabled={!canAcceptOutgoing}
            data-testid={`step-node-source-handle-top-${id}`}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            disabled={!canAcceptOutgoing}
            data-testid={`step-node-source-handle-right-${id}`}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            disabled={!canAcceptOutgoing}
            data-testid={`step-node-source-handle-bottom-${id}`}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            disabled={!canAcceptOutgoing}
            data-testid={`step-node-source-handle-left-${id}`}
          />
        </>
      )}
    </Box>
  );
};

export default StepNode;
