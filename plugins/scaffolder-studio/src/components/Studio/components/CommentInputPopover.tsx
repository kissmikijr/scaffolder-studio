import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type CommentInputPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  disabled?: boolean;
};

export const CommentInputPopover = ({
  open,
  anchorEl,
  value,
  onChange,
  onClose,
  disabled = false,
}: CommentInputPopoverProps) => {
  const theme = useTheme();
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Auto-enter edit mode when comment is empty (only on popover open).
      setIsEditing(!value && !disabled);
      setDraftValue(value);
    }
    wasOpenRef.current = open;
  }, [open, value, disabled]);

  useEffect(() => {
    if (!open || !isEditing || disabled) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, isEditing, disabled]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    handleMenuClose();
  };

  const handleCancel = () => {
    setDraftValue(value);
    setIsEditing(false);
    onClose();
  };

  const handleSubmit = () => {
    onChange(draftValue);
    setIsEditing(false);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        'data-testid': 'comment-input-popover',
        sx: {
          width: 360,
          p: 1.5,
          borderRadius: '10px',
          boxShadow: theme.shadows[6],
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Comment
        </Typography>
        <IconButton
          data-testid="comment-input-menu-button"
          size="small"
          onClick={handleMenuOpen}
          disabled={disabled}
          aria-label="Comment options"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        data-testid="comment-input-field"
        inputRef={inputRef}
        fullWidth
        multiline
        value={draftValue}
        onChange={e => setDraftValue(e.target.value)}
        placeholder="Add a comment..."
        size="small"
        disabled={disabled}
        InputProps={{
          readOnly: !isEditing,
        }}
      />
      {isEditing && (
        <Box
          sx={{ mt: 1.25, display: 'flex', justifyContent: 'flex-end', gap: 1 }}
        >
          <Button size="small" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            data-testid="comment-input-submit"
            variant="contained"
            size="small"
            onClick={handleSubmit}
            disabled={disabled}
          >
            Comment
          </Button>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          data-testid="comment-input-edit-menu-item"
          onClick={handleEdit}
          disabled={disabled}
        >
          Edit
        </MenuItem>
      </Menu>
    </Popover>
  );
};
