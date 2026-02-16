import { useState, useCallback, useMemo, useEffect } from 'react';

export type ViewMode = 'card' | 'list';

const STORAGE_PREFIX = 'scaffolder-studio:view-mode';

const readFromStorage = (key: string): ViewMode => {
    try {
        const stored = localStorage.getItem(key);
        if (stored === 'list' || stored === 'card') {
            return stored;
        }
    } catch {
        // Ignore storage errors
    }
    return 'card';
};

export const useViewMode = (
    pageKey?: string,
): {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
} => {
    const storageKey = pageKey
        ? `${STORAGE_PREFIX}:${pageKey}`
        : STORAGE_PREFIX;

    const [viewMode, setViewModeState] = useState<ViewMode>(() =>
        readFromStorage(storageKey),
    );

    // Re-read from storage when the key changes (tab switch)
    useEffect(() => {
        setViewModeState(readFromStorage(storageKey));
    }, [storageKey]);

    const setViewMode = useCallback((mode: ViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem(storageKey, mode);
        } catch {
            // Ignore storage errors
        }
    }, [storageKey]);

    return useMemo(() => ({ viewMode, setViewMode }), [viewMode, setViewMode]);
};
