import { useMemo, type CSSProperties } from 'react';
import { NodeProps, Position, Node, Handle as FlowHandle } from '@xyflow/react';
import { Box, useTheme, Tooltip, Typography, alpha, Chip } from '@mui/material';
import { Handle } from '../../components/Handle';
import { StepNodeData } from '../../types';
import { ExpressionViewer } from './ExpressionViewer';
import { FadableContainer } from '../../components/FadableContainer';
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
import { useNodeLintIssues } from '../../TemplateLintContext';
import {
  NodeLintIcon,
  getLintSeverityColor,
  getNodeLintSeverity,
  getNodeLintTooltipTitle,
} from '../NodeLintBadge';

type StepNodeProps = NodeProps<Node<StepNodeData>> & {
  disabled?: boolean;
  showLintBadge?: boolean;
};

const relationshipHandleStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
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

const StepNode = ({
  selected,
  id,
  data,
  width,
  disabled = false,
  showLintBadge = true,
}: StepNodeProps) => {
  const theme = useTheme();
  const lintIssues = useNodeLintIssues(id);
  const {
    relationshipMode,
    relationshipConnectionInProgress,
    isStepRelated,
    getIncomingConnectionCount,
    getOutgoingConnectionCount,
    getParameterType,
    getRelationshipHandleColor,
  } = useGraphPerformanceContext();

  const canAcceptIncoming = hasIncomingCapacity(
    'step',
    getIncomingConnectionCount(id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'step',
    getOutgoingConnectionCount(id),
  );
  const lintSeverity = getNodeLintSeverity(lintIssues);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  const borderColor = selected ? SELECTED_BORDER_COLOR : theme.palette.divider;

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
  const resolvedNodeWidth =
    typeof width === 'number' && width > 0 ? Math.max(width, 200) : 200;
  const isLightTheme = theme.palette.mode === 'light';

  const persistedExpanded = Boolean(data.uiState?.ioExpanded);
  const isForceExpanded =
    relationshipMode && (isStepRelated(id) || relationshipConnectionInProgress);
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
          lineHeight: 1,
          backgroundColor: alpha(NodeTypeColors.step, 0.1),
          color: NodeTypeColors.step,
          alignSelf: 'center',
          margin: 0.5,
          '& .MuiChip-label': {
            px: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      />
    );
  };

  const getRelationshipHandleVisualStyle = (
    connectedColor?: string,
  ): CSSProperties => {
    const baseColor = connectedColor ?? NodeTypeColors.step;

    if (!connectedColor) {
      return {
        border: `1px solid ${alpha(baseColor, 0.82)}`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: 'none',
      };
    }

    return {
      border: `1px solid ${alpha(baseColor, 0.95)}`,
      backgroundColor: baseColor,
      boxShadow: 'none',
    };
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

  return (
    <Tooltip
      arrow
      enterDelay={150}
      disableHoverListener={lintIssues.length === 0 || disabled}
      title={getNodeLintTooltipTitle(lintIssues)}
    >
      <Box
        sx={{
          width: resolvedNodeWidth,
          minWidth: resolvedNodeWidth,
          maxWidth: resolvedNodeWidth,
          borderRadius: '20px',
          border: `2px solid ${borderColor}`,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: selected ? 3 : 1,
          position: 'relative',
          fontSize: '0.85rem',
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
            cursor: 'pointer',
            boxShadow: 4,
          },
          '&:hover .node-output-toggle-badge, .node-output-toggle-badge:hover, &:focus-within .node-output-toggle-badge':
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
            zIndex: 3,
          }}
        >
          {!disabled && (
            <Box
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {showLintBadge ? <NodeLintIcon nodeId={id} /> : null}
              <Box component="span">Step</Box>
            </Box>
          )}
        </Box>

        {hasIoContent ? (
          <Box
            className="node-output-toggle-badge"
            data-testid="node-output-toggle-badge"
            sx={{
              position: 'absolute',
              top: -18,
              right: -10,
              zIndex: 5000,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.16s ease',
              px: 0.35,
              py: 0.35,
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? theme.palette.grey[900]
                  : theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
            }}
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
        ) : null}

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
                  lineHeight: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  fontWeight: 600,
                  textDecorationLine:
                    lintIssues.length > 0 ? 'underline' : 'none',
                  textDecorationStyle:
                    lintIssues.length > 0 ? 'wavy' : undefined,
                  textDecorationColor:
                    lintIssues.length > 0
                      ? alpha(theme.palette.error.main, 0.92)
                      : undefined,
                  textDecorationThickness:
                    lintIssues.length > 0 ? '2px' : undefined,
                  textUnderlineOffset:
                    lintIssues.length > 0 ? '4px' : undefined,
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

          {data.actionId && (
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
                  ...getRelationshipHandleVisualStyle(
                    getRelationshipHandleColor(
                      id,
                      RELATIONSHIP_IF_INPUT_HANDLE,
                      'target',
                    ),
                  ),
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

              {data.if && (
                <Box sx={{ flex: 1, minWidth: 0, pl: 0.1 }}>
                  <ExpressionViewer
                    value={data.if}
                    getParameterType={getParameterType}
                  />
                </Box>
              )}
            </Box>
          )}

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
                        ...getRelationshipHandleVisualStyle(
                          getRelationshipHandleColor(
                            id,
                            toInputHandleId(inputKey),
                            'target',
                          ),
                        ),
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
                <Typography
                  sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
                >
                  No input fields found
                </Typography>
              )}

              {outputFieldKeys.length > 0 &&
                outputFieldKeys.map((outputKey, index) => {
                  const displayType =
                    outputSchemaProperties?.[outputKey]?.type ?? 'unknown';

                  return (
                    <Box key={outputKey}>
                      {index === 0 && (
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
                      )}
                      <Box
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
                            ...getRelationshipHandleVisualStyle(
                              getRelationshipHandleColor(
                                id,
                                toOutputHandleId(outputKey),
                                'source',
                              ),
                            ),
                            right: 0,
                            top: '50%',
                            transform: 'translate(50%, -50%)',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          )}
        </Box>

        {!disabled && (
          <>
            <Handle
              nodeId={id}
              type="source"
              position={Position.Top}
              id="top"
              disabled={!canAcceptOutgoing}
              data-testid={`step-node-source-handle-top-${id}`}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Right}
              id="right"
              disabled={!canAcceptOutgoing}
              data-testid={`step-node-source-handle-right-${id}`}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Bottom}
              id="bottom"
              disabled={!canAcceptOutgoing}
              data-testid={`step-node-source-handle-bottom-${id}`}
            />
            <Handle
              nodeId={id}
              type="source"
              position={Position.Left}
              id="left"
              disabled={!canAcceptOutgoing}
              data-testid={`step-node-source-handle-left-${id}`}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Top}
              id="top"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
              data-testid={`step-node-handle-top-${id}`}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Right}
              id="right"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
              data-testid={`step-node-handle-right-${id}`}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Bottom}
              id="bottom"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
              data-testid={`step-node-handle-bottom-${id}`}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Left}
              id="left"
              disabled={!canAcceptIncoming}
              pairedSourceOnSameSide={canAcceptOutgoing}
              data-testid={`step-node-handle-left-${id}`}
            />
          </>
        )}
      </Box>
    </Tooltip>
  );
};

export default StepNode;
