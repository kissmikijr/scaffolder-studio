import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
  ReactNode,
} from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import { Box, Tooltip, Typography, useTheme, Tabs, Tab } from '@mui/material';
import { StyledIconButton } from './components/StyledIconButton';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { YamlView } from './components/YamlView';
import { RightSideFormContent } from './RightSideFormContent';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import AddIcon from '@mui/icons-material/Add';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useParams, useNavigate } from 'react-router-dom';
import { nodeTypes } from './nodes/nodeTypes';
import { defaultEdgeOptions, edgeTypes } from './edges';
import { AllNodeData } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import {
  isTemplateNode,
  isStepNode,
  isOutputNode,
  isParametersNode,
  isPropertyNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useApi } from '@backstage/core-plugin-api';
import { ScaffolderStudioApi } from '../../api/ScaffolderVisualClient';
import { scaffolderVisualApiRef } from '../../api/ScaffolderVisualClient';
import Header from './components/Header';
import { PrefabTreeView } from './TemplateOverviewPage/Prefabs/PrefabTreeView';
import { PrefabInstanceContextMenu } from './nodes/prefab/PrefabInstanceContextMenu';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {
  useCopyPaste,
  useGroupDragDrop,
  useNodeCreator,
  useSidebarResize,
  useEditorHandlers,
  usePanning,
  useProjectSync,
  useThumbnail,
  useDependencyEdges,
} from './hooks';
import { alertApiRef } from '@backstage/core-plugin-api';
import { PublishDialog } from './TemplateOverviewPage/components/PublishDialog';
import type { TemplateSyncStatus } from './hooks/useTemplateDraftPersistence';

const SidePanelToggleIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect
      x="1.25"
      y="1.75"
      width="13.5"
      height="12.5"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="9"
      y="2.5"
      width="5"
      height="11"
      rx="1"
      fill="currentColor"
      opacity={collapsed ? 0.28 : 0.9}
    />
  </svg>
);

