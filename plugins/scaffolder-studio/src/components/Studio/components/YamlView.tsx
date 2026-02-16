import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from '@xyflow/react';
import { CodeEditor } from './CodeEditor';
import { scaffolderVisualApiRef } from '../../../api/ScaffolderVisualClient';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { AllNodeData, isTemplateNode } from '../types';
import yaml from 'js-yaml';
import { calculateReadOnlyRanges } from './yamlUtils';
import { rehydrateNodes } from '../rehydrateNodes';
import { onChange } from '../handlers';
import { mergeNodePositions } from '../utils/nodeMatching';

interface YamlViewProps {
  templateId?: string;
  nodes: Node<AllNodeData>[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node<AllNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onAddProperty: (parentId: string) => void;
}

export const YamlView = ({
  templateId,
  nodes,
  edges,
  setNodes: setNodesExternal,
  setEdges: setEdgesExternal,
  onAddProperty,
}: YamlViewProps) => {
  // const edges = useEdges(); // Removed
  // const nodes = useNodes<Node<AllNodeData>>(); // Removed
  const [yamlOutput, setYamlOutput] = useState<string>('');
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);
  const alertApi = useApi(alertApiRef);

  const [readOnlyRanges, setReadOnlyRanges] = useState<
    Array<{ from: number; to: number }>
  >([]);

  useEffect(() => {
    const id = nodes.find(n => isTemplateNode(n))?.id;
    if (id) {
      scaffolderVisualApi
        .serializeTemplate({
          nodes,
          edges,
          sourceNodeId: id,
        })
        .then(async template => {
          setYamlOutput(template);

          // 1. Resolve nodes to get the actual content used in YAML
          const resolvedNodes = await scaffolderVisualApi.resolve({ nodes });

          // 2. Calculate read-only ranges using utility
          const ranges = calculateReadOnlyRanges(
            template,
            nodes,
            resolvedNodes as Node<AllNodeData>[],
          );

          setReadOnlyRanges(ranges);
        })
        .catch(error => {
          const errorMessage = `# Failed to serialize template\n# ${
            error.message || 'Unknown error'
          }\n#\n# This may be caused by:\n# - A deleted or missing prefab referenced in the template\n# - Invalid node data\n# - Server connectivity issues\n#\n# Please check your template for any missing prefabs (shown with dashed borders).`;
          setYamlOutput(errorMessage);
          setReadOnlyRanges([]);
          alertApi.post({
            severity: 'error',
            display: 'transient',
            message: 'Failed to serialize template. Check for missing prefabs.',
          });
        });
    }
  }, [nodes, edges, scaffolderVisualApi, alertApi]);

  const handleCopy = () => {
    alertApi.post({
      severity: 'success',
      display: 'transient',
      message: 'YAML copied to the clipboard',
    });
  };

  const handleImport = async (yamlCode: string) => {
    if (!templateId) {
      alertApi.post({
        severity: 'error',
        display: 'transient',
        message: 'No template ID available for import',
      });
      return;
    }

    try {
      // Parse the YAML
      const parsed = yaml.load(yamlCode) as any;

      // Validate it's a template
      if (parsed.kind !== 'Template') {
        alertApi.post({
          severity: 'error',
          display: 'transient',
          message: 'Input must be a Backstage Template (kind: Template)',
        });
        return;
      }

      // Import the template
      await scaffolderVisualApi.importTemplate({
        template: parsed,
        id: templateId,
      });

      // Reload the project to get updated nodes/edges
      const updatedProject = await scaffolderVisualApi.getProject(templateId);

      // Restore positions from existing nodes using structural matching
      const nodesWithPositions = mergeNodePositions(
        nodes,
        edges,
        updatedProject.nodes,
        updatedProject.edges,
      );

      // Rehydrate nodes to attach onChange handlers
      const rehydratedNodes = rehydrateNodes(nodesWithPositions, {
        onChange: onChange(setNodesExternal),
        onAddProperty,
      });

      setNodesExternal(rehydratedNodes);
      setEdgesExternal(updatedProject.edges);

      alertApi.post({
        severity: 'success',
        display: 'transient',
        message: 'Template imported successfully',
      });
    } catch (error) {
      alertApi.post({
        severity: 'error',
        display: 'transient',
        message: `Failed to import YAML: ${(error as Error).message}`,
      });
    }
  };

  return (
    <>
      <CodeEditor
        code={yamlOutput}
        language="yaml"
        onCopy={handleCopy}
        onImport={handleImport}
        onChange={setYamlOutput}
        maxHeight="70vh"
        readOnlyRanges={readOnlyRanges}
      />
    </>
  );
};
