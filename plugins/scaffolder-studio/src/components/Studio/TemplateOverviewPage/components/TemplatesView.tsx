import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Menu, ListItemIcon, Typography, Divider } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
import { EmptyState } from './EmptyState';

import { useTemplateCreator } from '../hooks/useTemplateCreator';


export const TemplatesView = () => {
  const { sort, searchText, viewMode } = useOutletContext<{ sort: string; searchText: string; viewMode?: string }>();
  const { confirm } = useConfirmationDialog();
  const navigate = useNavigate();
  const api = useApi(scaffolderVisualApiRef);
  const { createTemplate } = useTemplateCreator();
  const [projects, setProjects] = useState<VisualTemplateProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const { loading: loadingPermission, allowed: canPublish } = usePermission({
    permission: scaffolderStudioPublishPermission,
  });
  const alertApi = useApi(alertApiRef);

  const sortedProjects = React.useMemo(() => {
    return [...projects].sort(sortBy(sort));
  }, [projects, sort]);

  useEffect(() => {
    api
      .listProjects({ trashed: false })
      .then(projects => {
        setProjects(projects);
      })
      .finally(() => {
        setIsLoading(false);
      });
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

  const handleCopyYaml = async (id: string) => {
    try {
      const project = projects.find(p => p.id === id);
      if (!project || project.nodes.length === 0) return;

      const template = await api.serializeTemplate({
        sourceNodeId: project.nodes[0].id,
        nodes: project.nodes,
        edges: project.edges,
      });

      await navigator.clipboard.writeText(template);
      alertApi.post({
        message: 'YAML copied to clipboard',
        severity: 'success',
        display: 'transient',
      });
    } catch (error) {
      alertApi.post({
        message: 'Failed to copy YAML',
        severity: 'error',
        display: 'transient',
      });
    } finally {
      onClose();
    }
  };
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
          projects={sortedProjects.filter(p => {
            const query = searchText.toLowerCase();
            return (
              (p.metadata.name ?? '').toLowerCase().includes(query) ||
              (p.metadata.description ?? '').toLowerCase().includes(query) ||
              (p.owner ?? '').toLowerCase().includes(query)
            );
          })}
          selectedProjectIds={projectIds}
          setSelectedProjectIds={setProjectIds}
          setContextMenu={setContextMenu}
          viewMode={viewMode as any}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title={
                searchText
                  ? 'No templates match your search'
                  : 'No templates found'
              }
              description={
                searchText
                  ? `Try adjusting your search terms to find what you're looking for.`
                  : 'Get started by creating your first template.'
              }
              action={
                !searchText
                  ? {
                    label: 'Create Template',
                    onClick: createTemplate,
                  }
                  : undefined
              }
              missing="content"
            />
          }
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
            <ListItemIcon sx={{ minWidth: 32 }}>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Open</Typography>
          </MenuItem>
        )}
        {projectIds.length === 1 && (
          <>
            <MenuItem
              onClick={() => {
                if (projectIds.length > 0) {
                  handleCopyYaml(projectIds[0]);
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Copy YAML</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
          </>
        )}
        <MenuItem
          onClick={() => {
            if (projectIds.length > 0) {
              onTrash(projectIds);
            }
            onClose();
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Move to trash</Typography>
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
            <ListItemIcon sx={{ minWidth: 32 }}>
              <CloudUploadIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Publish</Typography>
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
