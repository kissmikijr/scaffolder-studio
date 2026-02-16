import { useApi } from '@backstage/core-plugin-api';
import { Node } from '@xyflow/react';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { TemplateSyncStatus } from '../../hooks/useTemplateDraftPersistence';

export type PrefabDraftState = {
    node: Node;
    title: string;
    description: string;
};

type SerializedPrefabDraftState = PrefabDraftState;

type StoredPrefabDraft = {
    version: 1;
    updated: string;
    state: SerializedPrefabDraftState;
};

type UsePrefabDraftPersistenceProps = {
    prefabId?: string;
    state: PrefabDraftState;
    enabled?: boolean;
};

const STORAGE_PREFIX = 'visual-editor:prefab-draft:';

// We might not need deep stripping for prefabs if they don't contain functions in data
// but keeping it safe is good practice.
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
    state: PrefabDraftState,
): SerializedPrefabDraftState => {
    return {
        node: stripFunctions(state.node) as Node,
        title: state.title,
        description: state.description,
    };
};

const toStateHash = (state: SerializedPrefabDraftState): string => {
    return JSON.stringify(state);
};

const getStorageKey = (id: string) => `${STORAGE_PREFIX}${id}`;

const parseDraft = (raw: string | null): StoredPrefabDraft | null => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as StoredPrefabDraft;
        if (
            parsed &&
            parsed.version === 1 &&
            parsed.updated &&
            parsed.state?.node
        ) {
            return parsed;
        }
    } catch (error) {
        // Ignore malformed drafts
    }
    return null;
};

export const readPrefabDraft = (id: string): StoredPrefabDraft | null => {
    return parseDraft(localStorage.getItem(getStorageKey(id)));
};

export const isDraftNewerThanServer = (
    draft: StoredPrefabDraft,
    serverUpdated: string,
): boolean => {
    return new Date(draft.updated).getTime() > new Date(serverUpdated).getTime();
};

export const createSerializablePrefabDraftState = toSerializableState;

export const usePrefabDraftPersistence = ({
    prefabId,
    state,
    enabled = true,
}: UsePrefabDraftPersistenceProps) => {
    const api = useApi(prefabsApiRef);
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
        [state.node, state.title, state.description],
    );
    const currentStateHash = useMemo(
        () => toStateHash(serializedState),
        [serializedState],
    );
    currentSerializedStateRef.current = serializedState;
    currentStateHashRef.current = currentStateHash;

    const debouncedWriteDraft = useRef(
        debounce((id: string, nextState: SerializedPrefabDraftState) => {
            const draft: StoredPrefabDraft = {
                version: 1,
                updated: new Date().toISOString(),
                state: nextState,
            };

            try {
                localStorage.setItem(getStorageKey(id), JSON.stringify(draft));
            } catch (error) {
                // Ignore storage errors
            }
        }, 300),
    ).current;

    useEffect(() => {
        if (!enabled || !prefabId) {
            return;
        }

        debouncedWriteDraft(prefabId, serializedState);
    }, [enabled, prefabId, serializedState, debouncedWriteDraft]);

    useEffect(() => {
        return () => {
            debouncedWriteDraft.cancel();
        };
    }, [debouncedWriteDraft]);

    const setPersistedState = useCallback((nextState: PrefabDraftState) => {
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
            if (!prefabId || isSyncing) {
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
                    id: prefabId,
                    node: latestSerializedState.node,
                    title: latestSerializedState.title,
                    description: latestSerializedState.description,
                } as any); // Type assertion as api.update might vary slightly

                setPersistedStateHash(latestStateHash);
                setHasSyncError(false);
                setLastSyncedAt(now);
                retryAttemptRef.current = 0;
                clearRetryTimeout();

                const savedDraft: StoredPrefabDraft = {
                    version: 1,
                    updated: now,
                    state: latestSerializedState,
                };
                localStorage.setItem(
                    getStorageKey(prefabId),
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
            prefabId,
            isSyncing,
            persistedStateHash,
            isOnline,
            api,
            clearRetryTimeout,
        ],
    );

    const debouncedServerSync = useRef(
        debounce((sync: (force?: boolean) => Promise<boolean>) => {
            void sync(false);
        }, 3000),
    ).current;

    useEffect(() => {
        if (!enabled || !prefabId || !isDirty || isSyncing) {
            return;
        }

        if (!isOnline) {
            return;
        }

        debouncedServerSync(saveNow);
    }, [
        enabled,
        prefabId,
        isDirty,
        isOnline,
        isSyncing,
        saveNow,
        debouncedServerSync,
    ]);

    useEffect(() => {
        if (!enabled || !prefabId) {
            return;
        }

        if (isOnline && hasSyncError && isDirty && !isSyncing) {
            scheduleRetry(saveNow);
        }
    }, [
        enabled,
        prefabId,
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
