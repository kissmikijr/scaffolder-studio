import React, { Dispatch, SetStateAction } from 'react';
import { ProjectCard } from './ProjectCard';
import { Box } from '@mui/material';
import { VisualTemplateProject } from '../../types';

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
};

export const ProjectLayout = ({
  projects,
  setContextMenu,
  selectedProjectIds,
  setSelectedProjectIds,
}: ProjectLayoutProprs) => {
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
          onContextMenu={e => {
            e.preventDefault();
            setContextMenu({
              mouseX: e.clientX - 2,
              mouseY: e.clientY - 4,
            });
          }}
          isSelected={selectedProjectIds?.includes(project.id)}
          onSelect={e => {
            if (e.shiftKey) {
              // Shift+click: Add/remove from selection (multi-select)
              setSelectedProjectIds(prev =>
                prev.includes(project.id)
                  ? prev.filter(id => id !== project.id)
                  : [...prev, project.id],
              );
            } else {
              // Regular click: Select only this item (single select)
              setSelectedProjectIds([project.id]);
            }
          }}
        />
      ))}
    </Box>
  );
};
