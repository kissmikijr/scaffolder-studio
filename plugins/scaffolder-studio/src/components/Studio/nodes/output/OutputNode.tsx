import { NodeProps, Position, Node } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import {
  Box,
  Typography,
  useTheme,
  Stack,
  Tooltip,
  alpha,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import InfoIcon from '@mui/icons-material/Info';
import { OutputNodeData } from '../../types';
import { SELECTED_BORDER_COLOR } from '../../styles';
import { hasIncomingCapacity } from '../../utils/connectionLimits';
import { useGraphPerformanceContext } from '../../GraphPerformanceContext';
import { useNodeLintIssues } from '../../TemplateLintContext';
import {
  NodeLintBadge,
  getLintSeverityColor,
  getNodeLintSeverity,
  getNodeLintTooltipTitle,
} from '../NodeLintBadge';

const OutputNode = ({
  id,
  selected,
  data,
  disabled = false,
  showLintBadge = true,
}: NodeProps<Node<OutputNodeData>> & {
  disabled?: boolean;
  showLintBadge?: boolean;
}) => {
  const theme = useTheme();
  const lintIssues = useNodeLintIssues(id);
  const { getIncomingConnectionCount } = useGraphPerformanceContext();
  const canAcceptIncoming = hasIncomingCapacity(
    'templateOutput',
    getIncomingConnectionCount(id),
  );
  const lintSeverity = getNodeLintSeverity(lintIssues);
  const lintSeverityColor = getLintSeverityColor(theme, lintSeverity);
  const lintBorderColor =
    lintSeverityColor ??
    (selected ? SELECTED_BORDER_COLOR : theme.palette.divider);
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

        <Stack spacing={0.5} sx={{ px: 1.5, py: 1 }}>
          {data?.links?.map((link, idx) => (
            <Box
              key={`link-${idx}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <LaunchIcon sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
              <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem' }}>
                {link.title}
              </Typography>
            </Box>
          ))}
          {data?.text?.map((text, idx) => (
            <Box
              key={`text-${idx}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <InfoIcon sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
              <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem' }}>
                {text.title}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };
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
          width: 260,
          borderRadius: '20px',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `2px solid ${lintBorderColor}`,
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
          {!disabled && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              Output
            </Typography>
          )}
        </Box>
        {renderContent()}

        {!disabled && (
          <>
            <Handle
              nodeId={id}
              type="target"
              position={Position.Top}
              id="top"
              disabled={!canAcceptIncoming}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Right}
              id="right"
              disabled={!canAcceptIncoming}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Bottom}
              id="bottom"
              disabled={!canAcceptIncoming}
            />
            <Handle
              nodeId={id}
              type="target"
              position={Position.Left}
              id="left"
              disabled={!canAcceptIncoming}
            />
          </>
        )}
      </Box>
    </Tooltip>
  );
};

export default OutputNode;
