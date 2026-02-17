// src/components/dialogs/useConfirmationDialog.tsx

import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

export type ConfirmationDialogOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmationDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationDialogOptions | null>(
    null,
  );

  const openConfirm = useCallback((opts: ConfirmationDialogOptions) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const handleClose = () => setOpen(false);

  const dialog = (
    <Dialog open={open} onClose={handleClose}>
      {options?.title && (
        <DialogTitle>
          <Typography variant="h6">{options.title}</Typography>
        </DialogTitle>
      )}
      {options?.description && (
        <DialogContent>
          <Typography variant="body2">{options.description}</Typography>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={handleClose}>
          {options?.cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          onClick={async () => {
            await options?.onConfirm?.();
            handleClose();
          }}
          color={options?.danger ? 'error' : 'primary'}
          variant="contained"
        >
          {options?.confirmLabel ?? 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { openConfirm, ConfirmationDialog: dialog };
}
