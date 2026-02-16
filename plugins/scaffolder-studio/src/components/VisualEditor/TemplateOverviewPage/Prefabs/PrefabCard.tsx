import React, { useState, useEffect } from 'react';
import { Box, Typography, Menu, MenuItem, Grid } from '@mui/material';
import {
  StoredPrefab,
  visualScaffolderEditorPrefabDeletePermission,
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
  onSelect?: (e: React.MouseEvent) => void;
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
      permission: visualScaffolderEditorPrefabDeletePermission,
    });
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null,
    );
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
      });
    } catch (error) {
      alertApi.post({
        message: `Failed to publish prefab: ${(error as Error).message}`,
        severity: 'error',
      });
    }
    handleCloseContextMenu();
  };

  const handleCardClick = (event: React.MouseEvent) => {
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
            <MenuItem onClick={handleOpenPrefab}>Open Prefab</MenuItem>
            <MenuItem onClick={handlePublishToLibrary}>
              Publish to Library
            </MenuItem>
            {!isLoadingPermission && canDeletePrefab && (
              <MenuItem onClick={handleDeletePrefab}>Delete Prefab</MenuItem>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};
