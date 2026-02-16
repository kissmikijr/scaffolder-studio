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

  const {
    prefabs,
    isLoading,
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    handleSearchToggle,
    handleSearchClose,
    searchInputRef,
  } = usePrefabTree(prefabsApi);

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
        prefabs={prefabs}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onPrefabClick={addPrefabNode || (() => { })}
        compact={true}
        draggable={true}
        dragPreviewRef={dragPreviewRef}
      />
      <PrefabDragPreview ref={dragPreviewRef} />
    </>
  );
};
