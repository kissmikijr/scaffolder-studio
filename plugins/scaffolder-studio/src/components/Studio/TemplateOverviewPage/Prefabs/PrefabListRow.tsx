import React, { useState } from 'react';
import { Box, Typography, Tooltip, Menu, MenuItem } from '@mui/material';
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
    scaffolderStudioPrefabDeletePermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { usePermission } from '@backstage/plugin-permission-react';
import { styledMenuProps } from '../../components/menuStyles';
import { useConfirmationDialog } from '../../dialogs/ConfirmationDialogContext';

type PrefabListRowProps = {
    prefab: StoredPrefab;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDelete?: (prefabId: string) => void;
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
    onDelete,
}: PrefabListRowProps) => {
    const navigate = useNavigate();
    const api = useApi(prefabsApiRef);
    const alertApi = useApi(alertApiRef);
    const { confirm } = useConfirmationDialog();
    const { color, label } = getNodeTypeConfig(prefab.node);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const { loading: isLoadingPermission, allowed: canDeletePrefab } =
        usePermission({
            permission: scaffolderStudioPrefabDeletePermission,
        });

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(e);
        setContextMenu({
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleOpenPrefab = () => {
        navigate(`/scaffolder-studio/prefab/${prefab.id}`);
        handleCloseContextMenu();
    };

    const handleDeletePrefab = async () => {
        const confirmed = await confirm({
            title: 'Delete Prefab',
            description: `Are you sure you want to delete prefab "${prefab.title}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
        });
        if (confirmed) {
            try {
                await api.delete({ id: prefab.id });
                if (onDelete) {
                    onDelete(prefab.id);
                }
            } catch (error) {
                console.error('Failed to delete prefab:', error);
            }
        }
        handleCloseContextMenu();
        alertApi.post({
            message: 'Prefab has been deleted',
            severity: 'success',
            display: 'transient',
        });
    };

    const handlePublishToLibrary = async () => {
        try {
            await api.addToLibrary({
                prefabId: prefab.id,
                owner: prefab.owner || 'unknown',
            });
            alertApi.post({
                message: 'Prefab published to library successfully',
                severity: 'success',
                display: 'transient',
            });
        } catch (error) {
            alertApi.post({
                message: `Failed to publish prefab: ${(error as Error).message}`,
                severity: 'error',
                display: 'transient',
            });
        }
        handleCloseContextMenu();
    };

    return (
        <>
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
                onContextMenu={handleContextMenu}
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

                {/* Node type pill */}
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
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                className="nodrag nopan"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
                {...styledMenuProps}
            >
                <MenuItem onClick={handleOpenPrefab}>Open Prefab</MenuItem>
                <MenuItem onClick={handlePublishToLibrary}>
                    Publish to Library
                </MenuItem>
                {!isLoadingPermission && canDeletePrefab && (
                    <MenuItem onClick={handleDeletePrefab}>Delete Prefab</MenuItem>
                )}
            </Menu>
        </>
    );
};

