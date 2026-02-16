import { useApi } from '@backstage/core-plugin-api';
import { Edge, Node } from '@xyflow/react';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scaffolderVisualApiRef } from '../../../api/ScaffolderVisualClient';
import { AllNodeData, isTemplateNode } from '../types';

export type TemplateDraftState = {
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {
    name: string;
  };
};

type SerializedTemplateDraftState = {
  nodes: Node[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {
    name: string;
  };
};

type StoredTemplateDraft = {
  version: 1;
  updated: string;
  state: SerializedTemplateDraftState;
};

type UseTemplateDraftPersistenceProps = {
  templateId?: string;
  state: TemplateDraftState;
  enabled?: boolean;
  publishedAt?: string | null;
};

export type TemplateSyncStatus =
  | 'saved'
  | 'pending'
  | 'syncing'
  | 'offline'
  | 'error';

const STORAGE_PREFIX = 'visual-editor:draft:';

const stripFunctions = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripFunctions);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => typeof v !== 'function',
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, stripFunctions(v)]));
  }

  return value;
};

const toSerializableState = (
  state: TemplateDraftState,
): SerializedTemplateDraftState => {
  return {
    nodes: stripFunctions(state.nodes) as Node[],
    edges: stripFunctions(state.edges) as Edge[],
    viewport: state.viewport,
    metadata: state.metadata,
  };
};

const toStateHash = (state: SerializedTemplateDraftState): string => {
  return JSON.stringify(state);
};

const getStorageKey = (templateId: string) => `${STORAGE_PREFIX}${templateId}`;

const parseDraft = (raw: string | null): StoredTemplateDraft | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredTemplateDraft;
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.updated &&
      parsed.state?.nodes &&
      parsed.state?.edges &&
      parsed.state?.viewport
    ) {
      return parsed;
    }
  } catch (error) {
    // Ignore malformed drafts and continue with server state.
  }
  return null;
};

const getTemplateName = (state: SerializedTemplateDraftState): string => {
  const templateNode = state.nodes.find(node => isTemplateNode(node as any));
  return (
    (
      templateNode?.data as Record<string, unknown> | undefined
    )?.name?.toString() ||
    state.metadata.name ||
    'Untitled'
  );
};

export const readTemplateDraft = (
  templateId: string,
): StoredTemplateDraft | null => {
  return parseDraft(localStorage.getItem(getStorageKey(templateId)));
};

export const isDraftNewerThanServer = (
  draft: StoredTemplateDraft,
  serverUpdated: string,
): boolean => {
  return new Date(draft.updated).getTime() > new Date(serverUpdated).getTime();
};

export const createSerializableTemplateDraftState = toSerializableState;