const ScaffolderStudioEditor = ({
  setEdges,
  setNodes,
  setViewportState,
  nodes,
  edges,
  viewport,
  availableActions,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddProperty,
  onChange,
  syncStatus,
  lastSyncedAt,
  onSyncBeforeDryRun,
}: {
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setNodes: Dispatch<SetStateAction<Node<AllNodeData>[]>>;
  setViewportState: (viewport: { x: number; y: number; zoom: number }) => void;
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  availableActions: ScaffolderAction[];
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddProperty: (parentId: string) => void;
  onChange: (id: string, data: any) => void;
  syncStatus: TemplateSyncStatus;
  lastSyncedAt: string | null;
  onSyncBeforeDryRun: () => Promise<boolean>;
}) => {
  const [prefabMenu, setPrefabMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const previousSelectedNodeIdRef = useRef<string | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<
    Node<AllNodeData> | undefined
  >(undefined);
  const connectSourceNodeIdRef = useRef<string | null>(null);
  const contextMenuNodeIdRef = useRef<string | null>(null);
  const api = useApi<ScaffolderStudioApi>(scaffolderVisualApiRef);
  const alertApi = useApi(alertApiRef);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [isSideContentCollapsed, setIsSideContentCollapsed] = useState(false);
  const [showDependencyEdges, setShowDependencyEdges] = useState(false);
  const theme = useTheme();

  const { id, tab } = useParams();
  const navigate = useNavigate();

  // If tab is undefined (root route), default to 'form'.
  const activeTab =
    (tab as 'form' | 'prefabs' | 'ai' | 'yaml' | 'dryRun') || 'form';

  const handleTabChange = useCallback(
    (newTab: string) => {
      navigate(`/scaffolder-studio/templates/${id}/${newTab}`);
    },
    [navigate, id],
  );

  const { pastedNodeId, acknowledgePaste } = useCopyPaste({
    selectedNode,
    setNodes,
  });
  const { width, startDrag } = useSidebarResize();
  const isPanning = usePanning();
  const project = useProjectSync({ id, nodes, setViewportState });

  const dependencyEdges = useDependencyEdges(nodes);
  const displayEdges = showDependencyEdges
    ? [...edges, ...dependencyEdges]
    : edges;

  useThumbnail({
    id,
    reactFlowWrapper,
    nodes,
    edges,
    enabled: activeTab === 'form',
  });

  const {
    handleAddParametersNode,
    handleAddStepNode,
    handleAddOutputNode,
    handleAddPropertyNode,
    createParametersNode,
    createStepNode,
    createOutputNode,
    addPrefabNode,
  } = useNodeCreator({
    nodes,
    setNodes,
    setEdges,
    connectSourceNodeIdRef,
    setSelectedNode,
    handleTabChange,
    onAddProperty,
  });

  const {
    onConnect,
    isValidConnection,
    handleNodesDelete,
    handleOnNodeClick,
    onNodeContextMenu,
    handleNodesChange,
    handleEdgesChange,
    onConnectStart,
    onConnectEnd,
    handleDrop,
    onDragOver,
  } = useEditorHandlers({
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNode,
    handleTabChange,
    setPrefabMenu,
    contextMenuNodeIdRef,
    connectSourceNodeIdRef,
    handleAddOutputNode,
    handleAddStepNode,
    handleAddParametersNode,
    handleAddPropertyNode,
    onChange,
  });

  const { onNodeDragStop } = useGroupDragDrop({ nodes, setNodes });

  useEffect(() => {
    if (pastedNodeId) {
      const pastedNode = nodes.find(n => n.id === pastedNodeId);
      if (pastedNode) {
        setSelectedNode(pastedNode);
        handleTabChange('form');
        acknowledgePaste();
      }
    }
  }, [nodes, pastedNodeId, handleTabChange, acknowledgePaste]);

  // Sync selectedNode state with nodes prop (handles programmatic selection)
  useEffect(() => {
    // Check if the currently selected node is still selected
    const currentStillSelected = nodes.find(
      n => n.id === selectedNode?.id && n.selected,
    );

    if (currentStillSelected) {
      // Update the reference in case data changed (e.g. position updates), but don't switch selection
      if (currentStillSelected !== selectedNode) {
        setSelectedNode(currentStillSelected);
      }
      return;
    }

    // Otherwise, find a new selected node
    const newSelected = nodes.find(n => n.selected);
    if (newSelected) {
      setSelectedNode(newSelected);
      handleTabChange('form');
    } else if (selectedNode) {
      setSelectedNode(undefined);
    }
  }, [nodes, selectedNode, handleTabChange]);

  useEffect(() => {
    previousSelectedNodeIdRef.current = selectedNode?.id;
  }, [selectedNode?.id]);

  const onPaneClick = useCallback(() => {
    setPrefabMenu(null);
  }, [setPrefabMenu]);

  const getNodeDimensions = useCallback((node: Node<AllNodeData>) => {
    return {
      width: node.measured?.width ?? node.width ?? 240,
      height: node.measured?.height ?? node.height ?? 120,
    };
  }, []);

  const getTemplateNode = useCallback(
    () => nodes.find(n => isTemplateNode(n)),
    [nodes],
  );
  const hasOutputNode = nodes.some(n => isOutputNode(n));

  const handleAddStepFromToolbar = useCallback(() => {
    const latestStepNode = [...nodes].reverse().find(n => isStepNode(n));
    const source = latestStepNode ?? getTemplateNode();

    if (!source) {
      const centerPosition = {
        x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
        y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
      };
      createStepNode({ position: centerPosition });
      return;
    }

    const { width: sourceWidth } = getNodeDimensions(source);
    const gap = 90;

    createStepNode({
      position: {
        x: source.position.x + sourceWidth + gap,
        y: source.position.y,
      },
      sourceNodeId: source.id,
      sourceHandle: 'right',
    });
  }, [nodes, getTemplateNode, getNodeDimensions, createStepNode, viewport]);

  const handleAddOutputFromToolbar = useCallback(() => {
    if (hasOutputNode) {
      return;
    }

    const selected = selectedNode
      ? nodes.find(n => n.id === selectedNode.id)
      : undefined;
    const source =
      selected && isTemplateNode(selected) ? selected : getTemplateNode();

    if (!source) {
      return;
    }

    const outputWidth = 260;
    const gap = 90;

    createOutputNode({
      position: {
        x: source.position.x - outputWidth - gap,
        y: source.position.y,
      },
      sourceNodeId: source.id,
      sourceHandle: 'left',
    });
  }, [hasOutputNode, nodes, selectedNode, getTemplateNode, createOutputNode]);

  const handleAddParametersFromToolbar = useCallback(() => {
    const latestParametersNode = [...nodes]
      .reverse()
      .find(n => isParametersNode(n));
    const selected = selectedNode
      ? nodes.find(n => n.id === selectedNode.id)
      : undefined;
    const source =
      selected && isParametersNode(selected)
        ? selected
        : latestParametersNode ??
          (selected && isTemplateNode(selected) ? selected : getTemplateNode());

    if (!source) {
      return;
    }

    const { width: sourceWidth, height: sourceHeight } =
      getNodeDimensions(source);
    const gap = 90;

    if (isTemplateNode(source)) {
      createParametersNode({
        position: {
          x: source.position.x + sourceWidth / 2 - 300 / 2, // 300 is default params width
          y: source.position.y + sourceHeight + gap,
        },
        node: source,
        fromHandleId: 'bottom',
      });
    } else {
      createParametersNode({
        position: {
          x: source.position.x + width + gap,
          y: source.position.y,
        },
        node: source,
        fromHandleId: 'right',
      });
    }
  }, [
    nodes,
    selectedNode,
    getTemplateNode,
    getNodeDimensions,
    createParametersNode,
    width,
  ]);

  const getSelectedParametersNodeId = useCallback(() => {
    const selected = selectedNode
      ? nodes.find(n => n.id === selectedNode.id)
      : undefined;

    if (selected && isParametersNode(selected)) {
      return selected.id;
    }

    if (selected && isPropertyNode(selected) && selected.parentId) {
      return selected.parentId;
    }

    return null;
  }, [nodes, selectedNode]);

  const handleAddPropertyFromToolbar = useCallback(() => {
    const targetParametersNodeId = getSelectedParametersNodeId();
    if (!targetParametersNodeId) {
      alertApi.post({
        message: 'Select a parameters or property node first to add a property',
        severity: 'warning',
        display: 'transient',
      });
      return;
    }
    onAddProperty(targetParametersNodeId);
  }, [getSelectedParametersNodeId, onAddProperty, alertApi]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName || '',
        ) ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (event.key === '1') {
        event.preventDefault();
        handleAddStepFromToolbar();
      } else if (event.key === '2') {
        event.preventDefault();
        handleAddParametersFromToolbar();
      } else if (event.key === '3') {
        event.preventDefault();
        handleAddPropertyFromToolbar();
      } else if (event.key === '4') {
        event.preventDefault();
        handleAddOutputFromToolbar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAddStepFromToolbar,
    handleAddParametersFromToolbar,
    handleAddPropertyFromToolbar,
    handleAddOutputFromToolbar,
  ]);

  const handleViewportChange = useCallback(
    (v: { x: number; y: number; zoom: number }) => {
      setViewportState(v);
    },
    [setViewportState],
  );

  const handlePublishClick = () => setPublishDialogOpen(true);

  const renderShortcutIcon = useCallback(
    (icon: ReactNode, shortcut: string) => (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {icon}
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            fontSize: '0.6rem',
            lineHeight: 1,
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          {shortcut}
        </Box>
      </Box>
    ),
    [theme],
  );

  const onConfirmPublish = async (
    publisherId: string,
    options?: Record<string, unknown>,
  ) => {
    if (!project) return;
    try {
      const template = await api.serializeTemplate({
        sourceNodeId: project.nodes[0].id,
        nodes: nodes,
        edges: edges,
      });

      await api.publish({
        visualTemplateId: project.id,
        scaffolderTemplate: template,
        publisherId,
        options,
      });

      alertApi.post({
        message: 'Template has been published',
        severity: 'success',
        display: 'transient',
      });
    } catch {
      alertApi.post({
        message: 'Failed to publish template',
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setPublishDialogOpen(false);
    }
  };

  const getSyncStatusTooltip = () => {
    switch (syncStatus) {
      case 'saved':
        return lastSyncedAt
          ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
          : '';
      case 'pending':
        return 'Changes pending sync';
      case 'syncing':
        return 'Syncing changes';
      case 'offline':
        return 'Changes are saved locally and will sync once online';
      case 'error':
        return 'Sync failed, retrying automatically';
      default:
        return '';
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'error':
        return 'warning.main';
      case 'offline':
        return 'text.disabled';
      default:
        return 'text.secondary';
    }
  };

  const renderSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <SyncRoundedIcon
            sx={{
              fontSize: 16,
              animation: 'sync-spin 1s linear infinite',
              '@keyframes sync-spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />
        );
      case 'pending':
        return <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />;
      case 'offline':
        return <CloudOffOutlinedIcon sx={{ fontSize: 16 }} />;
      case 'error':
        return <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />;
      default:
        return <CloudDoneOutlinedIcon sx={{ fontSize: 16 }} />;
    }
  };

  if (!id) return null;

  return (
    <>
      <div
        style={{
          flexDirection: 'column',
          display: 'flex',
          position: 'relative',
        }}
      >
        <Header
          project={project}
          onNodeSelected={node => {
            setSelectedNode(node);
            handleTabChange('form');
          }}
        >
          <Header.BackButton to="/scaffolder-studio/templates" />
          <Header.Title />
          <Tooltip
            title={getSyncStatusTooltip()}
            disableHoverListener={!getSyncStatusTooltip()}
          >
            <Box
              sx={{
                ml: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                color: getSyncStatusColor(),
              }}
            >
              {renderSyncIcon()}
            </Box>
          </Tooltip>
          <Header.Spacer />
          <Header.Search />
          <Header.DryRunButton
            state={{ nodes, edges, viewport }}
            onBeforeNavigate={onSyncBeforeDryRun}
          />
          <Header.PublishButton
            disabled={!project}
            onClick={handlePublishClick}
          />
          <Tooltip
            title={
              showDependencyEdges
                ? 'Hide dependency edges'
                : 'Show dependency edges'
            }
            arrow
          >
            <StyledIconButton
              size="small"
              color={showDependencyEdges ? 'primary' : 'secondary'}
              data-testid="dependency-edges-toggle-button"
              onClick={() => setShowDependencyEdges(prev => !prev)}
              sx={{
                width: 48,
                height: 34,
                borderRadius: '12px !important',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: '1rem' }} />
            </StyledIconButton>
          </Tooltip>
          <Tooltip
            title={
              isSideContentCollapsed
                ? 'Expand side panel'
                : 'Collapse side panel'
            }
            arrow
          >
            <StyledIconButton
              size="small"
              color="secondary"
              data-testid="sidecontent-toggle-button"
              onClick={() => setIsSideContentCollapsed(prev => !prev)}
              sx={{
                width: 48,
                height: 34,
                borderRadius: '12px !important',
              }}
            >
              <SidePanelToggleIcon collapsed={isSideContentCollapsed} />
            </StyledIconButton>
          </Tooltip>
        </Header>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box
            ref={reactFlowWrapper}
            sx={{
              position: 'relative',
              flexDirection: 'column',
              display: 'flex',
              height: 'calc(100vh - 52px)',
              width: '100%',
            }}
            onDragOver={onDragOver}
            onDrop={handleDrop}
          >
            <Box
              sx={{
                height: '100%',
                width: '100%',
                backgroundColor:
                  theme.palette.mode === 'dark' ? '#16161a' : '#fafafa',
                overflowX: 'hidden',
                overflowY: 'hidden',
                '& .react-flow__edge-path': {
                  strokeWidth: 2,
                },
                '& .react-flow__pane.selection': {
                  cursor: isPanning ? 'grab' : 'default',
                  transition: 'cursor 0.2s',
                },
                '& .react-flow__node': {
                  outline: 'none !important',
                },
              }}
            >
              <ReactFlow
                onNodesChange={handleNodesChange}
                onViewportChange={handleViewportChange}
                edges={displayEdges}
                nodes={nodes}
                connectionRadius={42}
                viewport={viewport}
                panOnDrag={isPanning}
                panOnScroll
                zoomOnPinch
                zoomOnScroll={false}
                nodesDraggable={!isPanning}
                elementsSelectable={!isPanning}
                selectionOnDrag={!isPanning}
                zoomActivationKeyCode={null}
                maxZoom={1.5}
                minZoom={0.3}
                onEdgesChange={handleEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodesDelete={handleNodesDelete}
                onNodeClick={handleOnNodeClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeDragStop={onNodeDragStop}
              >
                <Background gap={40} />
              </ReactFlow>
              <Box
                sx={{
                  position: 'fixed',
                  left: '50%',
                  bottom: 74,
                  transform: 'translateX(-50%)',
                  zIndex: 1299,
                  pointerEvents: 'none',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ opacity: 0.75 }}
                >
                  To move canvas, hold [space] while dragging
                </Typography>
              </Box>
              <Box
                sx={{
                  position: 'fixed', // Use fixed to position relative to viewport
                  left: '50%',
                  bottom: 16,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 2,
                  backgroundColor: theme.complimentBackground,
                  boxShadow: 1,
                  borderRadius: '24px',
                  padding: '12px 18px',
                  zIndex: 1300, // Use a high z-index to ensure it's above other content
                }}
              >
                <Tooltip title="Add Step (1)" arrow>
                  <StyledIconButton
                    onClick={handleAddStepFromToolbar}
                    size="small"
                    data-testid="toolbar-add-step-button"
                  >
                    {renderShortcutIcon(<LinearScaleIcon />, '1')}
                  </StyledIconButton>
                </Tooltip>
                <Tooltip title="Add Parameters (2)" arrow>
                  <StyledIconButton
                    onClick={handleAddParametersFromToolbar}
                    size="small"
                    data-testid="toolbar-add-parameters-button"
                  >
                    {renderShortcutIcon(<ViewAgendaIcon />, '2')}
                  </StyledIconButton>
                </Tooltip>
                <Tooltip title="Add Property (3)" arrow>
                  <StyledIconButton
                    onClick={handleAddPropertyFromToolbar}
                    size="small"
                    data-testid="toolbar-add-property-button"
                  >
                    {renderShortcutIcon(<AddIcon />, '3')}
                  </StyledIconButton>
                </Tooltip>
                <Tooltip title="Add Output (4)" arrow>
                  <span>
                    <StyledIconButton
                      onClick={handleAddOutputFromToolbar}
                      size="small"
                      disabled={hasOutputNode}
                      data-testid="toolbar-add-output-button"
                    >
                      {renderShortcutIcon(<CallSplitIcon />, '4')}
                    </StyledIconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Undo" arrow>
                  <span>
                    <StyledIconButton
                      onClick={onUndo}
                      size="small"
                      disabled={!canUndo}
                    >
                      <UndoIcon />
                    </StyledIconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Redo" arrow>
                  <span>
                    <StyledIconButton
                      onClick={onRedo}
                      size="small"
                      disabled={!canRedo}
                    >
                      <RedoIcon />
                    </StyledIconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          <Box
            data-testid="sidecontent-panel"
            data-collapsed={isSideContentCollapsed ? 'true' : 'false'}
            sx={{
              display: 'flex',
              width: isSideContentCollapsed ? '44px' : `${width}px`,
              height: '90vh',
              overflowX: 'auto',
              background: theme.complimentBackground,
              borderLeft: '2px solid transparent',
              borderRadius: '24px',
              marginRight: '24px',
              position: 'absolute',
              right: 0,
              top: 52,
            }}
          >
            {isSideContentCollapsed ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              />
            ) : (
              <>
                <div
                  onPointerDown={startDrag}
                  style={{
                    cursor: 'col-resize',
                    width: '6px',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '1rem',
                      paddingBottom: '0.5rem',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => handleTabChange(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                      >
                        <Tab label="Node" value="form" />
                        <Tab label="Prefabs" value="prefabs" />
                        <Tab label="Yaml" value="yaml" />
                      </Tabs>
                    </Box>
                  </div>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      overflow: 'auto',
                      padding: '0 1rem 1rem 1rem',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                  >
                    {activeTab === 'prefabs' && (
                      <PrefabTreeView addPrefabNode={addPrefabNode} />
                    )}
                    {activeTab === 'form' && (
                      <RightSideFormContent
                        node={selectedNode}
                        availableActions={availableActions}
                      />
                    )}
                    {activeTab === 'yaml' && (
                      <YamlView
                        templateId={id}
                        nodes={nodes}
                        edges={edges}
                        setNodes={setNodes}
                        setEdges={setEdges}
                        onAddProperty={onAddProperty}
                      />
                    )}
                  </Box>
                </div>
              </>
            )}
          </Box>
        </Box>
      </div>
      {prefabMenu && (
        <PrefabInstanceContextMenu
          onClick={onPaneClick}
          id={prefabMenu?.id}
          top={prefabMenu?.top}
          left={prefabMenu?.left}
        />
      )}
      <PublishDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={onConfirmPublish}
      />
    </>
  );
};

export default ScaffolderStudioEditor;
