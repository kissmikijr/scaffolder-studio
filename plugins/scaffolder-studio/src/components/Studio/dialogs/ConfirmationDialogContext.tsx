import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

type ConfirmationOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmationDialogContextType = {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
};

const ConfirmationDialogContext = createContext<
  ConfirmationDialogContextType | undefined
>(undefined);

export const useConfirmationDialog = (): ConfirmationDialogContextType => {
  const ctx = useContext(ConfirmationDialogContext);
  if (!ctx)
    throw new Error(
      'useConfirmationDialog must be used within ConfirmationDialogProvider',
    );
  return ctx;
};

export const ConfirmationDialogProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({});
  const [resolver, setResolver] = useState<(result: boolean) => void>(
    () => () => {},
  );

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise(resolve => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = useCallback(
    (result: boolean) => {
      setOpen(false);
      resolver(result);
    },
    [resolver],
  );

  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmationDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onClose={() => handleClose(false)}>
        <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {options.description ?? 'This action cannot be undone.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(false)}>
            {options.cancelText ?? 'Cancel'}
          </Button>
          <Button color="error" onClick={() => handleClose(true)}>
            {options.confirmText ?? 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmationDialogContext.Provider>
  );
};
