import React from 'react';
import { Box, Typography } from '@mui/material';

import { VisualTemplateProject } from './types';

export const ProjectTitle = ({
  project,
}: {
  project: VisualTemplateProject;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ alignSelf: 'flex-start' }}>
        <Typography variant="h6">
          {project?.metadata?.name || 'Untitled'}
        </Typography>
      </Box>
    </Box>
  );
};
