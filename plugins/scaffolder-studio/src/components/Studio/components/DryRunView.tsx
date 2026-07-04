import { useRef, useState, useCallback, useMemo, useEffect } from 'react';

import {
  Box,
  CircularProgress,
  Typography,
  Collapse,
  Tooltip,
  Button,
  useTheme,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { StyledIconButton } from './StyledIconButton';
import { Edge, Node } from '@xyflow/react';

import {
  scaffolderApiRef,
  ScaffolderTaskStatus,
} from '@backstage/plugin-scaffolder-react';
import { useApi } from '@backstage/core-plugin-api';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import yaml from 'js-yaml';
import {
  DefaultTemplateOutputs,
  Stepper,
} from '@backstage/plugin-scaffolder-react/alpha';
import { SecretsContextProvider } from '@backstage/plugin-scaffolder-react';
import {
  getDirectChildren,
  traverseFromNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { LogViewer, ResponseErrorPanel } from '@backstage/core-components';
import { scaffolderVisualApiRef } from '../../../api/ScaffolderVisualClient';
import { AllNodeData, isParametersNode, isTemplateNode } from '../types';
import { DateTime, Interval } from 'luxon';
import humanizeDuration from 'humanize-duration';
import { useInterval } from 'react-use';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ClearIcon from '@mui/icons-material/Clear';
import { Theme } from '@mui/material/styles';
import { useFieldExtensions } from '../../../context/FieldExtensionsContext';
import {
  buildSecretsPayload,
  clearRememberedDryRunSecretValues,
  collectDryRunSecretFields,
  getRememberedDryRunSecretValues,
  getMissingRequiredSecrets,
  rememberDryRunSecretValues,
  SecretField,
} from './dryRunSecrets';

// Type definitions for dry run result
type DryRunLogEntry = {
  body: {
    message: string;
    stepId?: string;
    status?: ScaffolderTaskStatus;
  };
  createdAt: string;
  id: string;
  taskId: string;
  type: string;
};

type DryRunStep = {
  id: string;
  name: string;
  action: string;
  status: ScaffolderTaskStatus;
  startedAt?: string;
  endedAt?: string;
};

type DryRunOutput = {
  links?: Array<{
    title?: string;
    url?: string;
    icon?: string;
    entityRef?: string;
  }>;
  text?: Array<{
    title?: string;
    content?: string;
  }>;
};

type DryRunResult = {
  steps: DryRunStep[];
  log: DryRunLogEntry[];
  output: DryRunOutput;
};

type ProcessedStep = {
  id: string;
  name: string;
  logString: string;
  status: ScaffolderTaskStatus;
  startedAt?: string;
  endedAt?: string;
};

type ParameterSchema = {
  title: string;
  description?: string;
  required?: string[];
  properties?: Record<
    string,
    {
      type: string;
      title?: string;
      description?: string;
      pattern?: string;
      enum?: string[];
      'ui:field'?: string;
      'ui:options'?: string;
    }
  >;
};

const getSecretSourceLabel = (field: SecretField) => {
  const actionSources = field.sources.filter(source => source.actionId);
  if (actionSources.length > 0) {
    const labels = actionSources.map(source => {
      const stepLabel = source.stepName || source.stepId;
      return stepLabel ? `${stepLabel} · ${source.actionId}` : source.actionId!;
    });
    return `Used by ${Array.from(new Set(labels)).join(', ')}`;
  }

  if (field.sources.some(source => source.type === 'template-schema')) {
    return 'Declared by template secret schema';
  }

  return 'Referenced in template';
};

const collapsibleHeaderCompactStyles = (theme: Theme) => ({
  display: 'flex',
  color: theme.palette.text.primary,
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  backgroundColor: theme.complimentBackground,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  padding: '8px 16px',
  borderRadius: '24px',
});

// Shared style objects for tabs
type TaskStep = {
  id: string;
  name: string;
  status: ScaffolderTaskStatus;
  startedAt?: string;
  endedAt?: string;
};
const StepTimeTicker = ({ step }: { step: TaskStep }) => {
  const [time, setTime] = useState('');

  useInterval(() => {
    if (!step.startedAt) {
      setTime('');
      return;
    }

    const end = step.endedAt
      ? DateTime.fromISO(step.endedAt)
      : DateTime.local();

    const startedAt = DateTime.fromISO(step.startedAt);
    const formatted = Interval.fromDateTimes(startedAt, end)
      .toDuration()
      .valueOf();

    setTime(humanizeDuration(formatted, { round: true }));
  }, 1000);

  return <Typography variant="caption">{time}</Typography>;
};

const StepStatusIcon = ({
  isActive,
  isCompleted,
  isFailed,
  isCancelled,
  statusColor,
}: {
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  statusColor: string;
}) => {
  if (isActive) return <CircularProgress size={14} />;
  if (isCompleted)
    return <CheckIcon sx={{ fontSize: 16, color: statusColor }} />;
  if (isFailed || isCancelled)
    return <CancelIcon sx={{ fontSize: 16, color: statusColor }} />;
  return <FiberManualRecordIcon sx={{ fontSize: 12, color: statusColor }} />;
};

export const DryRunView = ({
  nodes,
  edges,
  templateId,
}: {
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  templateId: string;
}) => {
  const theme = useTheme();
  const scaffolderApi = useApi(scaffolderApiRef);
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [selectedLogTab, setSelectedLogTab] = useState<string>('all');
  const [outputExpanded, setOutputExpanded] = useState<boolean>(true);
  const [dryRunStepperExpanded, setDryRunStepperExpanded] =
    useState<boolean>(true);
  const [secretsExpanded, setSecretsExpanded] = useState<boolean>(true);
  const [processedStepsExpanded, setProcessedStepsExpanded] =
    useState<boolean>(true);
  const customFieldExtensions = useFieldExtensions();
  const templateNode = nodes.find(n => isTemplateNode(n));
  const fields = useMemo(() => {
    return Object.fromEntries(
      customFieldExtensions.map(({ name, component }) => [name, component]),
    );
  }, [customFieldExtensions]);
  const [error, setError] = useState<Error | null>(null);
  const [resolvedNodes, setResolvedNodes] = useState<Node<AllNodeData>[]>([]);
  const [savedFormData, setSavedFormData] = useState<Record<string, any>>({});
  const [isLoadingInputs, setIsLoadingInputs] = useState(true);
  const stepperContainerRef = useRef<HTMLDivElement | null>(null);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  const [templateEntity, setTemplateEntity] =
    useState<TemplateEntityV1beta3 | null>(null);
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>(
    {},
  );
  const [secretErrors, setSecretErrors] = useState<
    Record<string, string | undefined>
  >({});

  const serializeCurrentTemplate = useCallback(async () => {
    if (!templateNode) {
      return null;
    }

    const template = await scaffolderVisualApi.serializeTemplate({
      nodes,
      edges,
      sourceNodeId: templateNode.id,
    });
    return yaml.load(template) as TemplateEntityV1beta3;
  }, [edges, nodes, scaffolderVisualApi, templateNode]);

  useEffect(() => {
    scaffolderVisualApi
      .listActions()
      .then(actions => setAvailableActions(actions))
      .catch(() => setAvailableActions([]));
  }, [scaffolderVisualApi]);

  useEffect(() => {
    let cancelled = false;

    serializeCurrentTemplate()
      .then(template => {
        if (!cancelled) {
          setTemplateEntity(template);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateEntity(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [serializeCurrentTemplate]);

  const secretFields = useMemo(
    () =>
      collectDryRunSecretFields({
        template: templateEntity,
        actions: availableActions,
      }),
    [availableActions, templateEntity],
  );
  const hasSecretValues = useMemo(
    () => Object.values(secretValues).some(value => value.trim()),
    [secretValues],
  );

  useEffect(() => {
    setSecretValues(getRememberedDryRunSecretValues(templateId));
    setSecretErrors({});
    setVisibleSecrets({});
  }, [templateId]);

  // Load saved dry run inputs on mount
  useEffect(() => {
    if (templateId) {
      scaffolderVisualApi
        .getDryRunInputs(templateId)
        .then(inputs => {
          setSavedFormData(inputs || {});
        })
        .catch(() => {
          // Ignore errors, just use empty form
          setSavedFormData({});
        })
        .finally(() => {
          setIsLoadingInputs(false);
        });
    } else {
      setIsLoadingInputs(false);
    }
  }, [templateId, scaffolderVisualApi]);

  const handleDryRun = useCallback(
    async (values: Record<string, unknown>) => {
      setDryRunResult(null);
      setSelectedLogTab('all'); // Reset tab selection when starting new dry run
      setSecretErrors({});

      const missingSecrets = getMissingRequiredSecrets(
        secretFields,
        secretValues,
      );

      if (missingSecrets.length > 0) {
        setSecretErrors(
          Object.fromEntries(
            missingSecrets.map(key => [key, 'This secret is required']),
          ),
        );
        window.requestAnimationFrame(() => {
          document
            .getElementById(`dry-run-secret-${missingSecrets[0]}`)
            ?.focus();
        });
        return;
      }

      try {
        // Persist inputs before executing dry run so reopen is deterministic.
        if (templateId) {
          try {
            await scaffolderVisualApi.saveDryRunInputs(templateId, values);
          } catch {
            // Non-blocking: dry run still executes even if persistence fails.
          }
        }

        if (templateNode) {
          const parsedTemplate =
            templateEntity ?? (await serializeCurrentTemplate());
          if (!parsedTemplate) {
            return;
          }

          if (scaffolderApi.dryRun) {
            const result = await scaffolderApi.dryRun({
              template: parsedTemplate as any,
              values: values as Record<
                string,
                string | number | boolean | null
              >,
              secrets: buildSecretsPayload(secretFields, secretValues),
              directoryContents: [],
            });
            setDryRunResult(result as unknown as DryRunResult);
          } else {
            // Dry run not supported or undefined
          }
        }
      } catch (err) {
        setError(err as Error);
        setDryRunResult(null);
      }
    },
    [
      secretFields,
      secretValues,
      templateId,
      serializeCurrentTemplate,
      templateEntity,
      templateNode,
      scaffolderApi,
      scaffolderVisualApi,
    ],
  );

  useEffect(() => {
    if (nodes) {
      scaffolderVisualApi
        .resolve({ nodes })
        .then(result => setResolvedNodes(result as Node<AllNodeData>[]));
    }
  }, [nodes, scaffolderVisualApi]);

  const steps = useMemo((): ParameterSchema[] => {
    const subGraphNodes = traverseFromNode(
      templateNode?.id || '',
      edges,
      resolvedNodes,
    );

    const parametersNodes = subGraphNodes.filter(n => isParametersNode(n));

    return parametersNodes.map(node => {
      const subNodes = getDirectChildren(
        node.id,
        edges,
        resolvedNodes,
        'property',
      );

      const parameterSchema: ParameterSchema = {
        title: node.data.title,
        required: subNodes
          .filter(p => (p.data as any).required)
          .map(p => (p.data as any).name || '')
          .filter(
            (name): name is string => typeof name === 'string' && name !== '',
          ),
        properties: subNodes.reduce((acc: any, prop) => {
          const paramData = prop.data as any;
          if (
            paramData.name &&
            paramData.variableType &&
            typeof paramData.name === 'string' &&
            typeof paramData.variableType === 'string'
          ) {
            acc[paramData.name] = {
              type: paramData.variableType,
              title: paramData.title,
              description: paramData.description,
              pattern: paramData.pattern,
              enum: paramData.enum,
              'ui:field':
                typeof paramData['ui:field'] === 'string'
                  ? paramData['ui:field']
                  : undefined,
              'ui:options':
                typeof paramData['ui:options'] === 'string'
                  ? paramData['ui:options']
                  : undefined,
            };
          }
          return acc;
        }, {}),
      };
      return parameterSchema;
    });
  }, [templateNode, edges, resolvedNodes]);

  // Stepper/Form require at least one step with a valid schema (type: 'object').
  // When there are no parameter nodes, pass a single placeholder to avoid RJSF "Invalid schema: undefined".
  const stepsForStepper = useMemo(() => {
    const withType = steps.map(s => ({
      title: s.title,
      description: s.description ?? '',
      schema: { type: 'object' as const, ...s },
    }));
    return withType.length > 0
      ? withType
      : [
          {
            title: 'Template Parameters',
            description: '',
            schema: { type: 'object' as const, properties: {}, title: '' },
          },
        ];
  }, [steps]);

  const processedSteps = useMemo((): ProcessedStep[] => {
    if (!dryRunResult) return [];

    return dryRunResult.steps.map(step => {
      const stepLog = dryRunResult.log.filter(l => l.body.stepId === step.id);
      return {
        id: step.id,
        name: step.name,
        logString: stepLog.map(l => l.body.message).join('\n'),
        status: stepLog[stepLog.length - 1]?.body.status ?? 'completed',
        startedAt: step.startedAt,
        endedAt: step.endedAt,
      };
    });
  }, [dryRunResult]);

  const filteredLogText = useMemo(() => {
    if (!dryRunResult) return '';

    if (selectedLogTab === 'all') {
      return dryRunResult.log.map(log => log.body.message).join('\n');
    }

    const selectedStep = processedSteps.find(
      step => step.id === selectedLogTab,
    );
    return selectedStep?.logString || '';
  }, [dryRunResult, selectedLogTab, processedSteps]);

  const handleOutputToggle = useCallback(() => {
    setOutputExpanded(prev => !prev);
  }, []);

  const handleDryRunStepperToggle = useCallback(() => {
    setDryRunStepperExpanded(prev => !prev);
  }, []);

  const handleSecretsToggle = useCallback(() => {
    setSecretsExpanded(prev => !prev);
  }, []);

  const handleClearSecrets = useCallback(() => {
    clearRememberedDryRunSecretValues(templateId);
    setSecretValues({});
    setSecretErrors({});
    setVisibleSecrets({});
  }, [templateId]);

  const handleProcessedStepsToggle = useCallback(() => {
    setProcessedStepsExpanded(prev => !prev);
  }, []);

  useEffect(() => {
    if (dryRunResult) {
      setDryRunStepperExpanded(false);
      setProcessedStepsExpanded(true);
      setOutputExpanded(false);
    }
  }, [dryRunResult]);

  useEffect(() => {
    if (isLoadingInputs || dryRunResult || !dryRunStepperExpanded) {
      return () => {};
    }

    // Always normalize to the first input step after (re)opening dry run.
    // The underlying Stepper can reopen on Review when initial data is prefilled.
    let attempts = 0;
    const maxAttempts = 8;
    let timeoutId: number | undefined;

    const moveToFirstStep = () => {
      if (attempts >= maxAttempts) {
        return;
      }

      const container = stepperContainerRef.current;
      if (!container) {
        return;
      }

      const backButton = Array.from(container.querySelectorAll('button')).find(
        button => {
          const text = button.textContent?.trim().toLowerCase();
          const disabled = (button as HTMLButtonElement).disabled;
          const isVisible = button.getClientRects().length > 0;
          return text === 'back' && !disabled && isVisible;
        },
      ) as HTMLButtonElement | undefined;

      if (!backButton) {
        return;
      }

      attempts += 1;
      backButton.click();
      timeoutId = window.setTimeout(moveToFirstStep, 0);
    };

    timeoutId = window.setTimeout(moveToFirstStep, 0);
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoadingInputs, dryRunResult, dryRunStepperExpanded, savedFormData]);

  return (
    <Box>
      <SecretsContextProvider>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            pb: 3,
            flex: 1,
            gap: 2,
            minHeight: 0,
            height: '100%',
            mx: { xs: 4, sm: 8, md: 32 },
          }}
        >
          {secretFields.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                onClick={handleSecretsToggle}
                sx={collapsibleHeaderCompactStyles}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">Secrets</Typography>
                  <Chip
                    size="small"
                    label={secretFields.length}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      color: theme.palette.text.primary,
                    }}
                  />
                </Box>
                <StyledIconButton
                  size="small"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    pointerEvents: 'none',
                  }}
                >
                  {secretsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </StyledIconButton>
              </Box>
              <Collapse in={secretsExpanded}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    py: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Secrets stay in browser memory for this template until you
                      refresh, close the tab, or clear them.
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ClearIcon fontSize="small" />}
                      onClick={handleClearSecrets}
                      disabled={!hasSecretValues}
                      sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                    >
                      Clear secrets
                    </Button>
                  </Box>
                  {secretFields.map(field => {
                    const sourceLabel = getSecretSourceLabel(field);

                    return (
                      <Box
                        key={field.key}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            md: 'minmax(0, 1fr) auto',
                          },
                          gap: 1,
                          alignItems: 'start',
                        }}
                      >
                        <TextField
                          id={`dry-run-secret-${field.key}`}
                          label={field.label}
                          required={field.required}
                          type={visibleSecrets[field.key] ? 'text' : 'password'}
                          value={secretValues[field.key] ?? ''}
                          error={Boolean(secretErrors[field.key])}
                          helperText={
                            secretErrors[field.key] ||
                            field.description ||
                            sourceLabel
                          }
                          onChange={event => {
                            const nextValue = event.target.value;
                            setSecretValues(prev => {
                              const nextValues = {
                                ...prev,
                                [field.key]: nextValue,
                              };
                              rememberDryRunSecretValues(
                                templateId,
                                nextValues,
                              );
                              return nextValues;
                            });
                            if (nextValue.trim()) {
                              setSecretErrors(prev => ({
                                ...prev,
                                [field.key]: undefined,
                              }));
                            }
                          }}
                          fullWidth
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label={`${
                                    visibleSecrets[field.key] ? 'Hide' : 'Show'
                                  } ${field.label}`}
                                  edge="end"
                                  size="small"
                                  onClick={() =>
                                    setVisibleSecrets(prev => ({
                                      ...prev,
                                      [field.key]: !prev[field.key],
                                    }))
                                  }
                                >
                                  {visibleSecrets[field.key] ? (
                                    <VisibilityOffIcon fontSize="small" />
                                  ) : (
                                    <VisibilityIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            minWidth: { md: 180 },
                            pt: 0.25,
                          }}
                        >
                          <Chip
                            size="small"
                            label={field.required ? 'Required' : 'Optional'}
                            color={field.required ? 'warning' : 'default'}
                            variant={field.required ? 'filled' : 'outlined'}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{
                              maxWidth: { md: 260 },
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {sourceLabel}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              onClick={handleDryRunStepperToggle}
              sx={collapsibleHeaderCompactStyles}
            >
              <Typography variant="h6">Template Parameters</Typography>
              <StyledIconButton
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  pointerEvents: 'none',
                }}
              >
                {dryRunStepperExpanded ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </StyledIconButton>
            </Box>
            <Collapse in={dryRunStepperExpanded}>
              <Box
                ref={stepperContainerRef}
                sx={{
                  overflowY: 'auto',
                  '& .MuiButtonBase-root.MuiButton-root.MuiButton-contained.MuiButton-containedPrimary':
                    {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.3)'
                          : 'rgba(0, 0, 0, 0.2)',
                      color: theme.palette.text.primary,
                      '&:hover': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0, 0, 0, 0.1)',
                        boxShadow: theme.shadows[4],
                      },
                      borderRadius: '24px',
                    },
                }}
              >
                {isLoadingInputs ? (
                  <CircularProgress size={24} />
                ) : (
                  <Stepper
                    onCreate={handleDryRun}
                    extensions={customFieldExtensions}
                    manifest={{
                      title: 'Scaffolder Template',
                      steps: stepsForStepper,
                    }}
                    components={{
                      ...fields,
                    }}
                    initialState={savedFormData}
                  />
                )}
              </Box>
            </Collapse>
          </Box>
          {dryRunResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  onClick={handleOutputToggle}
                  sx={collapsibleHeaderCompactStyles}
                >
                  <Typography variant="h6">Template Outputs</Typography>
                  <StyledIconButton
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      pointerEvents: 'none',
                    }}
                  >
                    {outputExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </StyledIconButton>
                </Box>

                {dryRunResult.output &&
                  ((dryRunResult.output.links &&
                    dryRunResult.output.links.length > 0) ||
                    (dryRunResult.output.text &&
                      dryRunResult.output.text.length > 0)) && (
                    <Collapse in={outputExpanded}>
                      <DefaultTemplateOutputs
                        output={
                          dryRunResult.output as unknown as Record<
                            string,
                            unknown
                          >
                        }
                      />
                    </Collapse>
                  )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  onClick={handleProcessedStepsToggle}
                  sx={collapsibleHeaderCompactStyles}
                >
                  <Typography variant="h6">Execution Steps</Typography>
                  <StyledIconButton
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      pointerEvents: 'none',
                    }}
                  >
                    {processedStepsExpanded ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </StyledIconButton>
                </Box>
                <Collapse in={processedStepsExpanded}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      overflowX: 'auto',
                      scrollSnapType: 'x mandatory',
                      px: 0.5,
                      pb: 1,
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.24)'
                            : 'rgba(0,0,0,0.18)',
                        borderRadius: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {processedSteps.map((step, index) => {
                      const isCancelled = step.status === 'cancelled';
                      const isActive = step.status === 'processing';
                      const isCompleted = step.status === 'completed';
                      const isFailed = step.status === 'failed';
                      const isSkipped = step.status === 'skipped';
                      const isDefault = !(
                        isCancelled ||
                        isActive ||
                        isCompleted ||
                        isFailed ||
                        isSkipped
                      );

                      const getStatusLabel = () => {
                        if (isCancelled) return 'Cancelled';
                        if (isActive) return 'Running';
                        if (isCompleted) return 'Done';
                        if (isFailed) return 'Failed';
                        if (isSkipped) return 'Skipped';
                        return 'Pending';
                      };
                      const statusLabel = getStatusLabel();

                      const getStatusColor = () => {
                        if (isCancelled || isFailed)
                          return theme.palette.error.main;
                        if (isCompleted) return theme.palette.success.main;
                        if (isActive) return theme.palette.info.main;
                        return theme.palette.text.secondary;
                      };
                      const statusColor = getStatusColor();

                      return (
                        <Tooltip
                          key={step.id}
                          title={step.name}
                          enterDelay={400}
                        >
                          <Box
                            onClick={() => setSelectedLogTab(step.id)}
                            sx={{
                              scrollSnapAlign: 'start',
                              minWidth: 240,
                              maxWidth: 280,
                              width: '100%',
                              borderRadius: '16px',
                              p: 1.5,
                              border:
                                selectedLogTab === step.id
                                  ? `1px solid ${theme.palette.primary.main}`
                                  : `1px solid ${theme.palette.divider}`,
                              background:
                                theme.palette.mode === 'dark'
                                  ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
                                  : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,248,248,0.9))',
                              boxShadow:
                                selectedLogTab === step.id
                                  ? theme.shadows[3]
                                  : 'none',
                              cursor: 'pointer',
                              transition:
                                'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: theme.shadows[2],
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 1,
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: '999px',
                                  bgcolor: 'action.hover',
                                  color: 'text.secondary',
                                }}
                              >
                                {index + 1}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <StepStatusIcon
                                  isActive={isActive}
                                  isCompleted={isCompleted}
                                  isFailed={isFailed}
                                  isCancelled={isCancelled}
                                  statusColor={statusColor}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: statusColor, fontWeight: 600 }}
                                >
                                  {statusLabel}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                lineHeight: 1.3,
                                minHeight: '2.6em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                mb: 1,
                              }}
                            >
                              {step.name}
                            </Typography>
                            {isSkipped ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Not executed
                              </Typography>
                            ) : (
                              <StepTimeTicker step={step} />
                            )}
                            {isDefault && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                Waiting to start
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                  <Box
                    sx={{
                      mt: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '16px',
                      p: 1.5,
                      background:
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2">
                        Execution Logs
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant={
                            selectedLogTab === 'all' ? 'contained' : 'outlined'
                          }
                          onClick={() => setSelectedLogTab('all')}
                        >
                          All Logs
                        </Button>
                        <Typography
                          variant="caption"
                          sx={{ alignSelf: 'center', color: 'text.secondary' }}
                        >
                          {selectedLogTab === 'all'
                            ? 'Viewing all steps'
                            : 'Viewing selected step'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ height: '320px' }}>
                      <LogViewer textWrap text={filteredLogText} />
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )}
          {error && (
            <Box>
              <ResponseErrorPanel error={error} />
            </Box>
          )}
        </Box>
      </SecretsContextProvider>
    </Box>
  );
};
