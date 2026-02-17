import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { scaffolderVisualApiRef } from '../../api/ScaffolderVisualClient';
import { DryRunView } from './components/DryRunView';
import Header from './components/Header';
import { Box, Button, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const runWithViewTransition = (navigateAction: () => void) => {
  const documentWithTransition = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (documentWithTransition.startViewTransition) {
    documentWithTransition.startViewTransition(() => {
      navigateAction();
    });
    return;
  }

  navigateAction();
};

const HeaderCloseDryRunButton = ({
  onClose,
  isClosing,
}: {
  onClose: () => void;
  isClosing: boolean;
}) => {
  return (
    <Button
      onClick={onClose}
      endIcon={<CloseIcon />}
      color="secondary"
      disabled={isClosing}
    >
      Close dry run
    </Button>
  );
};
export const DryRunPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.returnPath;
  const { id } = useParams();
  const theme = useTheme();
  const scaffolderVisualApi = useApi(scaffolderVisualApiRef);
  const [isEntering, setIsEntering] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsEntering(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleCloseDryRun = () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      runWithViewTransition(() => {
        if (returnPath) {
          navigate(returnPath);
        } else {
          navigate(`/scaffolder-studio/templates/${id}/form`);
        }
      });
    }, 140);
  };

  if (!id) {
    return <div>No ID</div>;
  }

  const { data: project, isLoading } = useQuery({
    queryKey: ['dry-run', id],
    queryFn: () => scaffolderVisualApi.getProject(id),
  });
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        opacity: isEntering || isClosing ? 0 : 1,
        transform: isEntering
          ? 'translateY(8px)'
          : isClosing
            ? 'translateY(-8px)'
            : 'translateY(0)',
        transition: 'opacity 160ms ease, transform 160ms ease',
      }}
    >
      <Header project={project ?? null}>
        <Header.Title />
        <Header.Spacer />
        <HeaderCloseDryRunButton
          onClose={handleCloseDryRun}
          isClosing={isClosing}
        />
      </Header>
      <Box
        sx={{
          flex: 1,
          backgroundColor: theme.palette.background.default,
          '.MuiPaper-root': {
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
        <DryRunView
          nodes={location.state.nodes}
          edges={location.state.edges}
          templateId={id}
        />
      </Box>
    </Box>
  );
};
