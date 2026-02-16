import { useEffect, useState, type MouseEvent } from 'react';
import { Box, MenuItem, Menu, ListItemIcon, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import { styledMenuProps } from '../../components/menuStyles';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { sortBy } from './sort';
import { PublishedTemplate } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { PublishedTemplateCard } from './PublishedTemplateCard';
import { PublishedTemplateListRow } from './PublishedTemplateListRow';
import { usePermission } from '@backstage/plugin-permission-react';
import { scaffolderStudioUnpublishPermission } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export const PublishedView = () => {
  const { sort, searchText, viewMode } = useOutletContext<{
    sort: string;
    searchText: string;
    viewMode?: string;
  }>();
  const { loading: isLoadingPermission, allowed: canUnpublish } = usePermission(
    {
      permission: scaffolderStudioUnpublishPermission,
    },
  );
  const navigate = useNavigate();
  const api = useApi(scaffolderVisualApiRef);
  const alertApi = useApi(alertApiRef);
  const [publishedTemplates, setPublishedTemplates] = useState<
    PublishedTemplate[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    templateId: string | null | undefined;
  } | null>(null);

  useEffect(() => {
    if (sort) {
      setPublishedTemplates(prev => [...prev.sort(sortBy(sort))]);
    }
  }, [sort]);

  useEffect(() => {
    api
      .listPublishedProjects()
      .then(templates => setPublishedTemplates(templates.sort(sortBy(sort))));
  }, [api, sort]);

  const onClose = () => setContextMenu(null);

  const handleContextMenu = (e: MouseEvent, templateId: string) => {
    e.preventDefault();
    if (selectedTemplateId === templateId) {
      setContextMenu({
        mouseX: e.clientX + 2,
        mouseY: e.clientY - 6,
        templateId,
      });
    }
  };

  const onUnpublish = async (id: string) => {
    const foundTemplate = publishedTemplates.find(t => t.id === id);
    if (!foundTemplate) {
      return;
    }
    await api.unpublish({
      visualTemplateId: id,
      scaffolderTemplate: foundTemplate.scaffolder_template,
    });
    setPublishedTemplates(prev => prev.filter(t => t.id !== id));
    alertApi.post({
      message: 'Template has been unpublished',
      severity: 'success',
      display: 'transient',
    });
    onClose();
  };

  const filtered = publishedTemplates.filter(t => {
    const query = searchText?.toLowerCase() ?? '';
    const metadata = (t.scaffolder_template as any)?.metadata;
    const spec = (t.scaffolder_template as any)?.spec;
    return (
      metadata?.name?.toLowerCase().includes(query) ||
      metadata?.description?.toLowerCase().includes(query) ||
      spec?.owner?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Box sx={{}}>
        {viewMode === 'list' ? (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px',
              overflow: 'hidden',
              mx: 16,
            }}
          >
            {filtered?.map(template => (
              <PublishedTemplateListRow
                key={template.id}
                publishedTemplate={template}
                onContextMenu={e => handleContextMenu(e, template.id)}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 3,
            }}
          >
            {filtered?.map(template => (
              <PublishedTemplateCard
                key={template.id}
                publishedTemplate={template}
                onContextMenu={e => handleContextMenu(e, template.id)}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </Box>
        )}
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
            if (contextMenu?.templateId) {
              const template = publishedTemplates.find(
                t => t.id === contextMenu.templateId,
              );
              if (template) {
                navigate(
                  `/scaffolder-studio/templates/${template.visual_template_id}/form`,
                );
              }
            }
            onClose();
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Run</Typography>
        </MenuItem>
        {!isLoadingPermission && canUnpublish && (
          <MenuItem
            onClick={() => {
              if (contextMenu?.templateId) {
                onUnpublish(contextMenu.templateId);
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <CloudOffIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Unpublish</Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
