import { MouseEvent } from 'react';
import { Grid, Typography, Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { PublishedTemplate } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import yaml from 'js-yaml';

type PublishedTemplateCardProps = {
  publishedTemplate: PublishedTemplate;
  onContextMenu: (e: MouseEvent) => void;
  isSelected: boolean;
  onSelect: () => void;
};

const formatElapsedTime = (dateString: string) => {
  const date = DateTime.fromISO(dateString);
  const now = DateTime.now();
  const diff = now
    .diff(date, ['years', 'months', 'days', 'hours', 'minutes', 'seconds'])
    .toObject();

  if (diff.years && diff.years > 0) {
    return `${diff.years} ${diff.years === 1 ? 'year' : 'years'} ago`;
  }
  if (diff.months && diff.months > 0) {
    return `${diff.months} ${diff.months === 1 ? 'month' : 'months'} ago`;
  }
  if (diff.days && diff.days > 0) {
    return `${diff.days} ${diff.days === 1 ? 'day' : 'days'} ago`;
  }
  if (diff.hours && diff.hours > 0) {
    return `${diff.hours} ${diff.hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diff.minutes && diff.minutes > 0) {
    return `${diff.minutes} ${diff.minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  return 'just now';
};

const parseScaffolderTemplate = (scaffolderTemplate: string) => {
  try {
    const parsed = yaml.load(scaffolderTemplate) as any;
    return {
      name: parsed?.metadata?.name || 'Untitled',
      description: parsed?.metadata?.description || '',
      type: parsed?.spec?.type || 'unknown',
      owner: parsed?.spec?.owner || '',
      stepsCount: parsed?.spec?.steps?.length || 0,
      parametersCount: parsed?.spec?.parameters?.length || 0,
    };
  } catch {
    return {
      name: 'Untitled',
      description: '',
      type: 'unknown',
      owner: '',
      stepsCount: 0,
      parametersCount: 0,
    };
  }
};

export const PublishedTemplateCard = ({
  publishedTemplate,
  onContextMenu,
  isSelected,
  onSelect,
}: PublishedTemplateCardProps) => {
  const navigate = useNavigate();
  const templateInfo = parseScaffolderTemplate(
    publishedTemplate.scaffolder_template,
  );

  const handleOpenTemplate = (visualTemplateId: string) => {
    navigate(`/scaffolder-studio/templates/${visualTemplateId}/form`);
  };

  return (
    <Grid
      component="div"
      key={publishedTemplate.id}
      onDoubleClick={() =>
        handleOpenTemplate(publishedTemplate.visual_template_id)
      }
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={onContextMenu}
      sx={{
        cursor: 'default',
        width: '100%',
      }}
    >
      <Box
        sx={{
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          boxShadow: isSelected ? 4 : 1,
          minHeight: 200,
        }}
      >
        {/* Template Preview Area */}
        <Box
          sx={{
            height: 80,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            p: 1,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <Typography variant="h6" color="primary" fontWeight="bold">
            {templateInfo.name}
          </Typography>
          <Chip
            label={`v${publishedTemplate.version}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Template Info */}
        <Box
          sx={{
            p: 2,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {templateInfo.description || 'No description available'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={templateInfo.type}
                size="small"
                variant="outlined"
                color="secondary"
              />
              <Chip
                label={`${templateInfo.stepsCount} steps`}
                size="small"
                variant="outlined"
              />
              {templateInfo.parametersCount > 0 && (
                <Chip
                  label={`${templateInfo.parametersCount} params`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          {/* Footer Info */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Published {formatElapsedTime(publishedTemplate.published_at)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              by {publishedTemplate.published_by}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Grid>
  );
};
