import React, { Dispatch, SetStateAction } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectListRow } from './ProjectListRow';
import { Box, useTheme } from '@mui/material';
import { VisualTemplateProject } from '../../types';
import type { ViewMode } from '../hooks/useViewMode';

type ProjectLayoutProprs = {
  projects: VisualTemplateProject[];
  setContextMenu: Dispatch<
    SetStateAction<{
      mouseX: number;
      mouseY: number;
    } | null>
  >;
  selectedProjectIds: string[];
  setSelectedProjectIds: Dispatch<SetStateAction<string[]>>;
  viewMode?: ViewMode;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
};

export const ProjectLayout = ({
  projects,
  setContextMenu,
  selectedProjectIds,
  setSelectedProjectIds,
  viewMode = 'card',
  emptyState,
  isLoading,
}: ProjectLayoutProprs) => {
  const theme = useTheme();
  const handleContextMenu = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedProjectIds.includes(projectId)) {
      setContextMenu({
        mouseX: e.clientX - 2,
        mouseY: e.clientY - 4,
      });
    }
  };

  const handleSelect = (projectId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSelectedProjectIds(prev =>
        prev.includes(projectId)
          ? prev.filter(id => id !== projectId)
          : [...prev, projectId],
      );
    } else {
      setSelectedProjectIds([projectId]);
    }
  };

  if (isLoading) {
    return null;
  }

  if (viewMode === 'list') {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden',
          mx: 16,
        }}
      >
        <Box sx={{ overflowX: 'auto', backgroundColor: 'transparent' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'transparent',
            }}
          >
            <Box
              component="thead"
              sx={{
                '& th': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: 'transparent',
                  color: theme.palette.text.secondary,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1.5,
                  px: 2,
                  textAlign: 'left',
                },
              }}
            >
              <tr>
                <th>Nodes</th>
                <th>Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Updated</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </Box>
            <Box component="tbody">
              {projects.length === 0 && emptyState ? (
                <tr>
                  <td colSpan={5} style={{ padding: theme.spacing(4, 2) }}>
                    {emptyState}
                  </td>
                </tr>
              ) : (
                projects?.map(project => (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    onContextMenu={e => handleContextMenu(project.id, e)}
                    isSelected={selectedProjectIds?.includes(project.id)}
                    onSelect={e => handleSelect(project.id, e)}
                  />
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  if (projects.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 3,
      }}
    >
      {projects?.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onContextMenu={e => handleContextMenu(project.id, e)}
          isSelected={selectedProjectIds?.includes(project.id)}
          onSelect={e => handleSelect(project.id, e)}
        />
      ))}
    </Box>
  );
};
