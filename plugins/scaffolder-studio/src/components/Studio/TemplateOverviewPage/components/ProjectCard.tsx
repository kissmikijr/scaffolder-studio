import { MouseEvent } from 'react';
import { Grid, Typography, Box } from '@mui/material';
import { ProjectThumbnail } from './ProjectThumbnail';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { VisualTemplateProject } from '../../types';

type ProjectCardProprs = {
  project: VisualTemplateProject;
  onContextMenu: (e: MouseEvent) => void;
  isSelected: boolean;
  onSelect: (e: MouseEvent) => void;
};

const formatElapsedTime = (dateString: string) => {
  const date = DateTime.fromISO(dateString);

  if (!date.isValid) {
    return 'Invalid date';
  }

  const now = DateTime.now();
  const diff = now
    .diff(date, ['years', 'months', 'days', 'hours', 'minutes', 'seconds'])
    .toObject();

  if (diff.years && diff.years > 0) {
    return `${Math.floor(diff.years)} ${Math.floor(diff.years) === 1 ? 'year' : 'years'
      } ago`;
  }
  if (diff.months && diff.months > 0) {
    return `${Math.floor(diff.months)} ${Math.floor(diff.months) === 1 ? 'month' : 'months'
      } ago`;
  }
  if (diff.days && diff.days > 0) {
    return `${Math.floor(diff.days)} ${Math.floor(diff.days) === 1 ? 'day' : 'days'
      } ago`;
  }
  if (diff.hours && diff.hours > 0) {
    return `${Math.floor(diff.hours)} ${Math.floor(diff.hours) === 1 ? 'hour' : 'hours'
      } ago`;
  }
  if (diff.minutes && diff.minutes > 0) {
    return `${Math.floor(diff.minutes)} ${Math.floor(diff.minutes) === 1 ? 'minute' : 'minutes'
      } ago`;
  }
  return 'just now';
};

export const ProjectCard = ({
  project,
  onContextMenu,
  isSelected,
  onSelect,
}: ProjectCardProprs) => {
  const navigate = useNavigate();

  const handleOpenProject = (id: string) => {
    navigate(`/scaffolder-studio/templates/${id}/form`);
  };

  return (
    <Grid
      component="div"
      key={project.id}
      data-testid="template-card"
      onDoubleClick={() => handleOpenProject(project.id)}
      onClick={e => {
        e.stopPropagation();
        if (e.shiftKey) {
          e.preventDefault();
        }
        onSelect(e);
      }}
      onContextMenu={onContextMenu}
      sx={{
        cursor: 'default',
        width: '100%',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          border: '2px solid', // Always 2px to avoid layout shift
          borderColor: isSelected ? 'primary.main' : 'transparent',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          overflow: 'hidden',
          transition: 'border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          boxShadow: isSelected ? 4 : 1,
        }}
      >
        <ProjectThumbnail
          nodes={project.nodes}
          edges={project.edges}
          projectId={project.id}
        />

        <Box
          sx={{
            p: 1,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project?.metadata?.name || 'Untitled'}
          </Typography>

          {project?.metadata?.description && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                lineHeight: 1.4,
              }}
            >
              {project.metadata.description}
            </Typography>
          )}

          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Edited {formatElapsedTime(project.updated)}
            </Typography>
            {project.published_at && (
              <Typography variant="caption" color="text.secondary">
                Published{' '}
                {(() => {
                  const publishedDate = DateTime.fromISO(project.published_at);
                  return publishedDate.isValid
                    ? publishedDate.toLocaleString(DateTime.DATE_MED)
                    : 'Invalid date';
                })()}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Grid>
  );
};
