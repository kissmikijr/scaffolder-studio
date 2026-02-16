export const styledMenuProps = {
  sx: {
    '& .MuiMenu-paper': {
      borderRadius: 2,
      backgroundColor: 'background.paper',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      justifyContent: 'flex-start',
      display: 'flex',
      gap: 1,
      padding: '8px 16px',
      '&:hover': {
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        '& svg': {
          color: 'primary.contrastText',
        },
      },
    },
  },
};
