import { useMemo } from 'react';
import { NodeProps, Position, Node, Handle as FlowHandle } from '@xyflow/react';
import { Box, useTheme, Tooltip, Typography, alpha, Chip } from '@mui/material';
import { Handle } from '../../components/Handle';
import { StepNodeData } from '../../types';
import { ExpressionViewer } from './ExpressionViewer';
import { FadableContainer } from '../../components/FadableContainer';
import { NodeComment } from '../NodeComment';
import { StyledIconButton } from '../../components/StyledIconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';
import {
  RELATIONSHIP_IF_INPUT_HANDLE,
  toInputHandleId,
  toOutputHandleId,
} from '../../hooks/useDependencyEdges';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';

type StepNodeProps = NodeProps<Node<StepNodeData>> & {
  disabled?: boolean;
};

const relationshipHandleStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: `1px solid ${alpha(NodeTypeColors.step, 0.8)}`,
  backgroundColor: NodeTypeColors.step,
  boxShadow: `0 0 0 3px ${alpha(NodeTypeColors.step, 0.18)}`,
  pointerEvents: 'all' as const,
  cursor: 'crosshair',
  zIndex: 3200,
};

const inferTypeFromValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'undefined') return 'unknown';
  return typeof value;
};

const sanitizeTestId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, '_');

