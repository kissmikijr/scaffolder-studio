import { useState, useCallback } from 'react';

/**
 * A reusable hook for card selection with shift+click multi-select support.
 * 
 * Behavior:
 * - Regular click: Select only this item (single select)
 * - Shift+click: Add/remove from selection (toggle multi-select)
 */
export const useCardSelection = <T extends { id: string }>(items: T[]) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleSelect = useCallback(
        (id: string, event: React.MouseEvent) => {
            if (event.shiftKey) {
                // Shift+click: Add/remove from selection (multi-select toggle)
                setSelectedIds(prev =>
                    prev.includes(id)
                        ? prev.filter(selectedId => selectedId !== id)
                        : [...prev, id],
                );
            } else {
                // Regular click: Select only this item (single select)
                setSelectedIds([id]);
            }
        },
        [],
    );

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(items.map(item => item.id));
    }, [items]);

    const isSelected = useCallback(
        (id: string) => selectedIds.includes(id),
        [selectedIds],
    );

    return {
        selectedIds,
        setSelectedIds,
        handleSelect,
        clearSelection,
        selectAll,
        isSelected,
        selectedCount: selectedIds.length,
    };
};
