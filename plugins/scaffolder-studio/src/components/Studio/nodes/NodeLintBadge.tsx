import { Box, Typography, useTheme, type Theme } from '@mui/material';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import type { TemplateLintIssue } from '@kissmiklosjr/scaffolder-studio-linter';
import { useNodeLintIssues } from '../TemplateLintContext';

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

export const NodeLintIcon = ({
  nodeId,
  fontSize = '0.86rem',
}: {
  nodeId: string;
  fontSize?: string;
}) => {
  const theme = useTheme();
  const issues = useNodeLintIssues(nodeId);

  if (issues.length === 0) {
    return null;
  }

  const severity = getHighestSeverity(issues);
  const severityColor = getLintSeverityColor(theme, severity);
  const Icon = getSeverityIcon(severity);

  return (
    <Box
      component="span"
      data-testid={`node-lint-icon-${nodeId}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        pointerEvents: 'none',
        color: severityColor ?? theme.palette.warning.main,
      }}
    >
      <Icon sx={{ fontSize }} />
    </Box>
  );
};

export const NodeLintBadge = NodeLintIcon;
