import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from '@mui/material';
import ScaffolderStudioEditor from './Editor';
import { Edge, Node, ReactFlowProvider } from '@xyflow/react';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../api/ScaffolderVisualClient';
import { useParams, useNavigate } from 'react-router-dom';
import { onChange } from './handlers';
import { rehydrateNodes } from './rehydrateNodes';
import { ensureParametersNodeSizes } from './utils/layoutUtils';
import {
  AllNodeData,
  ScaffolderAction,
  isTemplateNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  createSerializableTemplateDraftState,
  isDraftNewerThanServer,
  readTemplateDraft,
  useTemplateDraftPersistence,
  useUnsavedChangesGuard,
} from './hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  calculateParentParamsSize,
  createPropertyNode,
} from './utils/nodeFunctions';

const queryClient = new QueryClient();

export const VisualTemplateEditorComponent = () => {
  const api = useApi(scaffolderVisualApiRef);
  const alertApi = useApi(alertApiRef);
  const { id } = useParams();
  const navigate = useNavigate();

  const [nodes, setNodes] = useState<Node<AllNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [availableActions, setAvailableActions] = useState<ScaffolderAction[]>(
    [],
  );
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Flag to prevent saving state during undo/redo operations
  const isRestoringStateRef = useRef(false);

  // Use a ref for saveState to break circular dependency with debounced saver
  const saveStateRef = useRef<
    (state: { nodes: Node<AllNodeData>[]; edges: Edge[] }) => void
  >(() => {});

  // Debounced state saver - using refs to avoid dependency issues
  const debouncedSaveStateRef = useRef<NodeJS.Timeout>();
  const currentStateRef = useRef({ nodes, edges });

  // Update the ref whenever state changes (exclude viewport)
  currentStateRef.current = { nodes, edges };

  const saveStateDebounced = useCallback(() => {
    // Don't save state if we're restoring from undo/redo
    if (isRestoringStateRef.current) {
      return;
    }

    if (debouncedSaveStateRef.current) {
      clearTimeout(debouncedSaveStateRef.current);
    }
    debouncedSaveStateRef.current = setTimeout(() => {
      if (!isRestoringStateRef.current) {
        saveStateRef.current(currentStateRef.current);
      }
    }, 100);
  }, []); // Empty dependencies because it uses refs

  // Wrapped setters that save to history
  const setNodesWithHistory = useCallback(
    (
      newNodes:
        | Node<AllNodeData>[]
        | ((prev: Node<AllNodeData>[]) => Node<AllNodeData>[]),
    ) => {
      setNodes(prev => {
        const nextNodes =
          typeof newNodes === 'function' ? newNodes(prev) : newNodes;
        // Save to history immediately after state change with current values
        setTimeout(() => {
          saveStateDebounced();
        }, 0);
        return nextNodes;
      });
    },
    [saveStateDebounced],
  );

  const setEdgesWithHistory = useCallback(
    (newEdges: Edge[] | ((prev: Edge[]) => Edge[])) => {
      setEdges(prev => {
        const nextEdges =
          typeof newEdges === 'function' ? newEdges(prev) : newEdges;
        // Save to history immediately after state change with current values
        setTimeout(() => {
          saveStateDebounced();
        }, 0);
        return nextEdges;
      });
    },
    [saveStateDebounced],
  );

  const handleAddPropertyToGroup = useCallback(
    (parentId: string) => {
      const currentNodes = currentStateRef.current.nodes;
      const parentNode = currentNodes.find(n => n.id === parentId);
      if (!parentNode) return;

      const childCount = currentNodes.filter(
        n => n.parentId === parentId,
      ).length;
      const relativePosition = { x: 20, y: 60 + childCount * 100 };

      const newNode = createPropertyNode({
        parentId,
        position: relativePosition,
        childCount,
        onChange: onChange(setNodesWithHistory),
      });

      // Update nodes
      setNodesWithHistory(nds => {
        const updatedNodes = nds.map(n => {
          const node = { ...n, selected: false }; // Deselect all existing nodes
          if (node.id === parentId) {
            return calculateParentParamsSize(node, relativePosition);
          }
          return node;
        });
        return [...updatedNodes, newNode];
      });

      // Find siblings to connect edge
      const siblings = currentNodes.filter(
        n => n.parentId === parentId && isPropertyNode(n),
      );

      if (siblings.length > 0) {
        const lastSibling = siblings[siblings.length - 1];
        setEdgesWithHistory(eds => [
          ...eds,
          {
            id: `${lastSibling.id}-${newNode.id}`,
            source: lastSibling.id,
            target: newNode.id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'custom-step',
            zIndex: 1001,
          },
        ]);
      }
    },
    [setNodesWithHistory, setEdgesWithHistory],
  );

  // Undo/Redo system
  const { canUndo, canRedo, undo, redo, saveState, clearHistory } = useUndoRedo(
    { nodes: [], edges: [] },
    state => {
      // Safely handle undefined or malformed state
      if (!state || typeof state !== 'object') {
        return;
      }

      const { nodes: newNodes = [], edges: newEdges = [] } = state;

      // Rehydrate nodes to attach handlers that are lost during serialization
      const rehydratedNodes = rehydrateNodes(newNodes, {
        onChange: onChange(setNodesWithHistory),
        onAddProperty: handleAddPropertyToGroup,
      });

      isRestoringStateRef.current = true;
      setNodes(rehydratedNodes);
      setEdges(newEdges);
      // Reset flag after state updates are complete
      setTimeout(() => {
        isRestoringStateRef.current = false;
      }, 0);
    },
  );

  // Update the ref whenever saveState changes
  saveStateRef.current = saveState;

  const metadataName = useMemo(() => {
    const templateNode = nodes.find(n => isTemplateNode(n));
    return (
      ((templateNode?.data as Record<string, unknown> | undefined)?.name as
        | string
        | undefined) || 'Untitled'
    );
  }, [nodes]);

  const {
    isDirty,
    isSyncing,
    syncStatus,
    lastSyncedAt,
    saveNow,
    setPersistedState,
  } = useTemplateDraftPersistence({
    templateId: id,
    state: {
      nodes,
      edges,
      viewport,
      metadata: { name: metadataName },
    },
    enabled: isProjectLoaded,
    publishedAt,
  });

  useUnsavedChangesGuard({
    when: Boolean(id) && isDirty,
    shouldBlockInAppNavigation: pathname => {
      if (!id) {
        return true;
      }
      const templatePrefix = `/scaffolder-studio/templates/${id}`;
      return !pathname.startsWith(templatePrefix);
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    onSave: () => {
      saveNow(true);
    },
    canSave: isDirty,
    isSaving: isSyncing,
  });

  // Viewport setter - no history tracking for viewport changes
  const setViewportWithoutHistory = useCallback(
    (newViewport: { x: number; y: number; zoom: number }) => {
      setViewport(newViewport);
      // No history saving for viewport changes
    },
    [],
  );
  const fetchAvailableActions = useCallback(async () => {
    try {
      const actions = await api.listActions();

      setAvailableActions(actions);
    } catch {
      // Silent error for lint
    }
  }, [api]);
  useEffect(() => {
    fetchAvailableActions();
  }, [fetchAvailableActions]);

  // Load project data - only when id or api changes
  // Note: Other dependencies are intentionally omitted to prevent unnecessary reloads
  // isProjectLoaded is managed separately via the reset effect below
  useEffect(() => {
    (async () => {
      if (id && !isProjectLoaded) {
        try {
          const project = await api.getProject(id);
          if (!project) {
            return;
          }

          const serverState = createSerializableTemplateDraftState({
            nodes: project.nodes as Node<AllNodeData>[],
            edges: project.edges,
            viewport: project.viewport,
            metadata: {
              name: project.metadata?.name || 'Untitled',
            },
          });

          if (id) {
            setIsProjectLoaded(false);
            // clear existing state before loading new
          }
          const localDraft = readTemplateDraft(id);
          const shouldUseLocalDraft =
            !!localDraft && isDraftNewerThanServer(localDraft, project.updated);
          const initialState = shouldUseLocalDraft
            ? localDraft.state
            : serverState;

          // Use history versions for proper undo/redo functionality
          const rehydratedNodes = rehydrateNodes(initialState.nodes as any, {
            onChange: onChange(setNodesWithHistory),
            onAddProperty: handleAddPropertyToGroup,
          });

          const nodesWithLayout = ensureParametersNodeSizes(rehydratedNodes);

          setNodes(nodesWithLayout);
          setEdges(initialState.edges);
          setViewport(initialState.viewport);
          setPublishedAt(project.published_at ?? null);
          setPersistedState(
            {
              nodes: project.nodes as Node<AllNodeData>[],
              edges: project.edges,
              viewport: project.viewport,
              metadata: {
                name: project.metadata?.name || 'Untitled',
              },
            },
            project.updated,
          );
          setIsProjectLoaded(true);

          // Initialize history with loaded state after a delay
          setTimeout(() => {
            clearHistory();
            saveState({
              nodes: nodesWithLayout,
              edges: initialState.edges,
            });
          }, 100);
        } catch (error) {
          alertApi.post({
            message: `Failed to load project ${id}: ${
              (error as Error).message
            }`,
            severity: 'error',
          });
          navigate('/scaffolder-studio/templates');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, api, setPersistedState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveStateRef.current) {
        clearTimeout(debouncedSaveStateRef.current);
      }
    };
  }, []);

  return (
    <ReactFlowProvider>
      <QueryClientProvider client={queryClient}>
        <Grid container spacing={0} direction="column">
          <Grid sx={{ position: 'relative', height: '100vh' }}>
            {isProjectLoaded && (
              <ScaffolderStudioEditor
                nodes={nodes}
                edges={edges}
                viewport={viewport}
                setNodes={setNodesWithHistory}
                setEdges={setEdgesWithHistory}
                setViewportState={setViewportWithoutHistory}
                availableActions={availableActions}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onAddProperty={handleAddPropertyToGroup}
                onChange={onChange(setNodesWithHistory)}
                syncStatus={syncStatus}
                lastSyncedAt={lastSyncedAt}
                onSyncBeforeDryRun={() => saveNow(true)}
              />
            )}
          </Grid>
        </Grid>
      </QueryClientProvider>
    </ReactFlowProvider>
  );
};
