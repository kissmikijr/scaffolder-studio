import React, { useEffect, useState } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import { VisualTemplateProject } from '../../types';
import { ProjectLayout } from './ProjectLayout';
import { styledMenuProps } from '../../components/menuStyles';
import { useConfirmationDialog } from '../../dialogs/ConfirmationDialogContext';
import { sortBy } from './sort';
import { usePermission } from '@backstage/plugin-permission-react';
import { scaffolderStudioPermanentlyDeletePermission } from '@kissmiklosjr/plugin-scaffolder-studio-common';

type TrashViewProps = {
  sort: string;
  onSortChange: (value: string) => void;
  searchText: string;
  viewMode?: string;
};

export const TrashView = () => {
  const { sort, searchText, viewMode } = useOutletContext<TrashViewProps>();
  const api = useApi(scaffolderVisualApiRef);
  const [projects, setProjects] = useState<VisualTemplateProject[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const { confirm } = useConfirmationDialog();
  const alertApi = useApi(alertApiRef);
  const { loading: isLoadingPermission, allowed: canPermanentlyDelete } =
    usePermission({
      permission: scaffolderStudioPermanentlyDeletePermission,
    });

  useEffect(() => {
    api.listProjects({ trashed: true }).then(projects => {
      setProjects(projects.sort(sortBy(sort)));
    });
  }, []);

  useEffect(() => {
    if (sort) {
      setProjects(prev => [...prev.sort(sortBy(sort))]);
    }
  }, [sort]);

  const onClose = () => setContextMenu(null);

  const onRestore = (ids: string[]) => {
    api.restoreProjects(ids).then(() => {
      setProjects(projects.filter(project => !ids.includes(project.id)));
    });
    alertApi.post({
      message: 'Template has been restored',
      severity: 'success',
      display: 'transient',
    });
  };
  const onDelete = async (ids: string[]) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      description:
        'Are you sure you want to permanently delete this project? This can not be reverted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      api.deleteProjects(ids).then(() => {
        setProjects(projects.filter(project => !ids.includes(project.id)));
      });
      alertApi.post({
        message: 'Template has been deleted',
        severity: 'success',
        display: 'transient',
      });
    }
  };

  return (
    <>
      <Box>
        <ProjectLayout
          projects={projects.filter(p =>
            p.metadata.name.toLowerCase().includes(searchText.toLowerCase()),
          )}
          selectedProjectIds={projectIds}
          setSelectedProjectIds={setProjectIds}
          setContextMenu={setContextMenu}
          viewMode={viewMode as any}
        />
      </Box>
      <Menu
        open={!!contextMenu}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={{
          top: contextMenu?.mouseY || 0,
          left: contextMenu?.mouseX || 0,
        }}
        className="nodrag nopan"
        {...styledMenuProps}
      >
        <MenuItem
          onClick={() => {
            if (projectIds.length > 0) {
              onRestore(projectIds);
            }
            onClose();
          }}
        >
          Restore
        </MenuItem>
        {!isLoadingPermission && canPermanentlyDelete && (
          <MenuItem
            onClick={() => {
              if (projectIds.length > 0) {
                onDelete(projectIds);
              }
              onClose();
            }}
          >
            Permanently Delete
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
