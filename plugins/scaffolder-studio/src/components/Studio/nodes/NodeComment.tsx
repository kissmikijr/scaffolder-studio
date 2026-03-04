import { useState, type ReactNode } from 'react';
import {
  Box,
  Tooltip,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
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
  containerSx?: SxProps<Theme>;
  buttonSx?: SxProps<Theme>;
  slotAfter?: ReactNode;
  slotAfterSeparator?: false | 'vertical' | 'horizontal';
}

export const NodeComment = ({
  comment,
  onChange,
  disabled = false,
  color,
  selected,
  containerSx,
  buttonSx,
  slotAfter,
  slotAfterSeparator = 'vertical',
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

  const defaultColor = color || theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';

  let backgroundColor = isDark
    ? theme.palette.grey[800]
    : theme.palette.grey[100];
  if (comment) {
    backgroundColor = defaultColor;
  }

  let hoverBackgroundColor = isDark
    ? theme.palette.grey[700]
    : theme.palette.grey[200];
  if (comment) {
    hoverBackgroundColor = defaultColor;
  }

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
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        ...containerSx,
      }}
    >
      <Tooltip
        title={comment ? 'View/Edit Comment' : 'Add Comment'}
        enterDelay={900}
        enterNextDelay={700}
      >
        <StyledIconButton
          data-testid="node-comment-button"
          size="small"
          onClick={handleOpen}
          sx={{
            width: 20,
            height: 20,
            minWidth: 20,
            backgroundColor,
            color: comment
              ? theme.palette.getContrastText(defaultColor)
              : theme.palette.text.primary,
            boxShadow: 'none',
            border: `1px solid ${
              comment ? defaultColor : theme.palette.divider
            }`,
            padding: '2px',
            '&:hover': {
              backgroundColor: hoverBackgroundColor,
              borderColor: comment
                ? defaultColor
                : theme.palette.text.secondary,
              boxShadow: 'none',
            },
            ...buttonSx,
          }}
        >
          {comment ? (
            <ChatBubbleIcon sx={{ fontSize: '0.75rem' }} />
          ) : (
            <ChatBubbleOutlineIcon sx={{ fontSize: '0.75rem' }} />
          )}
        </StyledIconButton>
      </Tooltip>
      {slotAfter ? (
        <>
          {slotAfterSeparator !== false ? (
            <Box
              sx={{
                width: slotAfterSeparator === 'horizontal' ? 14 : 1,
                height: slotAfterSeparator === 'horizontal' ? 1 : 14,
                bgcolor: 'divider',
              }}
            />
          ) : null}
          {slotAfter}
        </>
      ) : null}
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
