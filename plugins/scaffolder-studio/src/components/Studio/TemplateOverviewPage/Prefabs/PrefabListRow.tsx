import { useState } from 'react';
import { MouseEvent } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  TableCell,
  TableRow,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
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
  scaffolderStudioPrefabPublishPermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { usePermission } from '@backstage/plugin-permission-react';
import { styledMenuProps } from '../../components/menuStyles';
import { useConfirmationDialog } from '../../dialogs/ConfirmationDialogContext';
import { TemplateVisualSummary } from '../components/TemplateVisualSummary';

type PrefabListRowProps = {
  prefab: StoredPrefab;
  isSelected: boolean;
  onSelect: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onDelete?: (prefabId: string) => void;
};

const formatElapsedTime = (dateString: string) => {
  const date = DateTime.fromISO(dateString);
  if (!date.isValid) return 'Invalid date';

  const now = DateTime.now();
  const diff = now
    .diff(date, ['years', 'months', 'days', 'hours', 'minutes'])
    .toObject();

  if (diff.years && diff.years > 0)
    return `${Math.floor(diff.years)} ${
      Math.floor(diff.years) === 1 ? 'year' : 'years'
    } ago`;
  if (diff.months && diff.months > 0)
    return `${Math.floor(diff.months)} ${
      Math.floor(diff.months) === 1 ? 'month' : 'months'
    } ago`;
  if (diff.days && diff.days > 0)
    return `${Math.floor(diff.days)} ${
      Math.floor(diff.days) === 1 ? 'day' : 'days'
    } ago`;
  if (diff.hours && diff.hours > 0)
    return `${Math.floor(diff.hours)} ${
      Math.floor(diff.hours) === 1 ? 'hour' : 'hours'
    } ago`;
  if (diff.minutes && diff.minutes > 0)
    return `${Math.floor(diff.minutes)} ${
      Math.floor(diff.minutes) === 1 ? 'minute' : 'minutes'
    } ago`;
  return 'just now';
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
  const { allowed: canPublishPrefab } = usePermission({
    permission: scaffolderStudioPrefabPublishPermission,
  });

  const handleContextMenu = (e: MouseEvent) => {
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
        alertApi.post({
          message: 'Prefab has been deleted',
          severity: 'success',
          display: 'transient',
        });
      } catch {
        // Silent error
      }
    }
    handleCloseContextMenu();
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

  const theme = useTheme();

  return (
    <>
      <TableRow
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
        hover
        selected={isSelected}
        sx={{
          cursor: 'default',
          userSelect: 'none',
          position: 'relative',
          backgroundColor: isSelected
            ? 'rgba(255, 255, 255, 0.08) !important'
            : 'transparent !important',
          borderLeft: isSelected
            ? `4px solid ${theme.palette.primary.main}`
            : '4px solid transparent',
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
        <TableCell
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Box
            sx={{
              width: 140,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <TemplateVisualSummary nodes={[prefab.node]} />
          </Box>
        </TableCell>

        <TableCell
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {prefab.title}
          </Typography>
        </TableCell>

        <TableCell
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {prefab.description}
          </Typography>
        </TableCell>

        <TableCell
          align="right"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0, minWidth: 100, textAlign: 'right' }}
          >
            {prefab.updated_at ? formatElapsedTime(prefab.updated_at) : 'N/A'}
          </Typography>
        </TableCell>

        <TableCell
          align="center"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {prefab.published_at && prefab.is_published && (
              <Tooltip title="Published to Library">
                <CheckCircleRoundedIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: 'success.main',
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            )}
            {prefab.published_at && !prefab.is_published && (
              <Tooltip title="Unpublished changes">
                <WarningRoundedIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: 'warning.main',
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            )}
            {!prefab.published_at && (
              <Tooltip title="Not Published">
                <WarningRoundedIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: 'text.disabled',
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </TableCell>

        <TableCell
          align="right"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0, fontSize: '0.75rem' }}
          >
            v{prefab.version || '1'}
          </Typography>
        </TableCell>

        <TableCell
          sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}
        >
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
              ml: 'auto',
            }}
          >
            {label}
          </Box>
        </TableCell>
      </TableRow>
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
      </Menu>
    </>
  );
};
