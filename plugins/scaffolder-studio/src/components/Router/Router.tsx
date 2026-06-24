import { ReactNode, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmationDialogProvider } from '../Studio/dialogs/ConfirmationDialogContext';
import {
  FieldExtensionOptions,
  useCustomFieldExtensions,
} from '@backstage/plugin-scaffolder-react';
import { FieldExtensionsContext } from '../../context/FieldExtensionsContext';
import { configApiRef, useApi } from '@backstage/core-plugin-api';

// Suppress ResizeObserver errors globally so consuming apps don't have to.
/* eslint-disable no-console */
const _origError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('ResizeObserver')) return;
  _origError.apply(console, args);
};
/* eslint-enable no-console */
if (typeof window !== 'undefined') {
  window.addEventListener('error', e => {
    if (e.message?.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  });
}

// Overview/List Components
import { TemplatesView } from '../Studio/TemplateOverviewPage/components/TemplatesView';
import { TrashView } from '../Studio/TemplateOverviewPage/components/TrashView';
import { PublishedView } from '../Studio/TemplateOverviewPage/components/PublishedView';
import {
  PrefabLibraryView,
  PrefabsView,
} from '../Studio/TemplateOverviewPage/Prefabs';
import { ProjectOverviewPage } from '../Studio/TemplateOverviewPage/TemplateOverviewPage';

// Editor Components
import { PrefabEditor } from '../Studio/TemplateOverviewPage/Prefabs/PrefabEditor';
import { DryRunPage } from '../Studio/DryRunPage';
import { VisualTemplateEditorComponent } from '../Studio/VisualTemplateEditorComponent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { FormField } from '@backstage/plugin-scaffolder-react/alpha';

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
  formFields?: Array<FormField>;
  children?: ReactNode;
}

type InternalFormField = FieldExtensionOptions & {
  $$type?: string;
  version?: string;
};

const toFieldExtensionOptions = (
  formField: FormField,
): FieldExtensionOptions | undefined => {
  const field = formField as unknown as InternalFormField;

  if (field.$$type && field.$$type !== '@backstage/scaffolder/FormField') {
    return undefined;
  }

  if (!field.name || !field.component) {
    return undefined;
  }

  return {
    name: field.name,
    component: field.component,
    validation: field.validation,
    schema: field.schema,
  };
};

const UnifiedRouter = ({ formFields, children }: UnifiedRouterProps) => {
  const parentTheme = useTheme();
  const configApi = useApi(configApiRef);
  const childFieldExtensions = useCustomFieldExtensions(children);
  const isLibraryEnabled =
    configApi.getOptionalBoolean('scaffolder.studio.prefabs.libraryEnabled') ??
    true;

  const pluginTheme = useMemo(() => {
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
        MuiTable: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent',
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent',
            },
          },
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent',
            },
          },
        },
        MuiTableBody: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent',
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent !important',
            },
          },
        },
        MuiTableContainer: {
          styleOverrides: {
            root: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
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

  const allFieldExtensions = useMemo(
    () => [
      ...childFieldExtensions,
      ...(formFields?.flatMap(field => {
        const fieldExtension = toFieldExtensionOptions(field);
        return fieldExtension ? [fieldExtension] : [];
      }) ?? []),
    ],
    [childFieldExtensions, formFields],
  );

  return (
    <ThemeProvider theme={pluginTheme}>
      <FieldExtensionsContext.Provider value={allFieldExtensions}>
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
                {isLibraryEnabled && (
                  <Route
                    path="prefab-library"
                    element={<PrefabLibraryView />}
                  />
                )}
              </Route>

              {/* Prefab Editor Route */}
              <Route path="prefab/:id" element={<PrefabEditor />} />

              {/* Template Editor Routes */}
              <Route
                path="templates/:id"
                element={<VisualTemplateEditorComponent />}
              />
              <Route
                path="templates/:id/:tab"
                element={<VisualTemplateEditorComponent />}
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
