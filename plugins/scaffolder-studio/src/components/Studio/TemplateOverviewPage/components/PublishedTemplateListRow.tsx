import { MouseEvent } from 'react';
import { Box, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { PublishedTemplate } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import yaml from 'js-yaml';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';

type PublishedTemplateListRowProps = {
    publishedTemplate: PublishedTemplate;
    onContextMenu: (e: MouseEvent) => void;
    isSelected: boolean;
    onSelect: () => void;
};

export const PublishedTemplateListRow = ({
    publishedTemplate,
    onContextMenu,
    isSelected,
    onSelect,
}: PublishedTemplateListRowProps) => {
    let name = 'Untitled';
    try {
        const parsed = yaml.load(
            publishedTemplate.scaffolder_template,
        ) as TemplateEntityV1beta3;
        name = parsed?.metadata?.name || 'Untitled';
    } catch {
        // ignore parse errors
    }

    const publishedDate = DateTime.fromISO(publishedTemplate.published_at);

    return (
        <Box
            data-testid="published-template-list-row"
            onClick={e => {
                e.stopPropagation();
                onSelect();
            }}
            onContextMenu={onContextMenu}
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1.25,
                gap: 2,
                cursor: 'default',
                userSelect: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isSelected ? 'action.selected' : 'transparent',
                transition: 'background-color 0.1s',
                '&:hover': {
                    bgcolor: isSelected ? 'action.selected' : 'action.hover',
                },
            }}
        >
            <Typography
                variant="body2"
                fontWeight={500}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {name}
            </Typography>

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, minWidth: 140, textAlign: 'right' }}
            >
                v{publishedTemplate.version} &middot;{' '}
                {publishedDate.isValid
                    ? publishedDate.toLocaleString(DateTime.DATE_MED)
                    : ''}
            </Typography>
        </Box>
    );
};
