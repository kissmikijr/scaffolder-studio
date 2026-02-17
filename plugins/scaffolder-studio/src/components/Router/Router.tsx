import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfirmationDialogProvider } from '../Studio/dialogs/ConfirmationDialogContext';
import { useCustomFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { FieldExtensionsContext } from '../../context/FieldExtensionsContext';

// Overview/List Components
import { TemplatesView } from '../Studio/TemplateOverviewPage/components/TemplatesView';
import { TrashView } from '../Studio/TemplateOverviewPage/components/TrashView';
import { PublishedView } from '../Studio/TemplateOverviewPage/components/PublishedView';
import {
  PrefabsView,
  PrefabLibraryView,
} from '../Studio/TemplateOverviewPage/Prefabs';
import { ProjectOverviewPage } from '../Studio/TemplateOverviewPage/TemplateOverviewPage';

// Editor Components
import { PrefabEditor } from '../Studio/TemplateOverviewPage/Prefabs/PrefabEditor';
import { DryRunPage } from '../Studio/DryRunPage';
import { VisualTemplateEditorComponent } from '../Studio/VisualTemplateEditorComponent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createTheme, useTheme, ThemeProvider } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    complimentBackground?: string;
  }
  // allow configuration using `createTheme()`
  interface ThemeOptions {
    complimentBackground?: string;
  }
}

const queryClient = new QueryClient();

export interface UnifiedRouterProps {
  children?: React.ReactNode;
}

const UnifiedRouter = ({ children }: UnifiedRouterProps) => {
  const parentTheme = useTheme();

  const pluginTheme = React.useMemo(() => {
    const backgroundColor =
      parentTheme.palette.mode === 'dark' ? '#16161a' : '#fafafa';
    const backgroundCompliment =
      parentTheme.palette.mode === 'dark' ? '#222' : '#f0f0f0';
    const disabledButtonStyles = {
      backgroundColor: parentTheme.palette.action.disabledBackground,
      color: parentTheme.palette.action.disabled,
      boxShadow: 'none',
    };

    return createTheme({
      ...parentTheme,
      complimentBackground: backgroundCompliment,
      palette: {
        ...parentTheme.palette,
        background: {
          ...parentTheme.palette.background,
          default: backgroundColor,
        },
        primary: {
          main:
            parentTheme.palette.mode === 'dark'
              ? 'rgb(232, 232, 232)'
              : 'rgb(98, 98, 98)',
        },
      },
      components: {
        ...parentTheme.components,
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: '24px',
              fontWeight: parentTheme.typography.fontWeightMedium,
              padding: parentTheme.spacing(0.75, 3),
              margin: parentTheme.spacing(1, 1, 1, 0),
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(0, 0, 0, 0.2)',
              color:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(255, 255, 255)'
                  : 'rgb(0, 0, 0)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
            // MUI v5 slot for disabled state
            disabled: {
              backgroundColor: parentTheme.palette.action.disabledBackground,
              color: parentTheme.palette.action.disabled,
            },
            // MUI v5 slots for color variants (contained is default variant)
            containedPrimary: {
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(160, 160, 160)'
                  : 'rgb(55, 55, 55)',
              color:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(0, 0, 0)'
                  : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.33)'
                    : 'rgb(89, 89, 89)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
            containedSecondary: {
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(33, 33, 33)'
                  : 'rgb(224, 224, 224)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.33)'
                    : 'rgb(195, 195, 195)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
            // Text variant color overrides
            textPrimary: {
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(160, 160, 160)'
                  : 'rgb(55, 55, 55)',
              color:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(0, 0, 0)'
                  : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.33)'
                    : 'rgb(89, 89, 89)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
            textSecondary: {
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(33, 33, 33)'
                  : 'rgb(224, 224, 224)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.33)'
                    : 'rgb(195, 195, 195)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            colorSecondary: {
              borderRadius: '24px',
              padding: parentTheme.spacing(0.75),
              backgroundColor:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(33, 33, 33)'
                  : 'rgb(224, 224, 224)',
              color:
                parentTheme.palette.mode === 'dark'
                  ? 'rgb(255, 255, 255)'
                  : 'rgb(0, 0, 0)',
              '&:hover': {
                backgroundColor:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.33)'
                    : 'rgb(195, 195, 195)',
                boxShadow: parentTheme.shadows[4],
              },
              '&.Mui-disabled': disabledButtonStyles,
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            root: {
              minHeight: 'auto',
            },
            indicator: {
              display: 'none',
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              '&&': {
                minHeight: 'auto',
                minWidth: 'auto',
                padding: parentTheme.spacing(0.5, 0.5),
                margin: parentTheme.spacing(1, 1, 1, 0),
                textTransform: 'none',
                color:
                  parentTheme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(0,0,0,0.6)',
                borderRadius: '8px',
                '&.Mui-selected': {
                  color:
                    parentTheme.palette.mode === 'dark'
                      ? '#fff'
                      : parentTheme.palette.text.primary,
                  backgroundColor:
                    parentTheme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.05)',
                },
                '&:hover': {
                  backgroundColor:
                    parentTheme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.05)',
                  color:
                    parentTheme.palette.mode === 'dark'
                      ? '#fff'
                      : parentTheme.palette.text.primary,
                },
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundColor: backgroundColor,
            },
          },
        },
        MuiStepIcon: {
          styleOverrides: {
            root: {
              color: 'rgba(255,255,255,0.6)',
              '&.Mui-completed': {
                color: '#bdbdbd',
              },
              '&.Mui-active': {
                color: '#e0e0e0',
              },
            },
            text: {
              fill: 'currentColor',
            },
          },
        },
      },
    });
  }, [parentTheme]);

  const customFieldExtensions = useCustomFieldExtensions(children);

  return (
    <ThemeProvider theme={pluginTheme}>
      <FieldExtensionsContext.Provider value={customFieldExtensions}>
        <ConfirmationDialogProvider>
          <QueryClientProvider client={queryClient}>
            <Routes>
              {/* Overview/List Routes */}
              <Route path="/" element={<ProjectOverviewPage />}>
                <Route index element={<Navigate to="templates" replace />} />
                <Route path="templates" element={<TemplatesView />} />
                <Route path="prefabs" element={<PrefabsView />} />
                <Route path="trash" element={<TrashView />} />
                <Route path="published" element={<PublishedView />} />
                <Route path="prefab-library" element={<PrefabLibraryView />} />
              </Route>

              {/* Prefab Editor Route */}
              <Route
                path="prefab/:id"
                element={
                  <div>
                    {children}
                    <PrefabEditor />
                  </div>
                }
              />

              {/* Template Editor Routes */}
              <Route
                path="templates/:id"
                element={
                  <div>
                    {children}
                    <VisualTemplateEditorComponent />
                  </div>
                }
              />
              <Route
                path="templates/:id/:tab"
                element={
                  <div>
                    {children}
                    <VisualTemplateEditorComponent />
                  </div>
                }
              />
              <Route path="templates/:id/dry-run" element={<DryRunPage />} />
            </Routes>
          </QueryClientProvider>
        </ConfirmationDialogProvider>
      </FieldExtensionsContext.Provider>
    </ThemeProvider>
  );
};

export { UnifiedRouter as Router };
