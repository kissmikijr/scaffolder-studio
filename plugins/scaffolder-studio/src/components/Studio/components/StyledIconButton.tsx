import { forwardRef } from 'react';
import { IconButton, IconButtonProps } from '@mui/material';

/**
 * A styled IconButton with consistent padding override applied across the project.
 * Use this instead of the default MUI IconButton for visual consistency.
 */
export const StyledIconButton = forwardRef<
  HTMLButtonElement,
  IconButtonProps
>((props, ref) => {
  const { sx, ...rest } = props;

  return (
    <IconButton
      ref={ref}
      sx={{
        padding: '0px !important',
        ...sx,
      }}
      {...rest}
    />
  );
});

StyledIconButton.displayName = 'StyledIconButton';
