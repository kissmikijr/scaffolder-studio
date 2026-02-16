import { useState, useEffect } from 'react';
import { MouseEvent } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Grid,
  Chip,
  Tooltip,
  ListItemIcon,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  StoredPrefab,
  scaffolderStudioPrefabDeletePermission,
  scaffolderStudioPrefabPublishPermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useNavigate } from 'react-router-dom';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { usePermission } from '@backstage/plugin-permission-react';
import { styledMenuProps } from '../../components/menuStyles';
import { useConfirmationDialog } from '../../dialogs/ConfirmationDialogContext';

export const PrefabCard = ({
  prefab,
  isSelected,
  selectedCount,
  onDelete,
  onSelect,
  onBulkDelete,
}: {
  prefab: StoredPrefab;
  isSelected: boolean;
  selectedCount: number;
  onDelete?: (prefabId: string) => void;
  onSelect?: (e: MouseEvent) => void;
  onBulkDelete?: () => void;
}) => {
  const navigate = useNavigate();
  const api = useApi(prefabsApiRef);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const { confirm } = useConfirmationDialog();
  const alertApi = useApi(alertApiRef);
  useEffect(() => {
    const thumbnailKey = `prefab-thumbnail-${prefab.id}`;
    const savedThumbnail = JSON.parse(
      localStorage.getItem(thumbnailKey) || '{}',
    );
    setThumbnail(savedThumbnail?.dataUrl || null);
  }, [prefab.id]);

  const { loading: isLoadingPermission, allowed: canDeletePrefab } =
    usePermission({
      permission: scaffolderStudioPrefabDeletePermission,
    });
  const { allowed: canPublishPrefab } = usePermission({
    permission: scaffolderStudioPrefabPublishPermission,
  });
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (isSelected) {
      setContextMenu(
        contextMenu === null
          ? {
              mouseX: event.clientX + 2,
              mouseY: event.clientY - 6,
            }
          : null,
      );
    }
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
      } catch {
        // Silent error
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

  const handleCardClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (event.shiftKey) {
      event.preventDefault();
    }
    if (onSelect) {
      onSelect(event);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid
        component="div"
        key={prefab.id}
        data-testid="prefab-card"
        onClick={handleCardClick}
        onDoubleClick={() =>
          navigate(`/scaffolder-studio/prefab/${prefab.id || ''}`)
        }
        onContextMenu={handleContextMenu}
        sx={{
          cursor: 'default',
          width: '100%',
          userSelect: 'none',
          height: '100%',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          overflow: 'hidden',
          transition: 'border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`${prefab.title} thumbnail`}
              style={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                height: '180px',
                backgroundColor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No thumbnail
              </Typography>
            </Box>
          )}

          {/* Version Indicator */}
          {prefab.published_at && (
            <Chip
              label={`v${prefab.version || '1'}`}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                backdropFilter: 'blur(4px)',
                height: 24,
                fontSize: '0.75rem',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}

          {/* Status Indicators */}
          {!prefab.published_at && (
            <Chip
              label="Not Published"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                backdropFilter: 'blur(4px)',
                height: 24,
                fontSize: '0.75rem',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}

          {prefab.published_at && prefab.is_published && (
            <Tooltip title="Published to Library">
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                }}
              >
                <CheckCircleRoundedIcon
                  sx={{
                    fontSize: '1.25rem',
                    color: 'success.main',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {prefab.published_at && !prefab.is_published && (
            <Tooltip title="This prefab has unpublished changes that are not live in the library.">
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                }}
              >
                <WarningRoundedIcon
                  sx={{
                    fontSize: '1.25rem',
                    color: 'warning.main',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                  }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>
        <Box
          sx={{
            p: 1,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {prefab.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {prefab.description}
          </Typography>
        </Box>
      </Grid>
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
        {selectedCount > 1 ? (
          !isLoadingPermission &&
          canDeletePrefab && (
            <MenuItem
              onClick={() => {
                if (onBulkDelete) {
                  onBulkDelete();
                }
                handleCloseContextMenu();
              }}
            >
              Delete {selectedCount} Prefabs
            </MenuItem>
          )
        ) : (
          <>
            <MenuItem onClick={handleOpenPrefab}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <OpenInNewIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Prefab</Typography>
            </MenuItem>
            {canPublishPrefab && (
              <MenuItem onClick={handlePublishToLibrary}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CloudUploadIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Publish to Library</Typography>
              </MenuItem>
            )}
            {!isLoadingPermission && canDeletePrefab && (
              <MenuItem onClick={handleDeletePrefab}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Delete Prefab</Typography>
              </MenuItem>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};
