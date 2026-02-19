import React, { useMemo, useCallback, useRef } from 'react';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';
import {
  StoredPrefab,
  ScaffolderAction,
  StepNodeData,
  OutputNodeData,
  PropertyNodeData,
  AllNodeData,
  scaffolderStudioPrefabPublishPermission,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { ReactFlow, ReactFlowProvider, Node } from '@xyflow/react';
import { Box, useTheme, Divider, Button } from '@mui/material';
import '@xyflow/react/dist/style.css';
import { getNodeBase } from '../../nodeBase';
import { scaffolderVisualApiRef } from '../../../../api/ScaffolderVisualClient';
import { usePermission } from '@backstage/plugin-permission-react';

import PrefabQueenNode from '../../nodes/prefab/PrefabQueenNode';
import { rehydrateNodes } from '../../rehydrateNodes';
import { PrefabSideNodes } from './PrefabSideNodes';
import {
  usePrefabDraftPersistence,
  readPrefabDraft,
  isDraftNewerThanServer,
} from './usePrefabDraftPersistence';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useThumbnail } from '../../hooks/useThumbnail';
import { PrefabHeader } from './PrefabHeader';



export const PrefabEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const { allowed: canPublishPrefab } = usePermission({
    permission: scaffolderStudioPrefabPublishPermission,
  });

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
          is_published: false,
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
    if (getDropdownValueFromNodeType(prefab.node.type || 'step') === nodeType)
      return;

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

  const {
    isDirty,
    syncStatus,
    lastSyncedAt,
    saveNow,
    setPersistedState,
  } = usePrefabDraftPersistence({
    prefabId: id,
    state: prefab
      ? {
        node: prefab.node,
        title: prefab.title || '',
        description: prefab.description || '',
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
      },
    enabled: initialLoadComplete,
  });

  const alertApi = useApi(alertApiRef); // Ensure alertApiRef is imported

  useUnsavedChangesGuard({
    when: Boolean(id) && isDirty,
    shouldBlockInAppNavigation: pathname => {
      if (!id) {
        return true;
      }
      const prefabPrefix = `/scaffolder-studio/prefab/${id}`;
      return !pathname.startsWith(prefabPrefix);
    },
    onAutoSave: () => saveNow(true),
    onAutoSaveFailed: () => {
      alertApi.post({
        message:
          'Failed to sync before leaving. Your local draft is kept and will retry.',
        severity: 'warning',
        display: 'transient',
      });
    },
  });

  useThumbnail({
    id,
    reactFlowWrapper: reactFlowWrapperRef,
    nodes: nodes,
    edges: [],
    enabled: initialLoadComplete,
    storageKeyPrefix: 'prefab-thumbnail-',
  });
  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setInitialLoadComplete(false);

    api
      .get({ id })
      .then(loadedPrefab => {
        let prefabToLoad = loadedPrefab;
        const localDraft = readPrefabDraft(id);

        if (
          localDraft &&
          loadedPrefab.updated_at &&
          isDraftNewerThanServer(localDraft, loadedPrefab.updated_at)
        ) {
          // Use local draft
          prefabToLoad = {
            ...loadedPrefab,
            node: localDraft.state.node as Node<AllNodeData>,
            title: localDraft.state.title,
            description: localDraft.state.description,
          };
        }

        if (prefabToLoad.node) {
          const rehydratedNodes = rehydrateNodes(
            [prefabToLoad.node as any],
            {
              onChange: handlePrefabChange,
              onAddProperty: () => { },
            },
          );
          setPrefab({ ...prefabToLoad, node: rehydratedNodes[0] });
          setNodeType(
            getDropdownValueFromNodeType(prefabToLoad.node.type || 'step'),
          );
        } else {
          const defaultNode = createNodeFromType('step');
          if (defaultNode) {
            setPrefab({
              ...prefabToLoad,
              node: defaultNode,
            });
          }
          setNodeType('step');
        }

        // Initialize persisted state with server data (or what we just loaded as baseline)
        // Actually, for correct dirty checking, we should set persisted state to what represents "synced"
        // If we loaded a draft, we are dirty until synced.
        // But `usePrefabDraftPersistence` initializes `persistedStateHash` to empty, so first render will be dirty if we don't set it.
        // We should set `persistedState` to the *SERVER* state to correctly reflect dirty status if we loaded a draft.
        setPersistedState({
          node: (loadedPrefab.node || createNodeFromType('step')!) as unknown as Node<AllNodeData>,
          title: loadedPrefab.title || '',
          description: loadedPrefab.description || '',
        });

        setIsLoading(false);
        setInitialLoadComplete(true);
      })
      .catch(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
      });
  }, [id, api, handlePrefabChange, createNodeFromType, setPersistedState]);
  const handleMetadataChange = useCallback(
    (_: string, data: Partial<StoredPrefab>) => {
      setPrefab(prev => (prev ? { ...prev, ...data, is_published: false } : prev));
    },
    [],
  );

  if (!id) return null;

  return (
    <ReactFlowProvider>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100%',
        }}
      >
        <PrefabHeader
          prefab={prefab}
          onPrefabChange={handleMetadataChange}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          nodeType={nodeType}
          onNodeTypeChange={setNodeType}
          onBack={async () => {
            if (isDirty) {
              await saveNow(true);
            }
            navigate('/scaffolder-studio/prefabs');
          }}
        >

          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={async () => {
              if (!prefab) return;
              try {
                await api.addToLibrary({
                  prefabId: prefab.id,
                  owner: prefab.owner || 'unknown',
                });
                alertApi.post({
                  message: 'Prefab published to library successfully',
                  severity: 'success',
                  display: 'transient',
                });
                // Refresh the prefab to get updated published status
                const updatedPrefab = await api.get({ id: prefab.id });
                if (updatedPrefab.node) {
                  const rehydratedNodes = rehydrateNodes(
                    [updatedPrefab.node as any],
                    {
                      onChange: handlePrefabChange,
                      onAddProperty: () => { },
                    },
                  );
                  setPrefab({ ...updatedPrefab, node: rehydratedNodes[0] });
                } else {
                  setPrefab(prev =>
                    prev ? { ...prev, ...updatedPrefab } : updatedPrefab,
                  );
                }
              } catch (error) {
                alertApi.post({
                  message: `Failed to publish prefab: ${(error as Error).message
                    }`,
                  severity: 'error',
                  display: 'transient',
                });
              }
            }}
            disabled={!prefab || (prefab.is_published && !!prefab.published_at) || !canPublishPrefab}
            sx={{ height: 32, width: 128 }}
          >
            {!prefab?.published_at
              ? 'Publish'
              : prefab.is_published
                ? 'Published'
                : 'Publish'}
          </Button>
        </PrefabHeader>
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            position: 'relative',
          }}
        >
          <Box
            ref={reactFlowWrapperRef}
            sx={{
              height: '100%',
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
              height: '100%',
              borderLeft: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <PrefabSideNodes
              node={prefab?.node}
              availableActions={availableActions}
            >
              <Divider sx={{ mb: 3, opacity: 0.6 }} />
            </PrefabSideNodes>
          </Box>
        </Box>
      </Box>
    </ReactFlowProvider>
  );
};
