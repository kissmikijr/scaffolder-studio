import {
    Box,
    Typography,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import React, { useState } from 'react';
import {
    getPropertyBackgroundColor,
    NodeTypeColors,
    Prefab,
    isStepNode,
    isPropertyNode,
    isOutputNode,
    isTemplateNode,
    isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteIcon from '@mui/icons-material/Delete';
import { PrefabDragPreviewRef } from './PrefabDragPreview';
import { PrefabLibraryClientApi } from '../../../../api';

interface PrefabListProps {
    prefabs: Prefab[] | undefined;
    isLoading: boolean;
    searchQuery: string;
    onPrefabClick: (id: string, version?: string) => void;
    prefabLibraryApi?: PrefabLibraryClientApi;
    onDeleteSuccess?: () => void;
    compact?: boolean;
    draggable?: boolean;
    dragPreviewRef?: React.RefObject<PrefabDragPreviewRef>;
    groupByPublished?: boolean;
    groups?: Array<{ title: string; prefabs: Prefab[] }>;
}

export const PrefabList = ({
    prefabs,
    isLoading,
    searchQuery,
    onPrefabClick,
    prefabLibraryApi,
    onDeleteSuccess,
    compact = false,
    draggable = false,
    dragPreviewRef,
    groupByPublished = false,
    groups,
}: PrefabListProps) => {
    const theme = useTheme();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        prefab: Prefab;
    } | null>(null);

    // Confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [prefabToDelete, setPrefabToDelete] = useState<Prefab | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleGroup = (groupId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    const handleContextMenu = (event: React.MouseEvent, prefab: Prefab) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? {
                    mouseX: event.clientX + 2,
                    mouseY: event.clientY - 6,
                    prefab,
                }
                : null,
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleDeleteClick = () => {
        if (contextMenu) {
            setPrefabToDelete(contextMenu.prefab);
            setDeleteDialogOpen(true);
            handleCloseContextMenu();
        }
    };

    const handleDeleteConfirm = async () => {
        if (!prefabToDelete || !prefabToDelete.id || !prefabLibraryApi || !onDeleteSuccess) return;

        setIsDeleting(true);
        try {
            await prefabLibraryApi.delete(prefabToDelete.id);
            onDeleteSuccess();
            setDeleteDialogOpen(false);
            setPrefabToDelete(null);
        } catch (error) {
            console.error('Failed to delete prefab:', error);
            // Optionally show error message to user
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setPrefabToDelete(null);
    };

    if (isLoading) {
        return null;
    }

    const getNodeTypeConfig = (node: Prefab['node']) => {
        if (!node) {
            return { color: NodeTypeColors.unknown, label: 'Unknown' };
        }

        if (isStepNode(node)) {
            return { color: NodeTypeColors.step, label: 'Step' };
        }
        if (isPropertyNode(node)) {
            return {
                color: getPropertyBackgroundColor(node.data.variableType),
                label: 'Property',
            };
        }
        if (isOutputNode(node)) {
            return { color: NodeTypeColors.templateOutput, label: 'Output' };
        }
        if (isTemplateNode(node)) {
            return { color: NodeTypeColors.template, label: 'Template' };
        }
        if (isParametersNode(node)) {
            return { color: NodeTypeColors.parameters, label: 'Parameters' };
        }
        return { color: NodeTypeColors.unknown, label: 'Unknown' };
    };

    const handleDragStart = (event: React.DragEvent, prefab: Prefab) => {
        event.dataTransfer.setData('application/reactflow', 'prefab');
        event.dataTransfer.setData('application/reactflow/id', prefab.prefabId || prefab.id || '');
        if (prefab.version) {
            event.dataTransfer.setData('application/reactflow/version', prefab.version);
        }
        event.dataTransfer.setData('application/reactflow/refType', prefab.node.type || '');
        event.dataTransfer.effectAllowed = 'move';

        if (dragPreviewRef?.current && dragPreviewRef.current.element) {
            // Ensure the prefab is set (should be from onMouseEnter, but just in case)
            dragPreviewRef.current.setPrefab(prefab);
            event.dataTransfer.setDragImage(dragPreviewRef.current.element, 0, 0);
        }
    };

    const handlePrefabHover = (prefab: Prefab) => {
        if (dragPreviewRef?.current) {
            dragPreviewRef.current.setPrefab(prefab);
        }
    };

    const getPrefabPill = (prefab: Prefab) => {
        const { color, label } = getNodeTypeConfig(prefab.node);

        return (
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
                }}
            >
                {label}
            </Box>
        );
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <TableContainer component={Box} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
                <Table stickyHeader size="small" aria-label="prefabs table">
                    <TableHead
                        sx={{
                            '& .MuiTableCell-root': {
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                backgroundColor: 'transparent',
                            },
                        }}
                    >
                        <TableRow>
                            <TableCell />
                            <TableCell>Type</TableCell>
                            <TableCell>Name</TableCell>
                            {!compact && <TableCell>Description</TableCell>}
                            {!compact && <TableCell>Updated At</TableCell>}
                            <TableCell>Version</TableCell>
                            {!compact && <TableCell>Owner</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody
                        sx={{
                            '& .MuiTableRow-root:nth-of-type(odd)': {
                                backgroundColor: 'transparent',
                            },
                            '& .MuiTableRow-root .MuiTableCell-root': {
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                backgroundColor: 'transparent',
                            },
                        }}
                    >
                        {((!Array.isArray(prefabs) || prefabs.length === 0) && (!groups || groups.every(g => g.prefabs.length === 0))) ? (
                            <TableRow>
                                <TableCell colSpan={compact ? 4 : 7} align="center">
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ fontStyle: 'italic', py: 2 }}
                                    >
                                        {searchQuery.trim()
                                            ? 'No prefabs match your search'
                                            : 'No prefabs available'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            (() => {
                                const groupedByPrefabId = (prefabsToList: Prefab[]) => Object.values(
                                    prefabsToList.reduce((acc, prefab) => {
                                        const key = prefab.prefabId || prefab.id || 'unknown';
                                        if (!acc[key]) {
                                            acc[key] = [];
                                        }
                                        acc[key].push(prefab);
                                        return acc;
                                    }, {} as Record<string, Prefab[]>),
                                );

                                const renderGroup = (group: Prefab[]) => {
                                    // Sort by version descending
                                    const sortedGroup = group.sort((a, b) => {
                                        const vA = parseInt(a.version || '0', 10);
                                        const vB = parseInt(b.version || '0', 10);
                                        return vB - vA;
                                    });
                                    const latestPrefab = sortedGroup[0];
                                    const versionCount = group.length;
                                    const groupId = latestPrefab.prefabId || latestPrefab.id || 'unknown';
                                    const isExpanded = expandedGroups.has(groupId);

                                    return (
                                        <React.Fragment key={latestPrefab.id}>
                                            <TableRow
                                                hover
                                                draggable={draggable}
                                                onDragStart={(e) => draggable && handleDragStart(e, latestPrefab)}
                                                onMouseEnter={() => draggable && handlePrefabHover(latestPrefab)}
                                                onDoubleClick={() => {
                                                    onPrefabClick(latestPrefab.prefabId || '', latestPrefab.version);
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, latestPrefab)}
                                                sx={{
                                                    cursor: draggable ? 'grab' : 'default',
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <IconButton
                                                        aria-label="expand row"
                                                        size="small"
                                                        onClick={e => toggleGroup(groupId, e)}
                                                        sx={{
                                                            visibility: versionCount > 1 ? 'visible' : 'hidden',
                                                        }}
                                                    >
                                                        {isExpanded ? (
                                                            <KeyboardArrowDownIcon fontSize="small" />
                                                        ) : (
                                                            <KeyboardArrowRightIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>{getPrefabPill(latestPrefab)}</TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 'medium',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {latestPrefab.title}
                                                    </Typography>
                                                </TableCell>
                                                {!compact && (
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 'medium',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {latestPrefab.description}
                                                        </Typography>
                                                    </TableCell>
                                                )}
                                                {!compact && (
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                            {latestPrefab.updated_at
                                                                ? new Date(latestPrefab.updated_at).toLocaleDateString()
                                                                : 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                        v{latestPrefab.version || 'N/A'}
                                                    </Typography>
                                                </TableCell>
                                                {!compact && (
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                            {latestPrefab.owner}
                                                        </Typography>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                            {isExpanded &&
                                                sortedGroup.slice(1).map(prefab => (
                                                    <TableRow
                                                        key={prefab.id}
                                                        hover
                                                        draggable={draggable}
                                                        onDragStart={(e) => draggable && handleDragStart(e, prefab)}
                                                        onMouseEnter={() => draggable && handlePrefabHover(prefab)}
                                                        onDoubleClick={() => onPrefabClick(prefab.prefabId || '', prefab.version)}
                                                        onContextMenu={(e) => handleContextMenu(e, prefab)}
                                                        sx={{
                                                            cursor: draggable ? 'grab' : 'default',
                                                        }}
                                                    >
                                                        <TableCell />
                                                        <TableCell />
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 'medium',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    pl: 2,
                                                                }}
                                                            >
                                                                {prefab.title}
                                                            </Typography>
                                                        </TableCell>
                                                        {!compact && (
                                                            <TableCell>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: 'medium',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                >
                                                                    {latestPrefab.description}
                                                                </Typography>
                                                            </TableCell>
                                                        )}
                                                        {!compact && (
                                                            <TableCell>
                                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                    {prefab.updated_at
                                                                        ? new Date(prefab.updated_at).toLocaleDateString()
                                                                        : 'N/A'}
                                                                </Typography>
                                                            </TableCell>
                                                        )}
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                v{prefab.version || 'N/A'}
                                                            </Typography>
                                                        </TableCell>
                                                        {!compact && (
                                                            <TableCell>
                                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                    {prefab.owner}
                                                                </Typography>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                        </React.Fragment>
                                    );
                                };

                                if (groups) {
                                    return (
                                        <>
                                            {groups.map((group, idx) => (
                                                <React.Fragment key={group.title + idx}>
                                                    {group.prefabs.length > 0 && (
                                                        <>
                                                            <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05) !important' }}>
                                                                <TableCell colSpan={compact ? 4 : 7} sx={{ py: 1 }}>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>
                                                                        {group.title}
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                            {groupedByPrefabId(group.prefabs).map(renderGroup)}
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    );
                                }

                                if (!groupByPublished || !prefabs) {
                                    return groupedByPrefabId(prefabs || []).map(renderGroup);
                                }

                                const published = prefabs.filter(p => p.is_published);
                                const unpublished = prefabs.filter(p => !p.is_published);

                                return (
                                    <>
                                        {published.length > 0 && (
                                            <>
                                                <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05) !important' }}>
                                                    <TableCell colSpan={compact ? 4 : 7} sx={{ py: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>
                                                            Library Prefabs
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                                {groupedByPrefabId(published).map(renderGroup)}
                                            </>
                                        )}
                                        {unpublished.length > 0 && (
                                            <>
                                                <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05) !important' }}>
                                                    <TableCell colSpan={compact ? 4 : 7} sx={{ py: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>
                                                            Your Prefabs
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                                {groupedByPrefabId(unpublished).map(renderGroup)}
                                            </>
                                        )}
                                    </>
                                );
                            })()
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    Delete Prefab Version?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete <strong>{prefabToDelete?.title}</strong> (version {prefabToDelete?.version})?
                        <br /><br />
                        This action cannot be undone. Other versions of this prefab will remain in the library.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        autoFocus
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
