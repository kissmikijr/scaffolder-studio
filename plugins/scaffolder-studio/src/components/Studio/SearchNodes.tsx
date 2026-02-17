import React from 'react';
import { Box, TextField } from '@mui/material';
import { useNodes, useReactFlow } from '@xyflow/react';

export const SearchNodes = ({
  onNodeSelected,
}: {
  onNodeSelected?: (node: any) => void;
} = {}) => {
  const reactFlowInstance = useReactFlow();
  const nodes = useNodes();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Nodes..."
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              const searchTerm = target.value.toLowerCase();
              if (!searchTerm) return;

              const foundNode = nodes?.find(
                n =>
                  (n.data as any)?.name?.toLowerCase?.().includes(searchTerm) ||
                  (n.data as any)?.stepId?.toLowerCase?.().includes(searchTerm),
              );
              if (foundNode) {
                reactFlowInstance.setCenter(
                  foundNode.position.x,
                  foundNode.position.y,
                  { duration: 200, zoom: reactFlowInstance.getZoom() },
                );
                reactFlowInstance.setNodes(nds =>
                  nds.map(node => ({
                    ...node,
                    selected: node.id === foundNode.id,
                  })),
                );
                // Trigger callback to switch to form tab
                onNodeSelected?.(foundNode);
              }
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              borderRadius: '24px',
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'text.secondary',
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
