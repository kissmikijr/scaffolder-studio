import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Menu } from '@mui/material';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import { styledMenuProps } from '../../components/menuStyles';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { sortBy } from './sort';
import { PublishedTemplate } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { PublishedTemplateCard } from './PublishedTemplateCard';
import { usePermission } from '@backstage/plugin-permission-react';
import { scaffolderStudioUnpublishPermission } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export const PublishedView = () => {
  const { sort } = useOutletContext<{ sort: string }>();
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
  }, []);

  const onClose = () => setContextMenu(null);

  const handleContextMenu = (e: React.MouseEvent, templateId: string) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX + 2,
      mouseY: e.clientY - 6,
      templateId,
    });
  };

  const onUnpublish = async (id: string) => {
    const template = publishedTemplates.find(t => t.id === id);
    if (!template) {
      return;
    }
    await api.unpublish({
      visualTemplateId: id,
      scaffolderTemplate: template.scaffolder_template,
    });
    setPublishedTemplates(prev => prev.filter(template => template.id !== id));
    alertApi.post({
      message: 'Template has been unpublished',
      severity: 'success',
      display: 'transient',
    });
    onClose();
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 3,
          }}
        >
          {publishedTemplates?.map(template => (
            <PublishedTemplateCard
              key={template.id}
              publishedTemplate={template}
              onContextMenu={e => handleContextMenu(e, template.id)}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => setSelectedTemplateId(template.id)}
            />
          ))}
        </Box>
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
          Run
        </MenuItem>
        {!isLoadingPermission && canUnpublish && (
          <MenuItem
            onClick={() => {
              if (contextMenu?.templateId) {
                onUnpublish(contextMenu.templateId);
              }
            }}
          >
            Unpublish
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
