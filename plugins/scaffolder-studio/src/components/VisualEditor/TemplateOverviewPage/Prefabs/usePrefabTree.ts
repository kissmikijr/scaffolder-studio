import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Prefab,
  isStepNode,
  isPropertyNode,
  isOutputNode,
  isTemplateNode,
  isParametersNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { useQuery } from '@tanstack/react-query';
import { PrefabLibraryClientApi, PrefabsClientApi } from '../../../../api';

type PrefabApi = PrefabLibraryClientApi | PrefabsClientApi;

export const usePrefabTree = (api: PrefabApi) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: prefabs, isLoading, refetch } = useQuery<Prefab[]>({
    queryKey: ['prefabs', api], // Include api in queryKey to differentiate
    queryFn: () => api.listLibrary ? api.listLibrary() : (api as any).list(), // Handle different API methods if they differ. 
    // Wait, PrefabLibraryClient has listLibrary? PrefabsClient has list?
    // I need to check the API interfaces.
    refetchOnMount: true,
    gcTime: 0,
    staleTime: 0,
  });

  const filteredPrefabs = useMemo(() => {
    if (!prefabs || !searchQuery.trim()) {
      return prefabs || [];
    }

    const query = searchQuery.toLowerCase().trim();
    return prefabs.filter((prefab: Prefab) => {
      const getNodeTypeLabel = (node: Prefab['node']) => {
        if (!node) return 'unknown';
        if (isStepNode(node)) return 'step';
        if (isPropertyNode(node)) return 'property';
        if (isOutputNode(node)) return 'output';
        if (isTemplateNode(node)) return 'template';
        if (isParametersNode(node)) return 'parameters';
        return 'unknown';
      };

      const nodeTypeLabel = getNodeTypeLabel(prefab.node);

      return (
        prefab.title?.toLowerCase().includes(query) ||
        prefab.owner?.toLowerCase().includes(query) ||
        nodeTypeLabel.includes(query)
      );
    });
  }, [prefabs, searchQuery]);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchToggle = () => {
    if (isSearchExpanded && searchQuery) {
      setSearchQuery('');
    }
    setIsSearchExpanded(!isSearchExpanded);
  };

  const handleSearchClose = () => {
    setSearchQuery('');
    setIsSearchExpanded(false);
  };

  return {
    prefabs: filteredPrefabs,
    isLoading,
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    handleSearchToggle,
    handleSearchClose,
    searchInputRef,
    refetch,
  };
};
