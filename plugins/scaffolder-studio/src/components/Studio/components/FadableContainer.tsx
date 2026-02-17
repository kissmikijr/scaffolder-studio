import React, { useRef, useState, useLayoutEffect } from 'react';
import { Box } from '@mui/material';

export const FadableContainer = ({ children, sx, ...props }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useLayoutEffect(() => {
        if (ref.current) {
            setIsOverflowing(ref.current.scrollWidth > ref.current.clientWidth);
        }
    });

    return (
        <Box
            ref={ref}
            sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
                WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
                ...sx
            }}
            {...props}
        >
            {children}
        </Box>
    );
};
