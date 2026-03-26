import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import type { Node } from '@xyflow/react';
import type { TemplateLintIssue } from '@kissmiklosjr/scaffolder-studio-linter';
import type { AllNodeData } from './types';
import type { TemplateLintState } from './TemplateLintContext';
import {
  isOutputNode,
  isParametersNode,
  isPropertyNode,
  isStepNode,
  isTemplateNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';

type LintIssuesTabProps = {
  lintState: TemplateLintState;
  nodes: Node<AllNodeData>[];
  onSelectNode: (nodeId: string) => void;
};

const SEVERITY_WEIGHT = {
  error: 3,
  warning: 2,
  info: 1,
} as const;

const getHighestSeverity = (
  issues: TemplateLintIssue[],
): TemplateLintIssue['severity'] =>
  issues.reduce<TemplateLintIssue['severity']>(
    (highest, issue) =>
      SEVERITY_WEIGHT[issue.severity] > SEVERITY_WEIGHT[highest]
        ? issue.severity
        : highest,
    'info',
  );

const formatSeverity = (severity: TemplateLintIssue['severity']) =>
  severity.charAt(0).toUpperCase() + severity.slice(1);

const getNodeLabel = (node?: Node<AllNodeData>) => {
  if (!node) {
    return 'Unknown node';
  }

  if (isTemplateNode(node)) {
    return (node.data.name || 'Untitled template').trim();
  }

  if (isStepNode(node)) {
    return (
      node.data.name ||
      node.data.stepId ||
      node.data.actionId ||
      'Unnamed step'
    ).trim();
  }

  if (isPropertyNode(node)) {
    return (node.data.name || 'Unnamed property').trim();
  }

  if (isParametersNode(node)) {
    return (node.data.title || 'Parameters group').trim();
  }

  if (isOutputNode(node)) {
    return 'Template output';
  }

  return `${node.type} node`;
};

const getNodeTypeLabel = (node?: Node<AllNodeData>) => {
  if (!node) {
    return 'Unknown';
  }

  if (isTemplateNode(node)) return 'Template';
  if (isStepNode(node)) return 'Step';
  if (isPropertyNode(node)) return 'Property';
  if (isParametersNode(node)) return 'Parameters';
  if (isOutputNode(node)) return 'Output';
  if (node.type === 'prefab') return 'Prefab';
  return node.type;
};

export const LintIssuesTab = ({
  lintState,
  nodes,
  onSelectNode,
}: LintIssuesTabProps) => {
  const theme = useTheme();
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const entries = Array.from(lintState.issuesByNodeId.entries())
    .map(([nodeId, issues]) => ({
      nodeId,
      issues,
      severity: getHighestSeverity(issues),
      node: nodeById.get(nodeId),
    }))
    .sort((left, right) => {
      const severityDiff =
        SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return getNodeLabel(left.node).localeCompare(getNodeLabel(right.node));
    });

  if (lintState.isLoading && entries.length === 0) {
    return (
      <Box sx={{ px: 1, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Running lint checks...
        </Typography>
      </Box>
    );
  }

  if (lintState.error) {
    return (
      <Box sx={{ px: 1, py: 2 }}>
        <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>
          Lint unavailable
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {lintState.error.message}
        </Typography>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ px: 1, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No lint issues.
        </Typography>
      </Box>
    );
  }

  return (
    <List
      disablePadding
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      {entries.map(entry => {
        let severityColor = theme.palette.info.main;
        if (entry.severity === 'error') {
          severityColor = theme.palette.error.main;
        } else if (entry.severity === 'warning') {
          severityColor = theme.palette.warning.main;
        }

        return (
          <ListItemButton
            key={entry.nodeId}
            onClick={() => onSelectNode(entry.nodeId)}
            alignItems="flex-start"
            sx={{
              display: 'block',
              borderRadius: '16px',
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              px: 1.25,
              py: 1,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 0.75,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                  noWrap
                >
                  {getNodeLabel(entry.node)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: 'text.secondary',
                  }}
                >
                  {getNodeTypeLabel(entry.node)}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${formatSeverity(entry.severity)} ${
                  entry.issues.length
                }`}
                sx={{
                  color: severityColor,
                  borderColor: severityColor,
                  backgroundColor: 'transparent',
                  fontWeight: 700,
                }}
                variant="outlined"
              />
            </Box>
            <Divider sx={{ mb: 0.75 }} />
            <ListItemText
              primaryTypographyProps={{
                sx: {
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  lineHeight: 1.35,
                },
              }}
              secondaryTypographyProps={{
                sx: {
                  fontSize: '0.72rem',
                  color: 'text.secondary',
                  lineHeight: 1.35,
                  mt: 0.35,
                },
              }}
              primary={entry.issues[0]?.message ?? 'Issue'}
              secondary={
                entry.issues.length > 1
                  ? `${entry.issues.length - 1} more issue${
                      entry.issues.length - 1 === 1 ? '' : 's'
                    }`
                  : 'Click to focus node'
              }
            />
          </ListItemButton>
        );
      })}
    </List>
  );
};
