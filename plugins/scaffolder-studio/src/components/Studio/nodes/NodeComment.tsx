import { useState } from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { StyledIconButton } from '../components/StyledIconButton';
import { CommentInputPopover } from '../components/CommentInputPopover';

interface NodeCommentProps {
  comment?: string;
  onChange: (comment: string) => void;
  disabled?: boolean;
  color?: string;
  selected?: boolean;
}

export const NodeComment = ({
  comment,
  onChange,
  disabled = false,
  color,
  selected,
}: NodeCommentProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = useTheme();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled && !comment) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box
      className="node-comment-badge"
      data-testid="node-comment-badge"
      sx={{
        pointerEvents: selected ? 'auto' : 'none',
        position: 'absolute',
        top: -10,
        right: -10,
        zIndex: 1000,
        opacity: selected ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
    >
      <Tooltip title={comment ? 'View/Edit Comment' : 'Add Comment'}>
        <StyledIconButton
          data-testid="node-comment-button"
          size="small"
          onClick={handleOpen}
          sx={{
            width: 20,
            height: 20,
            minWidth: 20,
            backgroundColor: comment
              ? color || theme.palette.primary.main
              : theme.palette.background.paper,
            color: comment
              ? theme.palette.getContrastText(
                  color || theme.palette.primary.main,
                )
              : theme.palette.text.secondary,
            boxShadow: theme.shadows[2],
            border: comment ? 'none' : `1px solid ${theme.palette.divider}`,
            padding: '2px',
            '&:hover': {
              backgroundColor: comment
                ? color || theme.palette.primary.main
                : theme.palette.action.hover,
              boxShadow: theme.shadows[4],
            },
          }}
        >
          {comment ? (
            <ChatBubbleIcon sx={{ fontSize: '0.75rem' }} />
          ) : (
            <ChatBubbleOutlineIcon sx={{ fontSize: '0.75rem' }} />
          )}
        </StyledIconButton>
      </Tooltip>
      <CommentInputPopover
        open={open}
        anchorEl={anchorEl}
        value={comment || ''}
        onChange={onChange}
        onClose={handleClose}
        disabled={disabled}
      />
    </Box>
  );
};
