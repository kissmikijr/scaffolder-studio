import { NodeProps, Position, Node, useEdges, useNodes } from '@xyflow/react';
import { Handle } from '../../components/Handle';
import { FadableContainer } from '../../components/FadableContainer';
import { Typography, useTheme, Box, Divider } from '@mui/material';
import { AllNodeData, TemplateNodeData } from '../../types';
import { MarkdownContent } from '@backstage/core-components';

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
        border: `2px solid ${selected ? SELECTED_BORDER_COLOR : theme.palette.divider
          }`,
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
          position: 'absolute',
          top: -20,
          left: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          pointerEvents: 'none',
        }}
      >
        Template
      </Box>
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
