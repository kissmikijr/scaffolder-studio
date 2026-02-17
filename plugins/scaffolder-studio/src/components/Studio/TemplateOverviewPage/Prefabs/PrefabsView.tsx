import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { StoredPrefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { PrefabCard } from './PrefabCard';
import { PrefabListRow } from './PrefabListRow';
import { useCardSelection } from '../hooks/useCardSelection';

import { useOutletContext } from 'react-router-dom';

export const PrefabsView = () => {
  const { searchText, viewMode } = useOutletContext<{ searchText: string; viewMode?: string }>();
  const api = useApi(prefabsApiRef);
  const [prefabs, setPrefabs] = useState<StoredPrefab[]>([]);

  const {
    selectedIds,
    handleSelect,
    isSelected,
    selectedCount,
    setSelectedIds,
  } = useCardSelection(prefabs);

  useEffect(() => {
    api.list().then(setPrefabs);
  }, []);

  const handleDeletePrefab = (prefabId: string) => {
    setPrefabs(prevPrefabs =>
      prevPrefabs.filter(prefab => prefab.id !== prefabId),
    );
    setSelectedIds(prev => prev.filter(id => id !== prefabId));
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const selectedTitles = prefabs
      .filter(prefab => selectedIds.includes(prefab.id))
      .map(prefab => prefab.title)
      .join(', ');

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedCount} prefab(s)?\n\n${selectedTitles}`,
      )
    ) {
      try {
        await Promise.all(
          selectedIds.map(id => api.delete({ id })),
        );
        setPrefabs(prevPrefabs =>
          prevPrefabs.filter(prefab => !selectedIds.includes(prefab.id)),
        );
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete prefabs:', error);
      }
    }
  };

  const filtered = prefabs.filter(p =>
    (p.title ?? '').toLowerCase().includes(searchText?.toLowerCase() ?? ''),
  );

  return (
    <Box>
      {viewMode === 'list' ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            overflow: 'hidden',
            mx: 16,
          }}
        >
          {filtered.map(prefab => (
            <PrefabListRow
              key={prefab.id}
              prefab={prefab}
              isSelected={isSelected(prefab.id)}
              onSelect={e => handleSelect(prefab.id, e)}
              onContextMenu={e => {
                e.preventDefault();
                handleSelect(prefab.id, e);
              }}
              onDelete={handleDeletePrefab}
            />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 3,
          }}
        >
          {filtered.map(prefab => (
            <PrefabCard
              key={prefab.id}
              prefab={prefab}
              isSelected={isSelected(prefab.id)}
              selectedCount={selectedCount}
              onDelete={handleDeletePrefab}
              onSelect={e => handleSelect(prefab.id, e)}
              onBulkDelete={handleBulkDelete}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
