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
}: NodeSideContentProps) => {
  return (
    <NodeSideContent node={node} availableActions={availableActions}>
      {children}
    </NodeSideContent>
  );
};
