import React from 'react';
import { NodeSideContent, NodeSideContentProps } from '../../components/NodeSideContent';

/**
 * Side content for the prefab editor.
 * Only supports step, output, and property node types.
 * Does not show the template expression hint (not applicable for prefabs).
 */
export const PrefabSideNodes = ({
  availableActions,
  children,
  node,
}: NodeSideContentProps) => {
  return (
    <NodeSideContent
      node={node}
      availableActions={availableActions}
      showHint={false}
      supportedTypes={['step', 'output', 'property']}
    >
      {children}
    </NodeSideContent>
  );
};
