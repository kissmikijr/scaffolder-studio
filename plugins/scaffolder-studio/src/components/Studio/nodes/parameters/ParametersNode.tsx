import { NodeProps, Position, Node, NodeResizer } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { Box, useTheme, alpha, Tooltip } from '@mui/material';
import { ParametersNodeData } from '../../types';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

import { SELECTED_BORDER_COLOR } from '../../styles';
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

const ParametersNode = ({
  id,
  selected,
  data,
}: NodeProps<Node<ParametersNodeData>>) => {
  const theme = useTheme();
  const { issuesByNodeId } = useTemplateLintContext();
  const lintIssues = issuesByNodeId.get(id) ?? [];
  const { getIncomingConnectionCount, getOutgoingConnectionCount } =
    useGraphPerformanceContext();
  const canAcceptIncoming = hasIncomingCapacity(
    'parameters',
    getIncomingConnectionCount(id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'parameters',
    getOutgoingConnectionCount(id),
  );
  const isLightTheme = theme.palette.mode === 'light';
  const parametersAccent = isLightTheme ? '#14B8A6' : NodeTypeColors.parameters;
  const lintSeverity = getNodeLintSeverity(lintIssues);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  const lintBorderColor =
    lintSeverityColor ??
    (selected
      ? SELECTED_BORDER_COLOR
      : alpha(parametersAccent, isLightTheme ? 0.55 : 0.8));

  return (
    <>
      <NodeResizer
        color={SELECTED_BORDER_COLOR}
        isVisible={selected}
        minWidth={250}
        minHeight={150}
        handleStyle={{ width: 10, height: 10, borderRadius: 0 }}
        lineStyle={{ borderWidth: 6, opacity: 0 }}
      />
      <Tooltip
        arrow
        enterDelay={150}
        disableHoverListener={lintIssues.length === 0}
        title={getNodeLintTooltipTitle(lintIssues)}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            px: 1,
            pt: 3, // Create space for title
            position: 'relative',
            borderRadius: '12px',
            backgroundColor: alpha(parametersAccent, isLightTheme ? 0.12 : 0.1),
            color: theme.palette.text.primary,
            pointerEvents: 'all',
            border: `2px ${selected ? 'solid' : 'dashed'} ${lintBorderColor}`,
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
              cursor: 'grab',
            },
            outline: 'none',
          }}
          data-interactive="true"
        >
          <NodeLintBadge nodeId={id} />
          <Box
            sx={{
              position: 'absolute',
              top: -12,
              left: 12,
              px: 1,
              backgroundColor: isLightTheme ? '#99F6E4' : '#4fffe0',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: isLightTheme ? '#134E4A' : '#282a36',
              border: `1px solid ${alpha(
                parametersAccent,
                isLightTheme ? 0.35 : 0.2,
              )}`,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {data.title || 'Parameters Group'}
          </Box>

          <Handle
            id="top"
            type="target"
            position={Position.Top}
            disabled={!canAcceptIncoming}
          />
          <Handle
            id="right"
            type="target"
            position={Position.Right}
            disabled={!canAcceptIncoming}
          />
          <Handle
            id="bottom"
            type="target"
            position={Position.Bottom}
            disabled={!canAcceptIncoming}
          />
          <Handle
            id="left"
            type="target"
            position={Position.Left}
            disabled={!canAcceptIncoming}
          />

          <Handle
            id="top"
            type="source"
            position={Position.Top}
            disabled={!canAcceptOutgoing}
          />
          <Handle
            id="right"
            type="source"
            position={Position.Right}
            disabled={!canAcceptOutgoing}
          />
          <Handle
            id="bottom"
            type="source"
            position={Position.Bottom}
            disabled={!canAcceptOutgoing}
          />
          <Handle
            id="left"
            type="source"
            position={Position.Left}
            disabled={!canAcceptOutgoing}
          />
        </Box>
      </Tooltip>
    </>
  );
};

export default ParametersNode;
