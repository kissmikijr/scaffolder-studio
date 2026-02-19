import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Box, useTheme } from '@mui/material';
import { PrefabQueenNodeData } from '../../types';
import { Node } from '@xyflow/react';
import OutputNode from '../output/OutputNode';
import StepNode from '../step/StepNode';
import { PropertyNodeContent } from '../property/PropertyNode';
import {
  isStepNode,
  isPropertyNode,
  isOutputNode,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { SELECTED_BORDER_COLOR } from '../../styles';

const PrefabQueenNode = ({
  selected,
  data,
}: NodeProps<Node<PrefabQueenNodeData>>) => {
  const theme = useTheme();
  const renderNode = () => {
    const node = data?.node;

    if (!node) {
      return <div>Render Node</div>;
    }

    const baseProps = {
      selected: false,
      dragging: false,
      draggable: true,
      selectable: true,
      deletable: true,
      zIndex: 0,
      isConnectable: true,
      positionAbsoluteX: node.position.x,
      positionAbsoluteY: node.position.y,
    };

    if (isStepNode(node)) {
      return <StepNode {...node} {...baseProps} disabled />;
    }
    if (isPropertyNode(node)) {
      return <PropertyNodeContent {...node} {...baseProps} disabled />;
    }
    if (isOutputNode(node)) {
      return <OutputNode {...node} {...baseProps} disabled />;
    }

    return <div>Render Node</div>;
  };
  return (
    <Box>
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          left: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 120,
          pointerEvents: 'none',
        }}
      >
        {`Prefab: ${data?.title}`}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          pointerEvents: 'none',
        }}
      >
        {`${data?.node?.type}`}
      </Box>
      <Box
        sx={{
          position: 'relative',
          borderRadius: '21px',
          color: theme.palette.text.primary,
          backgroundColor: theme.complimentBackground,
          pointerEvents: 'auto',
          border: `2px solid ${selected ? SELECTED_BORDER_COLOR : '#30CBAD'}`,
          '&:hover': {
            boxShadow: 3,
            cursor: 'pointer',
          },
          outline: 'none',
        }}
        data-interactive="true"
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box>{renderNode()}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PrefabQueenNode;
