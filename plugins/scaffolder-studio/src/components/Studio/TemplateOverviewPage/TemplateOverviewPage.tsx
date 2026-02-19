import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  Typography,
  Tooltip,
  Button,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import {
  useNavigate,
  useLocation,
  matchPath,
  Outlet,
  Link,
} from 'react-router-dom';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  scaffolderVisualApiRef,
  ScaffolderStudioApi,
} from '../../../api/ScaffolderVisualClient';
import { v4 as uuidv4 } from 'uuid';
import { ImportTemplateDialog } from './components/ImportYamlSkeleton';
import { usePermission } from '@backstage/plugin-permission-react';
import { scaffolderStudioPrefabReadPermission } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useViewMode } from './hooks/useViewMode';
import { ViewToggle } from './components/ViewToggle';
import { useTemplateCreator } from './hooks/useTemplateCreator';
import { usePrefabCreator } from './hooks/usePrefabCreator';

const currentTabMap = {
  '/scaffolder-studio/published': 'Published',
  '/scaffolder-studio/prefab-library': 'Prefab Library',
  '/scaffolder-studio/templates': 'Your Templates',
  '/scaffolder-studio/prefabs': 'Your Prefabs',
  '/scaffolder-studio/trash': 'Your Trash',
};

const currentTabDescriptionMap = {
  '/scaffolder-studio/published':
    'Run templates in Backstage and unpublish when needed.',
  '/scaffolder-studio/prefab-library':
    'Browse reusable prefab examples to speed up template creation.',
  '/scaffolder-studio/templates':
    'Create, edit, import, and publish template drafts.',
  '/scaffolder-studio/prefabs':
    'Create and manage reusable building blocks for your templates.',
  '/scaffolder-studio/trash':
    'Review recently removed items and restore them if required.',
};

function useRouteMatch(patterns: readonly string[]) {
  const { pathname } = useLocation();

  for (let i = 0; i < patterns.length; i += 1) {
    const pattern = patterns[i];
    const possibleMatch = matchPath(pattern, pathname);
    if (possibleMatch !== null) {
      return possibleMatch;
    }
  }

  return null;
}

