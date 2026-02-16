import React, { useMemo, useCallback, useRef } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  StoredPrefab,
  ScaffolderAction,
  StepNodeData,
  TemplateNodeData,
  ParametersNodeData,
  OutputNodeData,
  PropertyNodeData,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { ReactFlow, ReactFlowProvider, Node } from '@xyflow/react';
import { Box, FormControl, TextField, useTheme, Typography, Divider } from '@mui/material';
import '@xyflow/react/dist/style.css';
import { Select } from '@mui/material';
import { getNodeBase } from '../../nodeBase';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import PrefabQueenNode from '../../nodes/prefab/PrefabQueenNode';
import { useDebouncedSave } from './useDebouncedSave';
import { rehydrateNodes } from '../../rehydrateNodes';
import { PrefabSideNodes } from './PrefabSideNodes';

// Type for nodes that can be rehydrated (excludes PropertyNodeData)
type RehydratableNodeData =
  | StepNodeData
  | TemplateNodeData
  | ParametersNodeData
  | OutputNodeData;

export const PrefabEditor = () => {
  const { id } = useParams();
  if (!id) return null;
  const api = useApi(prefabsApiRef);
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);
  const [prefab, setPrefab] = useState<StoredPrefab | null>(null);

  const [nodeType, setNodeType] = useState<string>('step');
  const [availableActions, setAvailableActions] = useState<ScaffolderAction[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

  const handlePrefabChange = useCallback(
    (_: string, data: Record<string, unknown>) => {
      setPrefab(prev => {
        if (!prev || !prev.node) return prev;

        // Check if the data actually changed to avoid unnecessary updates
        const newNodeData = { ...prev.node.data, ...data };
        const hasChanged =
          JSON.stringify(prev.node.data) !== JSON.stringify(newNodeData);

        if (!hasChanged) return prev;

        return {
          ...prev,
          node: {
            ...prev.node,
            data: newNodeData,
          },
        };
      });
    },
    [],
  );

  useEffect(() => {
    scaffolderVisualApi.listActions().then(setAvailableActions);
  }, [scaffolderVisualApi]);

  // Helper function to convert node type to dropdown value
  const getDropdownValueFromNodeType = (nodeType: string): string => {
    switch (nodeType) {
      case 'step':
        return 'step';
      case 'templateOutput':
        return 'output';
      case 'property':
        return 'property';
      default:
        return 'step';
    }
  };

  const createNodeFromType = useCallback(
    (type: string) => {
      // Generate a new base node for each type change to ensure unique IDs
      const newBaseNode = getNodeBase();
      let node;
      switch (type) {
        case 'step':
          node = {
            ...newBaseNode,
            type: 'step' as const,
            position: { x: 0, y: 0 },
            selected: true,
            data: {
              type: 'step' as const,
              name: '',
              stepId: '',
              if: '',
              actionId: '',
              description: '',
              schema: null,
              formData: {},
              onChange: handlePrefabChange as (
                nodeId: string,
                data: Pick<
                  StepNodeData,
                  | 'name'
                  | 'stepId'
                  | 'if'
                  | 'formData'
                  | 'schema'
                  | 'description'
                >,
              ) => void,
            },
          };
          break;
        case 'output':
          node = {
            ...newBaseNode,
            type: 'templateOutput' as const,
            position: { x: 0, y: 0 },
            selected: true,
            data: {
              links: [],
              text: [],
              onChange: handlePrefabChange as (
                nodeId: string,
                data: OutputNodeData,
              ) => void,
            },
          };
          break;
        case 'property':
          node = {
            ...newBaseNode,
            type: 'property' as const,
            position: { x: 0, y: 0 },
            selected: true,
            data: {
              name: '',
              variableType: 'string',
              onChange: handlePrefabChange as (
                nodeId: string,
                data: Pick<
                  PropertyNodeData,
                  'name' | 'variableType' | 'required'
                >,
              ) => void,
              'ui:field': '',
              'ui:options': '',
            },
          };
          break;
        default:
          return null;
      }
      return node;
    },
    [handlePrefabChange],
  );

  // Handle node type changes (when user selects different type)
  // Only create new node if we're not loading and the node type actually changed
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (!nodeType || isLoading || !initialLoadComplete || !prefab) return;

    // Only create new node if the type is different from current node type
    if (prefab.node.type === nodeType) return;

    const node = createNodeFromType(nodeType);
    if (!node) return;

    setPrefab(prevPrefab => {
      if (!prevPrefab) return prevPrefab;
      return {
        ...prevPrefab,
        node,
      };
    });
  }, [
    nodeType,
    createNodeFromType,
    isLoading,
    initialLoadComplete,
    prefab?.node?.type,
  ]);
  const nodes = useMemo(() => {
    if (!prefab) return [];
    return [
      {
        id: '1',
        type: 'prefabQueen',
        position: { x: 0, y: 0 },
        data: prefab,
      },
    ];
  }, [prefab]);

  useDebouncedSave({
    projectId: id,
    state: prefab
      ? {
        node: prefab.node,
        title: prefab.title || '',
        description: prefab.description || '',
        id: prefab.id,
      }
      : {
        node: {
          id: '',
          type: '',
          position: { x: 0, y: 0 },
          data: {},
        } as Node,
        title: '',
        description: '',
        id: '',
      },
    reactFlowWrapperRef,
  });
  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setInitialLoadComplete(false);

    api
      .get({ id })
      .then(loadedPrefab => {
        if (loadedPrefab.node) {
          // Existing prefab with a node - load it
          // Type assertion is safe because we only use rehydrateNodes to add onChange handler
          const rehydratedNodes = rehydrateNodes(
            [loadedPrefab.node] as Node<RehydratableNodeData>[],
            {
              onChange: handlePrefabChange,
              onAddProperty: () => { }, // Not used in prefab editor
            },
          );
          setPrefab({ ...loadedPrefab, node: rehydratedNodes[0] });
          setNodeType(
            getDropdownValueFromNodeType(loadedPrefab.node.type || 'step'),
          );
        } else {
          // Prefab without node - create default step node
          const defaultNode = createNodeFromType('step');
          if (defaultNode) {
            setPrefab({
              ...loadedPrefab,
              node: defaultNode,
            });
          }
          setNodeType('step');
        }
        setIsLoading(false);
        setInitialLoadComplete(true);
      })
      .catch(() => {
        // If prefab doesn't exist, don't set anything - stay in loading state
        setIsLoading(false);
        setInitialLoadComplete(true);
      });
  }, [id, api, handlePrefabChange, createNodeFromType]);
  return (
    <ReactFlowProvider>
      <div
        style={{ flexDirection: 'row', display: 'flex', position: 'relative' }}
      >
        <Box
          ref={reactFlowWrapperRef}
          sx={{
            height: '100vh',
            width: '100%',
            backgroundColor:
              theme.palette.mode === 'dark' ? '#16161a' : '#fafafa',
          }}
        >
          <ReactFlow
            panOnScroll={false}
            panOnDrag={false}
            selectionOnDrag={false}
            nodesDraggable={false}
            elementsSelectable={false}
            zoomActivationKeyCode={null}
            nodes={nodes}
            zoomOnDoubleClick={false}
            zoomOnPinch={false}
            fitView
            maxZoom={1}
            zoomOnScroll={false}
            nodeTypes={{ prefabQueen: PrefabQueenNode }}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '700px',
            maxWidth: '700px',
            p: 2,
            overflow: 'auto',
            height: '100vh',
          }}
        >
          <PrefabSideNodes
            node={prefab?.node}
            availableActions={availableActions}
          >
            <Box
              sx={{
                p: 2.5,
                mb: 2,
                borderRadius: 1,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  mb: 2,
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                }}
              >
                Prefab Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 500 }}>
                    Node Type
                  </Typography>
                  <Select
                    native
                    value={nodeType}
                    onChange={e => setNodeType(e.target.value)}
                    displayEmpty
                    defaultValue="step"
                    sx={{
                      '& .MuiSelect-select': {
                        textTransform: 'none',
                        padding: '8px 12px',
                        fontSize: '0.875rem',
                      },
                    }}
                  >
                    <option value="step">Step</option>
                    <option value="output">Output</option>
                    <option value="property">Property</option>
                  </Select>
                </FormControl>
                <TextField
                  label="Title"
                  variant="outlined"
                  fullWidth
                  value={prefab?.title || ''}
                  onChange={e => {
                    if (prefab) {
                      setPrefab({ ...prefab, title: e.target.value });
                    }
                  }}
                  disabled={!prefab}
                  size="small"
                />
                <TextField
                  variant="outlined"
                  label="Description"
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={prefab?.description || ''}
                  onChange={e => {
                    if (prefab) {
                      setPrefab({ ...prefab, description: e.target.value });
                    }
                  }}
                  disabled={!prefab}
                  size="small"
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 3, opacity: 0.6 }} />
          </PrefabSideNodes>
        </Box>
      </div>
    </ReactFlowProvider>
  );
};
