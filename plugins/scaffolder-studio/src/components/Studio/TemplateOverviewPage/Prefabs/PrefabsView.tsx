import { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api/PrefabsClient';
import { StoredPrefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { PrefabCard } from './PrefabCard';
import { PrefabListRow } from './PrefabListRow';
import { useCardSelection } from '../hooks/useCardSelection';

import { useOutletContext } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { usePrefabCreator } from '../hooks/usePrefabCreator';
import { useConfirmationDialog } from '../../dialogs/useConfirmationDialog';

export const PrefabsView = () => {
  const { searchText, viewMode } = useOutletContext<{ searchText: string; viewMode?: string }>();
  const api = useApi(prefabsApiRef);
  const [prefabs, setPrefabs] = useState<StoredPrefab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createPrefab } = usePrefabCreator();
  const { openConfirm, ConfirmationDialog } = useConfirmationDialog();

  const {
    selectedIds,
    handleSelect,
    isSelected,
    selectedCount,
    setSelectedIds,
  } = useCardSelection(prefabs);

  useEffect(() => {
    api.list()
      .then(setPrefabs)
      .finally(() => setIsLoading(false));
  }, [api]);

  const handleDeletePrefab = (prefabId: string) => {
    setPrefabs(prevPrefabs =>
      prevPrefabs.filter(prefab => prefab.id !== prefabId),
    );
    setSelectedIds(prev => prev.filter(id => id !== prefabId));
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0) return;

    const selectedTitles = prefabs
      .filter(prefab => selectedIds.includes(prefab.id))
      .map(prefab => prefab.title)
      .join(', ');

    openConfirm({
      title: 'Delete Prefabs',
      description: `Are you sure you want to delete ${selectedCount} prefab(s)?\n\n${selectedTitles}`,
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedIds.map(id => api.delete({ id })),
          );
          setPrefabs(prevPrefabs =>
            prevPrefabs.filter(prefab => !selectedIds.includes(prefab.id)),
          );
          setSelectedIds([]);
        } catch {
          // Silent error
        }
      },
    });
  };

  const filtered = prefabs.filter(p => {
    const query = searchText?.toLowerCase() ?? '';
    return (
      (p.title ?? '').toLowerCase().includes(query) ||
      (p.description ?? '').toLowerCase().includes(query) ||
      (p.owner ?? '').toLowerCase().includes(query)
    );
  });

  const theme = useTheme();

  const renderEmptyState = () => (
    <EmptyState
      title={
        searchText
          ? 'No prefabs match your search'
          : 'No prefabs found'
      }
      description={
        searchText
          ? `Try adjusting your search terms to find what you're looking for.`
          : 'Get started by creating your first prefab.'
      }
      action={
        !searchText
          ? {
            label: 'Create Prefab',
            onClick: createPrefab,
          }
          : undefined
      }
      missing="content"
    />
  );

  if (isLoading) {
    return null;
  }

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
            backgroundColor: 'transparent',
          }}
        >
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'transparent',
            }}
          >
            <Box
              component="thead"
              sx={{
                '& th': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: 'transparent',
                  color: theme.palette.text.secondary,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1.5,
                  px: 2,
                  textAlign: 'left',
                },
              }}
            >
              <tr>
                <th>Nodes</th>
                <th>Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Updated</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Version</th>
                <th style={{ textAlign: 'right' }}>Type</th>
              </tr>
            </Box>
            <Box component="tbody">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: theme.spacing(4, 2) }}>
                    {renderEmptyState()}
                  </td>
                </tr>
              ) : (
                filtered.map(prefab => (
                  <PrefabListRow
                    key={prefab.id}
                    prefab={prefab}
                    isSelected={isSelected(prefab.id)}
                    onSelect={e => handleSelect(prefab.id, e)}
                    onContextMenu={e => e.preventDefault()}
                    onDelete={handleDeletePrefab}
                  />
                ))
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          {filtered.length === 0 ? (
            renderEmptyState()
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
        </>
      )}
      {ConfirmationDialog}
    </Box>
  );
};
