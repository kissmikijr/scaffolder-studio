import React from 'react';
import { Box, TextField } from '@mui/material';

const AiInput = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="Message" />
    </Box>
  );
};

export default AiInput;
