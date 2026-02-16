import {
  NodeProps,
  Position,
  Node,
  NodeResizer,
  useEdges,
} from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { Box } from '@mui/material';
import { ParametersNodeData } from '../../types';

import { SELECTED_BORDER_COLOR } from '../../styles';
import {
  countIncomingConnections,
  countOutgoingConnections,
  hasIncomingCapacity,
  hasOutgoingCapacity,
} from '../../utils/connectionLimits';

const ParametersNode = ({
  id,
  selected,
  data,
}: NodeProps<Node<ParametersNodeData>>) => {
  const edges = useEdges();
  const canAcceptIncoming = hasIncomingCapacity(
    'parameters',
    countIncomingConnections(edges, id),
  );
  const canAcceptOutgoing = hasOutgoingCapacity(
    'parameters',
    countOutgoingConnections(edges, id),
  );

  return (
    <>
      <NodeResizer
        color={SELECTED_BORDER_COLOR}
        isVisible={selected}
        minWidth={250}
        minHeight={150}
        handleStyle={{ width: 10, height: 10, borderRadius: 0 }}
        lineStyle={{ borderWidth: 6, opacity: 0 }}
      />
      <Box
        sx={{
          width: '100%',
          height: '100%',
          px: 1,
          pt: 3, // Create space for title
          position: 'relative',
          borderRadius: '12px',
          backgroundColor: 'rgba(79, 255, 224, 0.1)', // Semi-transparent
          color: '#282a36',
          pointerEvents: 'all',
          border: `2px ${selected ? 'solid' : 'dashed'} ${selected ? SELECTED_BORDER_COLOR : 'rgba(79, 255, 224, 0.8)'
            }`,
          '&:hover': {
            cursor: 'grab',
          },
          outline: 'none',
        }}
        data-interactive="true"
      >
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            left: 12,
            px: 1,
            backgroundColor: '#4fffe0',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#282a36',
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {data.title || 'Parameters Group'}
        </Box>

        <Handle
          id="top"
          type="target"
          position={Position.Top}
          disabled={!canAcceptIncoming}
        />
        <Handle
          id="right"
          type="target"
          position={Position.Right}
          disabled={!canAcceptIncoming}
        />
        <Handle
          id="bottom"
          type="target"
          position={Position.Bottom}
          disabled={!canAcceptIncoming}
        />
        <Handle
          id="left"
          type="target"
          position={Position.Left}
          disabled={!canAcceptIncoming}
        />

        <Handle
          id="top"
          type="source"
          position={Position.Top}
          disabled={!canAcceptOutgoing}
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          disabled={!canAcceptOutgoing}
        />
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          disabled={!canAcceptOutgoing}
        />
        <Handle
          id="left"
          type="source"
          position={Position.Left}
          disabled={!canAcceptOutgoing}
        />
      </Box>
    </>
  );
};

export default ParametersNode;
