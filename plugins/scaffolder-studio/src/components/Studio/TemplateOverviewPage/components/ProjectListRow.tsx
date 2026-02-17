import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { VisualTemplateProject } from '../../types';

type ProjectListRowProps = {
    project: VisualTemplateProject;
    onContextMenu: (e: React.MouseEvent) => void;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
};

const formatElapsedTime = (dateString: string) => {
    const date = DateTime.fromISO(dateString);
    if (!date.isValid) return 'Invalid date';

    const now = DateTime.now();
    const diff = now
        .diff(date, ['years', 'months', 'days', 'hours', 'minutes'])
        .toObject();

    if (diff.years && diff.years > 0)
        return `${Math.floor(diff.years)} ${Math.floor(diff.years) === 1 ? 'year' : 'years'} ago`;
    if (diff.months && diff.months > 0)
        return `${Math.floor(diff.months)} ${Math.floor(diff.months) === 1 ? 'month' : 'months'} ago`;
    if (diff.days && diff.days > 0)
        return `${Math.floor(diff.days)} ${Math.floor(diff.days) === 1 ? 'day' : 'days'} ago`;
    if (diff.hours && diff.hours > 0)
        return `${Math.floor(diff.hours)} ${Math.floor(diff.hours) === 1 ? 'hour' : 'hours'} ago`;
    if (diff.minutes && diff.minutes > 0)
        return `${Math.floor(diff.minutes)} ${Math.floor(diff.minutes) === 1 ? 'minute' : 'minutes'} ago`;
    return 'just now';
};

export const ProjectListRow = ({
    project,
    onContextMenu,
    isSelected,
    onSelect,
}: ProjectListRowProps) => {
    const navigate = useNavigate();

    return (
        <Box
            data-testid="template-list-row"
            onClick={e => {
                e.stopPropagation();
                if (e.shiftKey) e.preventDefault();
                onSelect(e);
            }}
            onDoubleClick={() =>
                navigate(`/scaffolder-studio/templates/${project.id}/form`)
            }
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
                    flexShrink: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {project?.metadata?.name || 'Untitled'}
            </Typography>

            {project?.metadata?.description && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    — {project.metadata.description}
                </Typography>
            )}

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, minWidth: 100, textAlign: 'right' }}
            >
                {formatElapsedTime(project.updated)}
            </Typography>

            {project.published_at && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, minWidth: 120, textAlign: 'right' }}
                >
                    Published{' '}
                    {(() => {
                        const d = DateTime.fromISO(project.published_at);
                        return d.isValid ? d.toLocaleString(DateTime.DATE_MED) : '';
                    })()}
                </Typography>
            )}
        </Box>
    );
};