export const useTemplateDraftPersistence = ({
  templateId,
  state,
  enabled = true,
  publishedAt = null,
}: UseTemplateDraftPersistenceProps) => {
  const api = useApi(scaffolderVisualApiRef);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncError, setHasSyncError] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });
  const [persistedStateHash, setPersistedStateHash] = useState('');
  const currentStateRef = useRef(state);
  const currentSerializedStateRef = useRef(toSerializableState(state));
  const currentStateHashRef = useRef(
    toStateHash(currentSerializedStateRef.current),
  );
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryAttemptRef = useRef(0);

  currentStateRef.current = state;

  const serializedState = useMemo(
    () => toSerializableState(state),
    [state.nodes, state.edges, state.viewport, state.metadata.name],
  );
  const currentStateHash = useMemo(
    () => toStateHash(serializedState),
    [serializedState],
  );
  currentSerializedStateRef.current = serializedState;
  currentStateHashRef.current = currentStateHash;

  const debouncedWriteDraft = useRef(
    debounce((id: string, nextState: SerializedTemplateDraftState) => {
      const draft: StoredTemplateDraft = {
        version: 1,
        updated: new Date().toISOString(),
        state: nextState,
      };

      try {
        localStorage.setItem(getStorageKey(id), JSON.stringify(draft));
      } catch (error) {
        // Ignore storage quota and unavailable storage errors.
      }
    }, 300),
  ).current;

  useEffect(() => {
    if (!enabled || !templateId) {
      return;
    }

    debouncedWriteDraft(templateId, serializedState);
  }, [enabled, templateId, serializedState, debouncedWriteDraft]);

  useEffect(() => {
    return () => {
      debouncedWriteDraft.cancel();
    };
  }, [debouncedWriteDraft]);

  const setPersistedState = useCallback((nextState: TemplateDraftState) => {
    setPersistedStateHash(toStateHash(toSerializableState(nextState)));
  }, []);

  const isDirty =
    Boolean(persistedStateHash) && currentStateHash !== persistedStateHash;

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
  }, []);

  const scheduleRetry = useCallback(
    (attemptSync: (force: boolean) => Promise<boolean>) => {
      clearRetryTimeout();
      retryAttemptRef.current += 1;
      const delayMs = Math.min(
        30000,
        1000 * Math.pow(2, retryAttemptRef.current),
      );
      retryTimeoutRef.current = setTimeout(() => {
        void attemptSync(false);
      }, delayMs);
    },
    [clearRetryTimeout],
  );

  const saveNow = useCallback(
    async (force = true): Promise<boolean> => {
      if (!templateId || isSyncing) {
        return false;
      }

      const latestStateHash = currentStateHashRef.current;
      if (!force && latestStateHash === persistedStateHash) {
        return true;
      }

      if (!isOnline) {
        setHasSyncError(false);
        return false;
      }

      setIsSyncing(true);
      const latestSerializedState = currentSerializedStateRef.current;
      const now = new Date().toISOString();

      try {
        await api.update({
          id: templateId,
          nodes: latestSerializedState.nodes,
          edges: latestSerializedState.edges,
          viewport: latestSerializedState.viewport,
          updated: now,
          published_at: publishedAt,
          metadata: {
            name: getTemplateName(latestSerializedState),
          },
        } as any);

        setPersistedStateHash(latestStateHash);
        setHasSyncError(false);
        setLastSyncedAt(now);
        retryAttemptRef.current = 0;
        clearRetryTimeout();

        const savedDraft: StoredTemplateDraft = {
          version: 1,
          updated: now,
          state: latestSerializedState,
        };
        localStorage.setItem(
          getStorageKey(templateId),
          JSON.stringify(savedDraft),
        );

        return true;
      } catch (error) {
        setHasSyncError(true);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      templateId,
      isSyncing,
      persistedStateHash,
      isOnline,
      api,
      publishedAt,
      clearRetryTimeout,
    ],
  );

  const debouncedServerSync = useRef(
    debounce((sync: (force?: boolean) => Promise<boolean>) => {
      void sync(false);
    }, 3000),
  ).current;

  useEffect(() => {
    if (!enabled || !templateId || !isDirty || isSyncing) {
      return;
    }

    if (!isOnline) {
      return;
    }

    debouncedServerSync(saveNow);
  }, [
    enabled,
    templateId,
    isDirty,
    isOnline,
    isSyncing,
    saveNow,
    debouncedServerSync,
  ]);

  useEffect(() => {
    if (!enabled || !templateId) {
      return;
    }

    if (isOnline && hasSyncError && isDirty && !isSyncing) {
      scheduleRetry(saveNow);
    }
  }, [
    enabled,
    templateId,
    isOnline,
    hasSyncError,
    isDirty,
    isSyncing,
    scheduleRetry,
    saveNow,
  ]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void saveNow(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [saveNow]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (currentStateHashRef.current !== persistedStateHash) {
        void saveNow(false);
      }
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [persistedStateHash, saveNow]);

  useEffect(() => {
    return () => {
      debouncedServerSync.cancel();
      clearRetryTimeout();
    };
  }, [debouncedServerSync, clearRetryTimeout]);

  const syncStatus: TemplateSyncStatus = useMemo(() => {
    if (isSyncing) {
      return 'syncing';
    }
    if (!isOnline && isDirty) {
      return 'offline';
    }
    if (hasSyncError && isDirty) {
      return 'error';
    }
    if (isDirty) {
      return 'pending';
    }
    return 'saved';
  }, [isSyncing, isOnline, isDirty, hasSyncError]);

  return {
    isDirty,
    isSyncing,
    syncStatus,
    lastSyncedAt,
    saveNow,
    setPersistedState,
  };
};
