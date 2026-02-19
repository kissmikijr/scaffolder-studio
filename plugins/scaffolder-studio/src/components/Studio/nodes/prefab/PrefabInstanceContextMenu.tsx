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
          '& .MuiMenuItem-root': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
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
