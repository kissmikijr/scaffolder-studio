import React from 'react';
import { Box, Button } from '@mui/material';
import { EmptyState as BackstageEmptyState } from '@backstage/core-components';

type EmptyStateProps = {
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    image?: React.ReactNode;
    missing?: "field" | "content" | "data";
};

export const EmptyState = ({
    title,
    description,
    action,
    image,
    missing = "content",
}: EmptyStateProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 4,
                textAlign: 'center',
            }}
        >
            <BackstageEmptyState
                missing={missing}
                title={title}
                description={description}
                action={action && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={action.onClick}
                        sx={{ mt: 2 }}
                    >
                        {action.label}
                    </Button>
                )}
            />
            {image && <Box sx={{ mt: 4 }}>{image}</Box>}
        </Box>
    );
};
