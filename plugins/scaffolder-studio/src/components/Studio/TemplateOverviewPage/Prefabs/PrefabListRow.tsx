import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    StoredPrefab,
    NodeTypeColors,
    getPropertyBackgroundColor,
    isStepNode,
    isPropertyNode,
    isOutputNode,
    isTemplateNode,
    isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

type PrefabListRowProps = {
    prefab: StoredPrefab;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
};

const getNodeTypeConfig = (node: StoredPrefab['node']) => {
    if (!node) return { color: NodeTypeColors.unknown, label: 'Unknown' };
    if (isStepNode(node)) return { color: NodeTypeColors.step, label: 'Step' };
    if (isPropertyNode(node))
        return {
            color: getPropertyBackgroundColor(node.data.variableType),
            label: 'Property',
        };
    if (isOutputNode(node))
        return { color: NodeTypeColors.templateOutput, label: 'Output' };
    if (isTemplateNode(node))
        return { color: NodeTypeColors.template, label: 'Template' };
    if (isParametersNode(node))
        return { color: NodeTypeColors.parameters, label: 'Parameters' };
    return { color: NodeTypeColors.unknown, label: 'Unknown' };
};

export const PrefabListRow = ({
    prefab,
    isSelected,
    onSelect,
    onContextMenu,
}: PrefabListRowProps) => {
    const navigate = useNavigate();
    const { color, label } = getNodeTypeConfig(prefab.node);

    return (
        <Box
            data-testid="prefab-list-row"
            onClick={e => {
                e.stopPropagation();
                if (e.shiftKey) e.preventDefault();
                onSelect(e);
            }}
            onDoubleClick={() =>
                navigate(`/scaffolder-studio/prefab/${prefab.id || ''}`)
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
                    minWidth: 0,
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                }}
            >
                {prefab.title}
            </Typography>

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
                {prefab.description}
            </Typography>
            {/* Version */}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, fontSize: '0.75rem' }}
            >
                v{prefab.version || '1'}
            </Typography>

            {/* Published / unpublished icons */}
            {prefab.published_at && prefab.is_published && (
                <Tooltip title="Published to Library">
                    <CheckCircleRoundedIcon
                        sx={{ fontSize: '1.1rem', color: 'success.main', flexShrink: 0 }}
                    />
                </Tooltip>
            )}
            {prefab.published_at && !prefab.is_published && (
                <Tooltip title="Unpublished changes">
                    <WarningRoundedIcon
                        sx={{ fontSize: '1.1rem', color: 'warning.main', flexShrink: 0 }}
                    />
                </Tooltip>
            )}
            {!prefab.published_at && (
                <Tooltip title="Not Published">
                    <WarningRoundedIcon
                        sx={{ fontSize: '1.1rem', color: 'text.disabled', flexShrink: 0 }}
                    />
                </Tooltip>
            )}



            {/* Node type pill — same colors as PrefabList */}
            <Box
                sx={{
                    backgroundColor: color,
                    color: '#000',
                    fontWeight: 'medium',
                    fontSize: '0.75rem',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1,
                    borderRadius: '11px',
                    width: '80px',
                    minWidth: '80px',
                    flexShrink: 0,
                }}
            >
                {label}
            </Box>
        </Box>
    );
};