export const ProjectOverviewPage = () => {
  const api = useApi<ScaffolderStudioApi>(scaffolderVisualApiRef);
  const configApi = useApi(configApiRef);
  const isLibraryEnabled =
    configApi.getOptionalBoolean('scaffolder.studio.prefabs.libraryEnabled') ??
    true;


  const navigate = useNavigate();
  const theme = useTheme();
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [hasPublishers, setHasPublishers] = useState(false);
  const { allowed: canReadPrefabs } = usePermission({
    permission: scaffolderStudioPrefabReadPermission,
  });
  const { createTemplate } = useTemplateCreator();
  const { createPrefab } = usePrefabCreator();

  const [sort, setSort] = useState('updated');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    api.listPublishers().then(publishers => {
      setHasPublishers(publishers.length > 0);
    });
  }, [api]);

  const handleImportYaml = async ({ template }: { template: unknown }) => {
    const newId = uuidv4();

    await api.importTemplate({
      id: newId,
      template: template as Record<string, unknown>,
    });

    navigate(`/scaffolder-studio/templates/${newId}/form`);
  };

  const routeMatch = useRouteMatch([
    '/scaffolder-studio/published',
    '/scaffolder-studio/prefab-library',
    '/scaffolder-studio/templates',
    '/scaffolder-studio/prefabs',
    '/scaffolder-studio/trash',
  ]);
  const currentTab = routeMatch?.pattern?.path ?? 'templates';
  const pageKey = currentTab.split('/').pop() || 'templates';
  const { viewMode, setViewMode } = useViewMode(pageKey);

  const handleCreateNew = async () => {
    if (currentTab.includes('prefabs')) {
      await createPrefab();
    } else {
      await createTemplate();
    }
  };
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <Box
        display={'flex'}
        flexDirection={'row'}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: '24px',
          paddingBottom: '16px',
          borderBottom: `1px solid ${theme.palette.divider}`,
          height: '94px', // Fixed height to prevent layout jump
          boxSizing: 'border-box',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="h4" component="h1">
            {currentTabMap[currentTab as keyof typeof currentTabMap]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {
              currentTabDescriptionMap[
              currentTab as keyof typeof currentTabDescriptionMap
              ]
            }
          </Typography>
        </Box>
        {/* Always render buttons with visibility to maintain consistent height */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            visibility:
              currentTab !== '/scaffolder-studio/trash' &&
                currentTab !== '/scaffolder-studio/published'
                ? 'visible'
                : 'hidden',
          }}
        >
          <Box
            sx={{
              visibility:
                currentTab === '/scaffolder-studio/templates'
                  ? 'visible'
                  : 'hidden',
              display:
                currentTab === '/scaffolder-studio/templates'
                  ? 'block'
                  : 'none',
            }}
          >
            <Tooltip title="Import from YAML">
              <Button
                color="secondary"
                onClick={() => setOpenImportDialog(true)}
              >
                Import Template
              </Button>
            </Tooltip>
          </Box>
          <Tooltip title="New Project">
            <Button
              color="primary"
              onClick={handleCreateNew}
              variant="contained"
              startIcon={<AddIcon />}
            >
              New
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Box
        display={'flex'}
        flexDirection={'row'}
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        sx={{
          paddingLeft: '32px',
          paddingRight: '32px',
          minHeight: '48px', // Fixed height to prevent layout jump
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tabs value={currentTab}>
            {hasPublishers && (
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Published</span>
                  </Box>
                }
                value="/scaffolder-studio/published"
                component={Link}
                to="/scaffolder-studio/published"
              />
            )}
            {isLibraryEnabled && (
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Prefab Library</span>
                  </Box>
                }
                value="/scaffolder-studio/prefab-library"
                component={Link}
                to="/scaffolder-studio/prefab-library"
              />
            )}
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Templates</span>
                </Box>
              }
              value="/scaffolder-studio/templates"
              component={Link}
              to="templates"
            />
            {canReadPrefabs && (
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Prefabs</span>
                  </Box>
                }
                value="/scaffolder-studio/prefabs"
                component={Link} // Use div to avoid rendering as an interactive element
                to="prefabs"
              />
            )}

            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Trash</span>
                </Box>
              }
              value="/scaffolder-studio/trash"
              component={Link}
              to="trash"
            />
          </Tabs>
        </Box>
        <Box
          sx={{
            minWidth: 160,
            visibility:
              currentTab === '/scaffolder-studio/templates' ||
                currentTab === '/scaffolder-studio/prefabs' ||
                currentTab === '/scaffolder-studio/trash'
                ? 'visible'
                : 'hidden',
            display: 'flex',
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search"
            size="small"
            variant="outlined"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: '12px',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.03)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.1)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.2)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
            sx={{
              width: 300,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={sort}
              onChange={e => setSort(e.target.value as string)}
              displayEmpty
              sx={{
                borderRadius: '12px',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.03)',
                '& .MuiSelect-select': {
                  textTransform: 'none',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  color: theme.palette.text.primary,
                  fontWeight: 500,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.1)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.2)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: '1px',
                },
                '& .MuiSvgIcon-root': {
                  color: theme.palette.text.secondary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: '12px',
                    mt: 0.5,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 20px rgba(0,0,0,0.5)'
                        : '0 4px 20px rgba(0,0,0,0.1)',
                    backgroundColor:
                      theme.palette.mode === 'dark' ? '#2a2a2a' : '#fff',
                  },
                },
              }}
            >
              <MenuItem value="name" sx={{ borderRadius: '8px', mx: 0.5 }}>
                Name
              </MenuItem>
              <MenuItem value="updated" sx={{ borderRadius: '8px', mx: 0.5 }}>
                Last Modified
              </MenuItem>
            </Select>
          </FormControl>
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </Box>
      </Box>

      <Box sx={{ padding: '0 32px' }}>
        <Outlet context={{ sort, onSortChange: setSort, searchText, viewMode }} />
      </Box>
      <ImportTemplateDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={parsed => {
          setOpenImportDialog(false);
          handleImportYaml({ template: parsed });
        }}
      />
    </Box>
  );
};
