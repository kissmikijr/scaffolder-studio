import { NodeProps, Position, Node, useEdges, useNodes } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { FadableContainer } from '../../components/FadableContainer';
import { Typography, useTheme, Box, Divider } from '@mui/material';
import { AllNodeData, TemplateNodeData } from '../../types';
import { MarkdownContent } from '@backstage/core-components';
import { NodeComment } from '../NodeComment';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';

import { SELECTED_BORDER_COLOR } from '../../styles';
import { getTemplateOutgoingSlots } from '../../utils/connectionLimits';

const TemplateNode = ({
  id,
  selected,
  data,
}: NodeProps<Node<TemplateNodeData>>) => {
  const theme = useTheme();
  const edges = useEdges();
  const nodes = useNodes<Node<AllNodeData>>();
  const templateSlots = getTemplateOutgoingSlots(id, edges, nodes);
  return (
    <Box
      sx={{
        width: 260,
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        pointerEvents: 'auto',
        borderRadius: '20px',
        border: `2px solid ${
          selected ? SELECTED_BORDER_COLOR : theme.palette.divider
        }`,
        '&:hover': {
          boxShadow: 3,
          cursor: 'pointer',
        },
        '& .node-controls-hotspot:hover + .node-comment-badge, & .node-comment-badge:hover, & .node-comment-badge:focus-within, &:focus-within .node-comment-badge':
          {
            opacity: 1,
            pointerEvents: 'auto',
          },
        outline: 'none',
      }}
      data-interactive="true"
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          Template
        </Typography>
      </Box>

      <Box
        className="node-controls-hotspot"
        sx={{
          position: 'absolute',
          top: -22,
          right: -22,
          width: 58,
          height: 58,
          borderTopRightRadius: '20px',
          pointerEvents: 'auto',
          zIndex: 4500,
        }}
      />

      <NodeComment
        comment={data.comment}
        onChange={val => data.onChange(id, { ...data, comment: val } as any)}
        color={NodeTypeColors.template}
        selected
        containerSx={{
          top: -10,
          right: -10,
          left: 'auto',
          zIndex: 5000,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.16s ease',
        }}
      />
      <Box
        sx={{
          backgroundColor: '#bd93f9', // Dracula orange
          color: '#282a36', // Dracula background as text color (good contrast)
          px: 1.5,
          py: 0.5,
          borderTopLeftRadius: '18px',
          borderTopRightRadius: '18px',
          width: '100%',
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', justifyContent: 'center' }}
        >
          {data.name || '—'}
        </Typography>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Divider />
      </Box>

      <Box sx={{ px: 1, pb: 1 }}>
        <Box mb={1}>
          <Typography variant="subtitle2">Owner</Typography>
          <Box
            sx={{
              backgroundColor: theme.palette.action.hover,
              borderRadius: '12px',
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              width: 'fit-content',
              maxWidth: '100%',
              marginTop: 0.5,
            }}
          >
            <FadableContainer
              component={Typography}
              sx={{
                fontFamily: 'Monospace',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span style={{ fontWeight: 600 }}>{data.owner || '—'}</span>
            </FadableContainer>
          </Box>
        </Box>

        <Box mb={1}>
          <Typography variant="subtitle2">Description</Typography>
          <Box
            sx={{
              maxWidth: '100%',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              fontSize: '0.7rem',
              lineHeight: '1.2',
              maxHeight: '4.8em',
            }}
          >
            <MarkdownContent content={data.description} />
          </Box>
        </Box>

        <Handle
          type="source"
          id="top"
          position={Position.Top}
          disabled={!templateSlots.hasAny}
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          disabled={templateSlots.hasStep}
        />
        <Handle
          type="source"
          id="bottom"
          position={Position.Bottom}
          disabled={templateSlots.hasParameters}
        />
        <Handle
          type="source"
          id="left"
          position={Position.Left}
          disabled={templateSlots.hasOutput}
        />
      </Box>
    </Box>
  );
};

export default TemplateNode;
