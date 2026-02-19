import React from 'react';
import { PrefabList } from './PrefabList';
import { PrefabListHeader } from './PrefabListHeader';
import { usePrefabTree } from './usePrefabTree';
import { useApi } from '@backstage/core-plugin-api';
import { prefabsApiRef } from '../../../../api';
import { PrefabDragPreview, PrefabDragPreviewRef } from './PrefabDragPreview';

export const PrefabTreeView = ({
  addPrefabNode,
}: {
  addPrefabNode?: (id: string, version?: string) => void;
}) => {
  const prefabsApi = useApi(prefabsApiRef);
  const dragPreviewRef = React.useRef<PrefabDragPreviewRef>(null);

  const [searchQuery, setSearchQuery] = React.useState('');

  const {
    prefabs: personalPrefabs,
    isLoading: isPersonalLoading,
    isSearchExpanded,
    handleSearchToggle,
    handleSearchClose,
    searchInputRef,
    refetch,
  } = usePrefabTree(prefabsApi, 'template-prefabs-personal', {
    fetchMethod: 'list',
    searchQuery,
    setSearchQuery,
  });

  const {
    prefabs: libraryPrefabs,
    isLoading: isLibraryLoading,
  } = usePrefabTree(prefabsApi, 'template-prefabs-library', {
    fetchMethod: 'listLibrary',
    searchQuery,
    setSearchQuery,
  });

  const unpublished = personalPrefabs.filter(p => !p.published_at);

  const groups = [
    { title: 'Your Prefabs', prefabs: unpublished },
    { title: 'Library Prefabs', prefabs: libraryPrefabs },
  ];

  return (
    <>
      <PrefabListHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchExpanded={isSearchExpanded}
        handleSearchToggle={handleSearchToggle}
        handleSearchClose={handleSearchClose}
        searchInputRef={searchInputRef}
        header={true}
      />
      <PrefabList
        prefabs={[]} // Not used when groups is provided
        groups={groups}
        isLoading={isPersonalLoading || isLibraryLoading}
        searchQuery={searchQuery}
        onPrefabClick={addPrefabNode || (() => { })}
        compact={true}
        draggable={true}
        dragPreviewRef={dragPreviewRef}
        onDeleteSuccess={refetch}
      />
      <PrefabDragPreview ref={dragPreviewRef} />
    </>
  );
};