const StepNode = ({ selected, id, data, disabled = false }: StepNodeProps) => {
  const theme = useTheme();
  const {
    relationshipMode,
    isStepRelated,
    getIncomingConnectionCount,
    getOutgoingConnectionCount,
    getParameterType,
  } = useGraphPerformanceContext();

  const canAcceptIncoming = hasIncomingCapacity(
    'step',
    getIncomingConnectionCount(id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'step',
    getOutgoingConnectionCount(id),
  );

  const inputSchemaProperties =
    ((data.schema as any)?.input?.properties as
      | Record<string, { type?: string }>
      | undefined) ?? undefined;

  const outputSchemaProperties =
    ((data.schema as any)?.output?.properties as
      | Record<string, { type?: string }>
      | undefined) ?? undefined;

  const inputFieldKeys = useMemo(() => {
    if (
      inputSchemaProperties &&
      Object.keys(inputSchemaProperties).length > 0
    ) {
      return Object.keys(inputSchemaProperties);
    }

    if (data.formData && typeof data.formData === 'object') {
      return Object.keys(data.formData);
    }

    return [];
  }, [inputSchemaProperties, data.formData]);

  const outputFieldKeys = useMemo(() => {
    if (!outputSchemaProperties) {
      return [];
    }
    return Object.keys(outputSchemaProperties);
  }, [outputSchemaProperties]);

  const hasIoContent = true;
  const isLightTheme = theme.palette.mode === 'light';

  const persistedExpanded = Boolean(data.uiState?.ioExpanded);
  const isForceExpanded = relationshipMode && isStepRelated(id);
  const isExpanded = hasIoContent && (persistedExpanded || isForceExpanded);

  const ioSectionBackgroundColor = isLightTheme
    ? theme.palette.grey[100]
    : alpha(theme.palette.grey[700], 0.46);
  const ioSectionBorderColor = isLightTheme
    ? theme.palette.divider
    : alpha(theme.palette.divider, 0.8);
  const ioRowBackgroundColor = isLightTheme
    ? theme.palette.common.white
    : alpha(theme.palette.background.paper, 0.26);
  const ioRowBorder = isLightTheme
    ? `1px solid ${theme.palette.divider}`
    : `1px solid ${alpha(theme.palette.divider, 0.42)}`;
  const ioHeadingColor = isLightTheme
    ? theme.palette.text.primary
    : theme.palette.text.secondary;

  const toggleIoExpanded = () => {
    if (!hasIoContent || isForceExpanded) {
      return;
    }

    data.onChange(id, {
      uiState: {
        ...(data.uiState ?? {}),
        ioExpanded: !persistedExpanded,
      },
    } as any);
  };

  const renderTypeChip = (typeLabel: string) => {
    if (!typeLabel) {
      return null;
    }

    return (
      <Chip
        size="small"
        label={typeLabel}
        sx={{
          height: 18,
          fontSize: '0.62rem',
          fontWeight: 700,
          backgroundColor: alpha(NodeTypeColors.step, 0.1),
          color: NodeTypeColors.step,
          '& .MuiChip-label': {
            px: 0.75,
          },
        }}
      />
    );
  };

  let toggleTooltipTitle = 'Show step inputs/outputs';
  if (isForceExpanded) {
    toggleTooltipTitle = 'Expanded while relationship mode is enabled';
  } else if (isExpanded) {
    toggleTooltipTitle = 'Hide step inputs/outputs';
  }

  let toggleHoverBackgroundColor = theme.palette.grey[200];
  if (isExpanded) {
    toggleHoverBackgroundColor = NodeTypeColors.step;
  } else if (theme.palette.mode === 'dark') {
    toggleHoverBackgroundColor = theme.palette.grey[700];
  }

  let commentHoverBackgroundColor = theme.palette.grey[200];
  if (theme.palette.mode === 'dark') {
    commentHoverBackgroundColor = theme.palette.grey[700];
  }

  return (
    <Box
      sx={{
        minWidth: 180,
        maxWidth: 360,
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
        '& .node-controls-hotspot:hover + .node-comment-badge, & .node-comment-badge:hover, & .node-comment-badge:focus-within, &:focus-within .node-comment-badge':
          {
            opacity: 1,
            pointerEvents: 'auto',
          },
        pointerEvents: disabled ? 'none' : 'auto',
        outline: 'none',
      }}
      data-testid={`step-node-${id}`}
      data-interactive="true"
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          left: 0,
          right: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
        }}
      >
        {!disabled && <Box>Step</Box>}
      </Box>

      <Box
        className="node-controls-hotspot"
        sx={{
          position: 'absolute',
          top: -22,
          right: -22,
          width: 58,
          height: 58,
          borderTopRightRadius: '20px',
          pointerEvents: 'auto',
          zIndex: 4500,
        }}
      />

      <NodeComment
        comment={data.comment}
        onChange={val => data.onChange(id, { ...data, comment: val })}
        disabled={disabled}
        color={NodeTypeColors.step}
        selected
        containerSx={{
          top: -18,
          right: -10,
          left: 'auto',
          zIndex: 5000,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.16s ease',
          px: 0.35,
          py: 0.35,
          borderRadius: '999px',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.25,
          backgroundColor:
            theme.palette.mode === 'dark'
              ? theme.palette.grey[900]
              : theme.palette.grey[50],
          border: `1px solid ${theme.palette.divider}`,
        }}
        buttonSx={{
          width: 24,
          height: 24,
          minWidth: 24,
          padding: 0,
          border: 'none',
          boxShadow: 'none',
          backgroundColor: data.comment ? NodeTypeColors.step : 'transparent',
          color: data.comment
            ? theme.palette.getContrastText(NodeTypeColors.step)
            : theme.palette.text.primary,
          '&:hover': {
            backgroundColor: data.comment
              ? NodeTypeColors.step
              : commentHoverBackgroundColor,
            border: 'none',
            boxShadow: 'none',
          },
        }}
        slotAfterSeparator="horizontal"
        slotAfter={
          hasIoContent ? (
            <Box
              className="node-output-toggle-badge"
              data-testid="node-output-toggle-badge"
            >
              <Tooltip
                title={toggleTooltipTitle}
                enterDelay={900}
                enterNextDelay={700}
              >
                <span>
                  <StyledIconButton
                    data-testid="node-output-toggle-button"
                    size="small"
                    onClick={toggleIoExpanded}
                    disabled={isForceExpanded}
                    sx={{
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      padding: 0,
                      border: 'none',
                      boxShadow: 'none',
                      backgroundColor: isExpanded
                        ? NodeTypeColors.step
                        : 'transparent',
                      color: isExpanded
                        ? theme.palette.getContrastText(NodeTypeColors.step)
                        : theme.palette.text.primary,
                      '&:hover': {
                        backgroundColor: toggleHoverBackgroundColor,
                        border: 'none',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: '0.9rem' }} />
                  </StyledIconButton>
                </span>
              </Tooltip>
            </Box>
          ) : undefined
        }
      />

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
          minHeight: '64px',
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

        <Box
          data-testid="step-node-input-row-if"
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1,
            minHeight: 24,
            pl: 1,
            pr: 0.5,
            py: 0.55,
            borderRadius: '8px',
            backgroundColor: ioRowBackgroundColor,
            border: ioRowBorder,
          }}
        >
          <FlowHandle
            id={RELATIONSHIP_IF_INPUT_HANDLE}
            type="target"
            position={Position.Left}
            style={{
              ...relationshipHandleStyle,
              left: 0,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          <Typography
            sx={{ fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}
          >
            if
          </Typography>

          {data.if ? (
            <Tooltip title={data.if} placement="top" arrow>
              <Box sx={{ flex: 1, minWidth: 0, pl: 0.1 }}>
                <ExpressionViewer
                  value={data.if}
                  getParameterType={getParameterType}
                />
              </Box>
            </Tooltip>
          ) : (
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              No condition
            </Typography>
          )}
        </Box>

        {isExpanded && (
          <Box
            data-testid="step-node-io-section"
            sx={{
              mt: 0.5,
              p: 1,
              borderRadius: '12px',
              border: `1px solid ${ioSectionBorderColor}`,
              backgroundColor: ioSectionBackgroundColor,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: ioHeadingColor,
                fontWeight: 700,
              }}
            >
              Inputs
            </Typography>

            {inputFieldKeys.map(inputKey => {
              const displayType =
                inputSchemaProperties?.[inputKey]?.type ??
                inferTypeFromValue(
                  (data.formData as Record<string, unknown>)?.[inputKey],
                );

              return (
                <Box
                  key={inputKey}
                  data-testid={`step-node-input-row-${sanitizeTestId(
                    inputKey,
                  )}`}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    minHeight: 22,
                    pl: 1,
                    pr: 0.5,
                    borderRadius: '8px',
                    backgroundColor: ioRowBackgroundColor,
                    border: ioRowBorder,
                  }}
                >
                  <FlowHandle
                    id={toInputHandleId(inputKey)}
                    type="target"
                    position={Position.Left}
                    style={{
                      ...relationshipHandleStyle,
                      left: 0,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {inputKey}
                  </Typography>
                  {renderTypeChip(displayType)}
                </Box>
              );
            })}

            {inputFieldKeys.length === 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                No input fields found
              </Typography>
            )}

            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                fontSize: '0.62rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: ioHeadingColor,
                fontWeight: 700,
              }}
            >
              Outputs
            </Typography>

            {outputFieldKeys.map(outputKey => {
              const displayType =
                outputSchemaProperties?.[outputKey]?.type ?? 'unknown';

              return (
                <Box
                  key={outputKey}
                  data-testid={`step-node-output-row-${sanitizeTestId(
                    outputKey,
                  )}`}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    minHeight: 22,
                    pl: 1,
                    pr: 0.5,
                    borderRadius: '8px',
                    backgroundColor: ioRowBackgroundColor,
                    border: ioRowBorder,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {outputKey}
                  </Typography>
                  {renderTypeChip(displayType)}
                  <FlowHandle
                    id={toOutputHandleId(outputKey)}
                    type="source"
                    position={Position.Right}
                    style={{
                      ...relationshipHandleStyle,
                      right: 0,
                      top: '50%',
                      transform: 'translate(50%, -50%)',
                    }}
                  />
                </Box>
              );
            })}

            {outputFieldKeys.length === 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                No output fields found
              </Typography>
            )}

            {relationshipMode && isForceExpanded && (
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                Expanded by relationship mode
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {!disabled && (
        <>
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
        </>
      )}
    </Box>
  );
};

export default StepNode;
