import { Edge } from '@xyflow/react';
import {
  NodeSideContent,
  NodeSideContentProps,
} from './components/NodeSideContent';

/**
 * Right sidebar form content for the main template editor.
 * This is a wrapper around NodeSideContent that enables all features.
 */
export const RightSideFormContent = ({
  availableActions,
  children,
  node,
  edge,
}: NodeSideContentProps & { edge?: Edge }) => {
  return (
    <NodeSideContent
      node={node}
      edge={edge}
      availableActions={availableActions}
    >
      {children}
    </NodeSideContent>
  );
};
