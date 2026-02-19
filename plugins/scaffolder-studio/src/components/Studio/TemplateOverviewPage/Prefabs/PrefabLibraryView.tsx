import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Box } from '@mui/material';
import { PrefabList } from './PrefabList';
import { usePrefabTree } from './usePrefabTree';
import { useApi } from '@backstage/core-plugin-api';
import { prefabLibraryApiRef } from '../../../../api';

export const PrefabLibraryView = () => {
  const { searchText } = useOutletContext<{ searchText: string }>();
  const navigate = useNavigate();
  const prefabLibraryApi = useApi(prefabLibraryApiRef);

  const {
    prefabs,
    isLoading,
    refetch,
  } = usePrefabTree(prefabLibraryApi, 'library-prefabs', {
    fetchMethod: 'listLibrary',
    searchQuery: searchText,
  });

  return (
    <Box sx={{ mx: 16 }}>
      <PrefabList
        prefabs={prefabs}
        isLoading={isLoading}
        searchQuery={searchText}
        onPrefabClick={id => navigate(`../prefab/${id}`)}
        prefabLibraryApi={prefabLibraryApi}
        onDeleteSuccess={refetch}
        groupByPublished={false}
      />
    </Box>
  );
};