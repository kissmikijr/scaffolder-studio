import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Menu } from '@mui/material';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import { VisualTemplateProject } from '../../types';
import { ProjectLayout } from './ProjectLayout';
import { styledMenuProps } from '../../components/menuStyles';
import { useConfirmationDialog } from '../../dialogs/ConfirmationDialogContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { sortBy } from './sort';
import { usePermission } from '@backstage/plugin-permission-react';
import { scaffolderStudioPublishPermission } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { PublishDialog } from './PublishDialog';

export const TemplatesView = () => {
  const { sort, searchText, viewMode } = useOutletContext<{ sort: string; searchText: string; viewMode?: string }>();
  const { confirm } = useConfirmationDialog();
  const navigate = useNavigate();
  const api = useApi(scaffolderVisualApiRef);
  const [projects, setProjects] = useState<VisualTemplateProject[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const { loading: loadingPermission, allowed: canPublish } = usePermission({
    permission: scaffolderStudioPublishPermission,
  });
  const alertApi = useApi(alertApiRef);

  useEffect(() => {
    if (sort) {
      setProjects(prev => [...prev.sort(sortBy(sort))]);
    }
  }, [sort]);

  useEffect(() => {
    api
      .listProjects({ trashed: false })
      .then(projects => setProjects(projects.sort(sortBy(sort))));
  }, []);


  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [projectToPublish, setProjectToPublish] = useState<string | null>(null);

  const handlePublishClick = (id: string) => {
    setProjectToPublish(id);
    setPublishDialogOpen(true);
  };

  const onConfirmPublish = async (
    publisherId: string,
    options?: Record<string, unknown>,
  ) => {
    if (!projectToPublish) return;
    const id = projectToPublish;

    try {
      const project = projects.find(p => p.id === id);
      if (!project) return;

      const template = await api.serializeTemplate({
        sourceNodeId: project.nodes[0].id,
        nodes: project.nodes,
        edges: project.edges,
      });

      await api.publish({
        visualTemplateId: id,
        scaffolderTemplate: template,
        publisherId,
        options,
      });

      setProjects(
        projects.map(project =>
          project.id === id
            ? { ...project, published_at: new Date().toISOString() }
            : project,
        ),
      );
      alertApi.post({
        message: 'Template has been published',
        severity: 'success',
        display: 'transient',
      });
    } catch (error) {
      alertApi.post({
        message: 'Failed to publish template',
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setPublishDialogOpen(false);
      setProjectToPublish(null);
    }
  };

  const onClose = () => setContextMenu(null);
  const onTrash = async (ids: string[]) => {
    const confirmed = await confirm({
      title: 'Trash Project',
      description: 'Are you sure you want to put this project ot the bin?',
      confirmText: 'Trash',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      api.trashProject(ids);
      setProjects(projects.filter(project => !ids.includes(project.id)));
      alertApi.post({
        message: 'Template moved to trash',
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
        {projectIds.length === 1 && (
          <MenuItem
            onClick={() => {
              if (projectIds.length > 0) {
                navigate(`/scaffolder-studio/templates/${projectIds[0]}/form`);
              }
              onClose();
            }}
          >
            Open
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (projectIds.length > 0) {
              onTrash(projectIds);
            }
            onClose();
          }}
        >
          Move to trash
        </MenuItem>

        {projectIds.length === 1 && !loadingPermission && canPublish && (
          <MenuItem
            onClick={() => {
              if (projectIds.length > 0) {
                handlePublishClick(projectIds[0]);
              }
              onClose();
            }}
          >
            Publish
          </MenuItem>
        )}
      </Menu>
      <PublishDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={onConfirmPublish}
      />
    </>
  );
};
