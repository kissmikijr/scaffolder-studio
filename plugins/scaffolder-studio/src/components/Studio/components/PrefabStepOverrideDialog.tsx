import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

type PrefabStepOverrideDialogProps = {
  open: boolean;
  initialStepId: string;
  initialName: string;
  existingStepIds: string[];
  onCancel: () => void;
  onSubmit: (values: { stepId: string; name: string }) => void;
};

export const PrefabStepOverrideDialog = ({
  open,
  initialStepId,
  initialName,
  existingStepIds,
  onCancel,
  onSubmit,
}: PrefabStepOverrideDialogProps) => {
  const [stepId, setStepId] = useState(initialStepId);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStepId(initialStepId);
    setName(initialName);
  }, [initialName, initialStepId, open]);

  const trimmedStepId = stepId.trim();
  const trimmedName = name.trim();
  const stepIdExists = useMemo(
    () =>
      existingStepIds.some(existingId => existingId.trim() === trimmedStepId),
    [existingStepIds, trimmedStepId],
  );

  let stepIdError = !trimmedStepId ? 'Step id is required' : '';
  stepIdError = stepIdExists ? 'Step id already exists' : '';

  const nameError = !trimmedName ? 'Step name is required' : '';
  const isValid = !stepIdError && !nameError;

  const handleSubmit = () => {
    if (!isValid) {
      return;
    }

    onSubmit({ stepId: trimmedStepId, name: trimmedName });
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Customize Step Prefab</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Step ID"
            value={stepId}
            onChange={event => setStepId(event.target.value)}
            error={Boolean(stepIdError)}
            helperText={stepIdError || 'Used in YAML under spec.steps'}
          />
          <TextField
            fullWidth
            label="Step Name"
            value={name}
            onChange={event => setName(event.target.value)}
            error={Boolean(nameError)}
            helperText={nameError || 'Visible in the editor'}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValid}>
          Insert Prefab
        </Button>
      </DialogActions>
    </Dialog>
  );
};
