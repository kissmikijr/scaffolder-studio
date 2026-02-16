import { MouseEvent } from 'react';
import { Box, Typography, TableCell, TableRow, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { VisualTemplateProject } from '../../types';

type ProjectListRowProps = {
    project: VisualTemplateProject;
    onContextMenu: (e: MouseEvent) => void;
    isSelected: boolean;
    onSelect: (e: MouseEvent) => void;
};

import { TemplateVisualSummary } from './TemplateVisualSummary';

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
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <TableRow
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
            hover
            selected={isSelected}
            sx={{
                cursor: 'default',
                userSelect: 'none',
                position: 'relative',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08) !important' : 'transparent !important',
                borderLeft: isSelected ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
                },
                '&:hover': {
                    backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.12) !important'
                        : 'rgba(255, 255, 255, 0.04) !important',
                },
            }}
        >
            <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
                <Box sx={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <TemplateVisualSummary nodes={project.nodes} />
                </Box>
            </TableCell>

            <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
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
            </TableCell>

            <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
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
                        {project.metadata.description}
                    </Typography>
                )}
            </TableCell>

            <TableCell align="right" sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, minWidth: 100, textAlign: 'right' }}
                >
                    {formatElapsedTime(project.updated)}
                </Typography>
            </TableCell>

            <TableCell align="right" sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
                {project.published_at ? (
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
                ) : (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flexShrink: 0, minWidth: 120, textAlign: 'right', opacity: 0.5 }}
                    >
                        Unpublished
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};
