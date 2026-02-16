import { Box, useTheme } from '@mui/material';

export const TemplateGraphIcon = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Constants for node styling
    const strokeWidth = 2;
    const edgeColor = isDark ? '#555' : '#ccc';
    const borderRadius = 6;

    // Explicit colors based on the user image (Dracula-ish theme)
    const colors = {
        templateHeader: '#bd93f9', // Purple
        templateBody: '#44475a',   // Dark Grey/Blue
        output: '#8be9fd',         // Cyan
        stepHeader: '#ffb86c',     // Orange
        stepBody: '#44475a',       // Dark Grey/Property
        paramsBorder: '#50fa7b',   // Green/Teal (using distinct color for params group)
        paramsTitle: '#50fa7b',
        propertyHeader: '#f1fa8c', // Yellow
        propertyBody: '#44475a',
    };

    // Helper for header path with top rounded corners
    const getHeaderPath = (x: number, y: number, width: number, height: number, radius: number) => {
        return `M ${x} ${y + radius} 
                A ${radius} ${radius} 0 0 1 ${x + radius} ${y} 
                L ${x + width - radius} ${y} 
                A ${radius} ${radius} 0 0 1 ${x + width} ${y + radius} 
                L ${x + width} ${y + height} 
                L ${x} ${y + height} 
                Z`;
    };

    // Helper for body path with bottom rounded corners
    const getBodyPath = (x: number, y: number, width: number, height: number, radius: number) => {
        return `M ${x} ${y} 
                L ${x + width} ${y} 
                L ${x + width} ${y + height - radius} 
                A ${radius} ${radius} 0 0 1 ${x + width - radius} ${y + height} 
                L ${x + radius} ${y + height} 
                A ${radius} ${radius} 0 0 1 ${x} ${y + height - radius} 
                Z`;
    };

    return (
        <Box
            sx={{
                opacity: 0.9,
                display: 'inline-flex',
                '& svg': {
                    display: 'block'
                }
            }}
        >
            <svg
                width="400"
                height="280"
                viewBox="0 0 400 280"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: 'auto', maxWidth: '400px' }}
            >
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="0" dy="3" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Edges */}
                {/* Output (Left, Y=67.5) -> Template (Center, Y=80) */}
                <path d="M 110 67.5 C 130 67.5, 130 80, 150 80" fill="none" stroke={edgeColor} strokeWidth={strokeWidth} />

                {/* Template (Center, Y=80) -> Step (Right, Y=67.5) */}
                <path d="M 230 80 C 250 80, 250 67.5, 270 67.5" fill="none" stroke={edgeColor} strokeWidth={strokeWidth} />

                {/* Template (Center) -> Parameters (Bottom) */}
                <path d="M 190 105 L 190 160" fill="none" stroke={edgeColor} strokeWidth={strokeWidth} />


                {/* NODES */}

                {/* 1. Output Node (Far Left) - Cyan Block */}
                <g filter="url(#shadow)">
                    <rect x="30" y="55" width="80" height="25" rx={borderRadius} fill={colors.output} stroke={colors.output} strokeWidth={strokeWidth} />
                    {/* Placeholder Text - Centered */}
                    <rect x="45" y="63.5" width="50" height="4" rx="2" fill="#282a36" opacity="0.6" />
                </g>

                {/* 2. Template Node (Center) - Purple Header, Grey Body */}
                <g filter="url(#shadow)">
                    {/* Header */}
                    <path d={getHeaderPath(150, 55, 80, 16, borderRadius)} fill={colors.templateHeader} />
                    <path d={getHeaderPath(150, 55, 80, 16, borderRadius)} fill="none" stroke={colors.templateHeader} strokeWidth={strokeWidth} />

                    {/* Body */}
                    <path d={getBodyPath(150, 71, 80, 34, borderRadius)} fill={colors.templateBody} />
                    <rect x="150" y="55" width="80" height="50" rx={borderRadius} fill="none" stroke={colors.templateBody} strokeWidth={strokeWidth} />

                    {/* Header Title Line */}
                    <rect x="170" y="60" width="40" height="6" rx="2" fill="#282a36" opacity="0.7" />

                    {/* Body Lines */}
                    <rect x="158" y="78" width="20" height="3" rx="1.5" fill="#f8f8f2" opacity="0.5" />
                    <rect x="158" y="85" width="50" height="3" rx="1.5" fill="#f8f8f2" opacity="0.3" />
                    <rect x="158" y="92" width="40" height="3" rx="1.5" fill="#f8f8f2" opacity="0.3" />
                </g>

                {/* 3. Step Node (Top Right) - Orange Header */}
                <g filter="url(#shadow)">
                    {/* Header */}
                    <path d={getHeaderPath(270, 55, 60, 12, borderRadius)} fill={colors.stepHeader} />
                    {/* Body */}
                    <path d={getBodyPath(270, 67, 60, 13, borderRadius)} fill={colors.stepBody} />

                    {/* Border Outline */}
                    <rect x="270" y="55" width="60" height="25" rx={borderRadius} fill="none" stroke={colors.stepHeader} strokeWidth={strokeWidth} />

                    {/* Small lines */}
                    <rect x="275" y="59" width="20" height="4" rx="2" fill="#282a36" opacity="0.6" />
                </g>

                {/* 4. Parameters Group (Bottom) - Dashed Border Container */}
                <g>
                    {/* Container Outline */}
                    <rect x="140" y="160" width="120" height="80" rx={8} fill="none" stroke={colors.paramsTitle} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />

                    {/* Title Label */}
                    <rect x="145" y="152" width="50" height="16" rx="4" fill={colors.paramsTitle} />
                    <rect x="150" y="157" width="40" height="6" rx="2" fill="#282a36" opacity="0.7" />

                    {/* 5. Property Node (Inside) - Yellow Header */}
                    <g filter="url(#shadow)">
                        <rect x="160" y="180" width="80" height="40" rx={borderRadius} fill="none" stroke={colors.propertyBody} strokeWidth={strokeWidth} />
                        {/* Header */}
                        <path d={getHeaderPath(160, 180, 80, 12, borderRadius)} fill={colors.propertyHeader} />
                        {/* Body */}
                        <path d={getBodyPath(160, 192, 80, 28, borderRadius)} fill={colors.propertyBody} />

                        {/* Text Lines */}
                        <rect x="170" y="184" width="30" height="4" rx="2" fill="#282a36" opacity="0.8" /> {/* Title */}
                        <rect x="168" y="200" width="20" height="10" rx="5" fill="none" stroke="#f8f8f2" strokeWidth="1" opacity="0.5" /> {/* Pill */}
                        <rect x="172" y="203" width="12" height="4" rx="2" fill="#f8f8f2" opacity="0.5" /> {/* Pill Text */}
                    </g>
                </g>

            </svg>
        </Box>
    );
};
