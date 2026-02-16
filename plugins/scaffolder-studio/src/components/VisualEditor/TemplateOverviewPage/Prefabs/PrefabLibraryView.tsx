import React from 'react';
import { PrefabList } from './PrefabList';
import { PrefabListHeader } from './PrefabListHeader';
import { usePrefabTree } from './usePrefabTree';
import { useApi } from '@backstage/core-plugin-api';
import { prefabLibraryApiRef } from '../../../../api';
import { useNavigate } from 'react-router-dom';

export const PrefabLibraryView = () => {
  const navigate = useNavigate();
  const prefabLibraryApi = useApi(prefabLibraryApiRef);

  const {
    prefabs,
    isLoading,
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    handleSearchToggle,
    handleSearchClose,
    searchInputRef,
    refetch,
  } = usePrefabTree(prefabLibraryApi, 'library-prefabs', { fetchMethod: 'listLibrary' });

  return (
    <>
      <PrefabListHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchExpanded={isSearchExpanded}
        handleSearchToggle={handleSearchToggle}
        handleSearchClose={handleSearchClose}
        searchInputRef={searchInputRef}
      />
      <PrefabList
        prefabs={prefabs}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onPrefabClick={id => navigate(`../prefab/${id}`)}
        prefabLibraryApi={prefabLibraryApi}
        onDeleteSuccess={refetch}
        groupByPublished={false}
      />
    </>
  );
};