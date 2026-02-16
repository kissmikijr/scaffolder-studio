import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  Box,
  Button,
  Collapse,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { StyledIconButton } from './StyledIconButton';
import { ProjectTitle } from '../ProjectTitle';
import { SearchNodes } from '../SearchNodes';
import { VisualTemplateProject } from '../types';
import { AllNodeData } from '../types';
import { Edge, Node } from '@xyflow/react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { useApi } from '@backstage/core-plugin-api';
import { scaffolderVisualApiRef } from '../../../api/ScaffolderVisualClient';

// Context for sharing state between Header and its children
interface HeaderContextValue {
  selectedNode: Node<AllNodeData> | undefined;
  setSelectedNode: (node: Node<AllNodeData> | undefined) => void;
  onNodeSelected: (node: Node<AllNodeData>) => void;
  project: VisualTemplateProject | null;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

const useHeaderContext = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('Header components must be used within Header');
  }
  return context;
};

// Main Header component
interface HeaderProps {
  children: ReactNode;
  project: VisualTemplateProject | null;
  onNodeSelected?: (node: Node<AllNodeData>) => void;
}

const Header = ({ children, project, onNodeSelected }: HeaderProps) => {
  const theme = useTheme();
  const [selectedNode, setSelectedNode] = useState<
    Node<AllNodeData> | undefined
  >(undefined);

  const handleNodeSelected = (node: Node<AllNodeData>) => {
    setSelectedNode(node);
    onNodeSelected?.(node);
  };

  const contextValue: HeaderContextValue = {
    selectedNode,
    setSelectedNode,
    onNodeSelected: handleNodeSelected,
    project,
  };

  return (
    <HeaderContext.Provider value={contextValue}>
      <Box
        sx={{
          height: '52px',
          backgroundColor:
            theme.palette.mode === 'dark' ? '#16161a' : '#fafafa',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', height: '100%', px: 2 }}
        >
          {children}
        </Box>
      </Box>
    </HeaderContext.Provider>
  );
};

// Sub-components
const HeaderTitle = () => {
  const { project } = useHeaderContext();
  if (!project) return null;
  return <ProjectTitle project={project} />;
};

const HeaderSearch = () => {
  const { onNodeSelected } = useHeaderContext();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  return (
    <>
      <Collapse in={isSearchExpanded} orientation="horizontal">
        <SearchNodes onNodeSelected={onNodeSelected} />
      </Collapse>
      <Box sx={{ mr: 3, ml: 1 }}>
        <StyledIconButton
          size="medium"
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          sx={{ padding: '8px !important' }}
        >
          <SearchIcon />
        </StyledIconButton>
      </Box>
    </>
  );
};

const HeaderSpacer = () => {
  return <Box sx={{ flex: 1 }} />;
};

interface HeaderPublishButtonProps {
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

const HeaderPublishButton = ({
  disabled,
  disabledReason,
  onClick,
}: HeaderPublishButtonProps) => {
  const { project } = useHeaderContext();
  const api = useApi(scaffolderVisualApiRef);
  const [hasPublishers, setHasPublishers] = useState(false);

  useEffect(() => {
    api.listPublishers().then(publishers => {
      setHasPublishers(publishers.length > 0);
    });
  }, [api]);

  if (!project || !hasPublishers) {
    return null;
  }

  const button = (
    <Button color="primary" onClick={onClick} disabled={disabled}>
      Publish
    </Button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip title={disabledReason}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

interface HeaderSaveButtonProps {
  disabled?: boolean;
  onClick: () => void | Promise<boolean>;
  isSaving?: boolean;
}

const HeaderSaveButton = ({
  disabled,
  onClick,
  isSaving = false,
}: HeaderSaveButtonProps) => {
  const { project } = useHeaderContext();

  if (!project) {
    return null;
  }

  return (
    <Button
      color="primary"
      onClick={onClick}
      disabled={disabled}
      aria-busy={isSaving}
      sx={{ minWidth: 96 }}
    >
      Save
    </Button>
  );
};

type HeaderSyncStatusValue =
  | 'saved'
  | 'pending'
  | 'syncing'
  | 'offline'
  | 'error';

interface HeaderSyncStatusProps {
  status: HeaderSyncStatusValue;
  lastSyncedAt?: string | null;
}

const HeaderSyncStatus = ({ status, lastSyncedAt }: HeaderSyncStatusProps) => {
  const getLabel = () => {
    if (status === 'syncing') return 'Syncing...';
    if (status === 'pending') return 'Unsynced changes';
    if (status === 'offline') return 'Offline';
    if (status === 'error') return 'Sync failed';
    return 'Saved';
  };

  const tooltipText =
    status === 'saved' && lastSyncedAt
      ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
      : status === 'offline'
      ? 'Changes are saved locally and will sync once online'
      : status === 'error'
      ? 'Will retry automatically'
      : undefined;

  return (
    <Tooltip title={tooltipText || ''} disableHoverListener={!tooltipText}>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
        {getLabel()}
      </Typography>
    </Tooltip>
  );
};

const serializeNodesForNavigation = (nodes: Node<AllNodeData>[]) => {
  return nodes.map(node => ({
    ...node,
    data: Object.fromEntries(
      Object.entries(node.data).filter(
        ([_, value]) => typeof value !== 'function',
      ),
    ),
  }));
};

const runWithViewTransition = (navigateAction: () => void) => {
  const documentWithTransition = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (documentWithTransition.startViewTransition) {
    documentWithTransition.startViewTransition(() => {
      navigateAction();
    });
    return;
  }

  navigateAction();
};

const HeaderDryRunButton = ({
  state,
  onBeforeNavigate,
}: {
  state: {
    nodes: Node<AllNodeData>[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  };
  onBeforeNavigate?: () => void | Promise<boolean>;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleDryRunClick = async () => {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);

    try {
      await onBeforeNavigate?.();
    } catch {
      // Keep navigation non-blocking; dry run can still execute from in-memory state.
    }

    runWithViewTransition(() => {
      navigate(`../dry-run`, {
        relative: 'path',
        state: {
          nodes: serializeNodesForNavigation(state.nodes),
          edges: state.edges,
          returnPath: location.pathname,
        },
      });
    });
  };

  return (
    <Button
      color="secondary"
      onClick={handleDryRunClick}
      disabled={isNavigating}
    >
      Dry Run
    </Button>
  );
};

// Compound component pattern
Header.Title = HeaderTitle;
Header.Search = HeaderSearch;
Header.Spacer = HeaderSpacer;
Header.SaveButton = HeaderSaveButton;
Header.SyncStatus = HeaderSyncStatus;
Header.PublishButton = HeaderPublishButton;
Header.DryRunButton = HeaderDryRunButton;

export default Header;
