import { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { Node } from '@xyflow/react';
import { AllNodeData } from '../types';
import { CodeEditor } from './CodeEditor';
import { serializeNodeData, deserializeNodeData } from './nodeYamlUtils';

interface YamlNodeEditorProps {
  node: Node<AllNodeData>;
  onChange: (id: string, data: any) => void;
  readOnly?: boolean;
}

export const YamlNodeEditor = ({
  node,
  onChange,
  readOnly = false,
}: YamlNodeEditorProps) => {
  const [localYaml, setLocalYaml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Sync from node to local YAML when the selected node payload changes.
  // Prefab side content swaps the backing node asynchronously after fetch.
  useEffect(() => {
    try {
      const yamlStr = serializeNodeData(node as any);
      setLocalYaml(yamlStr);
      setError(null);
    } catch (e) {
      setError(`Failed to serialize: ${(e as Error).message}`);
    }
  }, [node]);

  const handleYamlChange = useCallback(
    (value: string) => {
      setLocalYaml(value);
      try {
        const parsed = deserializeNodeData(value, node.type!);
        setError(null);
        // Trigger update back to the canvas
        onChange(node.id, parsed);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [node.id, node.type, onChange],
  );

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}
    >
      <Box sx={{ flex: 1, minHeight: 400 }}>
        <CodeEditor
          code={localYaml}
          onChange={readOnly ? undefined : handleYamlChange}
          language="yaml"
          showImportButton={false} // We update on change
          maxHeight="calc(100vh - 200px)"
          editable
          readOnlyRanges={readOnly ? [{ from: 0, to: localYaml.length }] : []}
        />
      </Box>
      {error && (
        <Typography variant="caption" color="error" sx={{ px: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};
