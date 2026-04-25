import { NodeProps, Position, Node } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { FadableContainer } from '../../components/FadableContainer';
import {
  Typography,
  useTheme,
  Box,
  Divider,
  Tooltip,
  alpha,
} from '@mui/material';
import { TemplateNodeData } from '../../types';
import { MarkdownContent } from '@backstage/core-components';

import { SELECTED_BORDER_COLOR } from '../../styles';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';
import { useNodeLintIssues } from '../../TemplateLintContext';
import {
  NodeLintIcon,
  getLintSeverityColor,
  getNodeLintSeverity,
  getNodeLintTooltipTitle,
} from '../NodeLintBadge';

const TemplateNode = ({
  id,
  selected,
  data,
}: NodeProps<Node<TemplateNodeData>>) => {
  const theme = useTheme();
  const lintIssues = useNodeLintIssues(id);
  const { getTemplateOutgoingSlots } = useGraphPerformanceContext();
  const templateSlots = getTemplateOutgoingSlots(id);
  const lintSeverity = getNodeLintSeverity(lintIssues);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  const borderColor = selected ? SELECTED_BORDER_COLOR : theme.palette.divider;
  return (
    <Tooltip
      arrow
      enterDelay={150}
      disableHoverListener={lintIssues.length === 0}
      title={getNodeLintTooltipTitle(lintIssues)}
    >
      <Box
        sx={{
          width: 260,
          position: 'relative',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          pointerEvents: 'auto',
          borderRadius: '20px',
          border: `2px solid ${borderColor}`,
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
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <NodeLintIcon nodeId={id} />
            <Box component="span">Template</Box>
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: '#bd93f9', // Dracula orange
            color: '#282a36', // Dracula background as text color (good contrast)
            px: 1.5,
            py: 0.5,
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            width: '100%',
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', justifyContent: 'center' }}
          >
            {data.name || '—'}
          </Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Divider />
        </Box>

        <Box sx={{ px: 1, pb: 1 }}>
          <Box mb={1}>
            <Typography variant="subtitle2">Owner</Typography>
            <Box
              sx={{
                backgroundColor: theme.palette.action.hover,
                borderRadius: '12px',
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
                maxWidth: '100%',
                marginTop: 0.5,
              }}
            >
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
                <span style={{ fontWeight: 600 }}>{data.owner || '—'}</span>
              </FadableContainer>
            </Box>
          </Box>

          <Box mb={1}>
            <Typography variant="subtitle2">Description</Typography>
            <Box
              sx={{
                maxWidth: '100%',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                fontSize: '0.7rem',
                lineHeight: '1.2',
                maxHeight: '4.8em',
              }}
            >
              <MarkdownContent content={data.description} />
            </Box>
          </Box>

          <Handle
            nodeId={id}
            type="source"
            id="top"
            position={Position.Top}
            disabled={!templateSlots.hasAny}
          />
          <Handle
            nodeId={id}
            id="right"
            type="source"
            position={Position.Right}
            disabled={templateSlots.hasStep}
          />
          <Handle
            nodeId={id}
            type="source"
            id="bottom"
            position={Position.Bottom}
            disabled={templateSlots.hasParameters}
          />
          <Handle
            nodeId={id}
            type="source"
            id="left"
            position={Position.Left}
            disabled={templateSlots.hasOutput}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

export default TemplateNode;
