import { Box, Typography, useTheme, type Theme } from '@mui/material';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import type { TemplateLintIssue } from '@kissmiklosjr/scaffolder-studio-linter';
import { useTemplateLintContext } from '../TemplateLintContext';

const SEVERITY_ORDER = {
  error: 3,
  warning: 2,
  info: 1,
} as const;

const getHighestSeverity = (
  issues: TemplateLintIssue[],
): TemplateLintIssue['severity'] =>
  issues.reduce<TemplateLintIssue['severity']>(
    (highest, issue) =>
      SEVERITY_ORDER[issue.severity] > SEVERITY_ORDER[highest]
        ? issue.severity
        : highest,
    'info',
  );

const severityLabel = (severity: TemplateLintIssue['severity']) =>
  severity.charAt(0).toUpperCase() + severity.slice(1);

const getSeverityTextColor = (severity: TemplateLintIssue['severity']) => {
  if (severity === 'error') {
    return 'error.light';
  }
  if (severity === 'warning') {
    return 'warning.light';
  }

  return 'info.light';
};

const getSeverityIcon = (severity: TemplateLintIssue['severity']) => {
  if (severity === 'error') {
    return ErrorRoundedIcon;
  }
  if (severity === 'warning') {
    return WarningRoundedIcon;
  }

  return InfoRoundedIcon;
};

export const getNodeLintSeverity = (
  issues: TemplateLintIssue[],
): TemplateLintIssue['severity'] | null => {
  if (issues.length === 0) {
    return null;
  }

  return getHighestSeverity(issues);
};

export const getLintSeverityColor = (
  theme: Theme,
  severity: TemplateLintIssue['severity'] | null,
) => {
  if (severity === 'error') return theme.palette.error.main;
  if (severity === 'warning') return theme.palette.warning.main;
  if (severity === 'info') return theme.palette.info.main;
  return null;
};

export const getNodeLintTooltipTitle = (issues: TemplateLintIssue[]) => {
  if (issues.length === 0) {
    return '';
  }

  return (
    <Box sx={{ py: 0.5, maxWidth: 320 }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800 }}>
        {issues.length} issue{issues.length === 1 ? '' : 's'}
      </Typography>
      {issues.map(issue => (
        <Box key={issue.id}>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: getSeverityTextColor(issue.severity),
            }}
          >
            {severityLabel(issue.severity)}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', lineHeight: 1.35 }}>
            {issue.message}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const NodeLintBadge = ({
  nodeId,
  top = -10,
  left = -10,
}: {
  nodeId: string;
  top?: number;
  left?: number;
}) => {
  const theme = useTheme();
  const { issuesByNodeId } = useTemplateLintContext();
  const issues = issuesByNodeId.get(nodeId) ?? [];

  if (issues.length === 0) {
    return null;
  }

  const severity = getHighestSeverity(issues);
  const severityColor = getLintSeverityColor(theme, severity);
  const Icon = getSeverityIcon(severity);

  return (
    <Box
      data-testid={`node-lint-badge-${nodeId}`}
      sx={{
        position: 'absolute',
        top,
        left,
        zIndex: 1000,
        width: 22,
        height: 22,
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        bgcolor: theme.palette.background.paper,
        color: severityColor ?? theme.palette.warning.main,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[1],
      }}
    >
      <Icon sx={{ fontSize: '0.82rem' }} />
    </Box>
  );
};
