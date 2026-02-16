import { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { TemplateGraphIcon } from './TemplateGraphIcon';

type EmptyStateProps = {
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    image?: ReactNode;
    missing?: "field" | "content" | "data";
};

export const EmptyState = ({
    title,
    description,
    action,
    image,
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
                minHeight: '400px',
            }}
        >
            {image ? (
                <Box sx={{ mb: 2 }}>{image}</Box>
            ) : (
                <Box sx={{ mb: 2 }}>
                    <TemplateGraphIcon />
                </Box>
            )}

            <Typography variant="h6" gutterBottom color="text.primary">
                {title}
            </Typography>

            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mb: action ? 3 : 0 }}>
                    {description}
                </Typography>
            )}

            {action && (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </Box>
    );
};
