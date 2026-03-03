import { Edge, useReactFlow } from '@xyflow/react';
import { Box, Typography, Paper } from '@mui/material';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

interface EdgeSideContentProps {
  edge: Edge;
}

export const EdgeSideContent = ({ edge }: EdgeSideContentProps) => {
  const { getNode } = useReactFlow();
  const sourceNode = getNode(edge.source);
  const targetNode = getNode(edge.target);

  const getDisplayName = (node: any) => {
    if (!node) return 'Unknown';
    return node.data?.name || node.data?.title || 'Unknown';
  };

  const getDisplayType = (node: any) => {
    if (!node) return 'Unknown';
    if (node.type === 'template') return 'Template';
    if (node.type === 'step') return 'Step';
    if (node.type === 'parameters') return 'Parameters';
    if (node.type === 'templateOutput') return 'Output';
    if (node.type === 'property') return 'Property';
    if (node.type === 'prefab') return 'Prefab';
    return node.type;
  };

  const getTypeColor = (node: any) => {
    if (!node) return NodeTypeColors.unknown;
    if (node.type === 'template') return NodeTypeColors.template;
    if (node.type === 'step') return NodeTypeColors.step;
    if (node.type === 'parameters') return NodeTypeColors.parameters;
    if (node.type === 'templateOutput') return NodeTypeColors.templateOutput;
    return NodeTypeColors.unknown;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            backgroundColor: 'action.hover',
            borderLeft: `4px solid ${getTypeColor(sourceNode)}`,
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            Source
          </Typography>
          <Typography variant="subtitle2">
            {getDisplayName(sourceNode)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getDisplayType(sourceNode)}
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'center', opacity: 0.5 }}>
          <Box sx={{ height: 20, width: 2, backgroundColor: 'divider' }} />
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            backgroundColor: 'action.hover',
            borderLeft: `4px solid ${getTypeColor(targetNode)}`,
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            Target
          </Typography>
          <Typography variant="subtitle2">
            {getDisplayName(targetNode)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getDisplayType(targetNode)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};
