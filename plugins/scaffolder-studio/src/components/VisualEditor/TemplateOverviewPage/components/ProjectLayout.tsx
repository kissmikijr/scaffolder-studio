import React, { Dispatch, SetStateAction } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectListRow } from './ProjectListRow';
import { Box } from '@mui/material';
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
};

export const ProjectLayout = ({
  projects,
  setContextMenu,
  selectedProjectIds,
  setSelectedProjectIds,
  viewMode = 'card',
}: ProjectLayoutProprs) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX - 2,
      mouseY: e.clientY - 4,
    });
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

  if (viewMode === 'list') {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {projects?.map(project => (
          <ProjectListRow
            key={project.id}
            project={project}
            onContextMenu={handleContextMenu}
            isSelected={selectedProjectIds?.includes(project.id)}
            onSelect={e => handleSelect(project.id, e)}
          />
        ))}
      </Box>
    );
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
          onContextMenu={handleContextMenu}
          isSelected={selectedProjectIds?.includes(project.id)}
          onSelect={e => handleSelect(project.id, e)}
        />
      ))}
    </Box>
  );
};
