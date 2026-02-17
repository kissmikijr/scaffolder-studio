import React, { useCallback } from 'react';
import { Menu, MenuItem, ListItemIcon, Typography } from '@mui/material';
import { styledMenuProps } from '../../components/menuStyles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';

export const PrefabInstanceContextMenu = ({
  id,
  top,
  left,
  ...props
}: {
  id: string;
  top: number;
  left: number;
  onClick: () => void;
}) => {
  const navigate = useNavigate();

  const handleOpenPrefab = useCallback(() => {
    if (id) {
      navigate(`/scaffolder-studio/prefab/${id}`);
    }
  }, [id, navigate]);
  return (
    <div {...props}>
      <Menu
        open={true}
        anchorPosition={{ top, left }}
        anchorReference="anchorPosition"
        className="nodrag nopan"
        {...styledMenuProps}
        sx={{
          '& .MuiMenu-paper': {
            borderRadius: 2,
            backgroundColor: 'background.paper',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '4px 0',
          },
          '& .MuiMenuItem-root': {
            display: 'flex',
            padding: '8px 16px',
            alignItems: 'center',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '& svg': {
                color: 'primary.contrastText',
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleOpenPrefab}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2" fontWeight="bold">
            Open Prefab
          </Typography>
        </MenuItem>
      </Menu>
    </div>
  );
};
