import { useMemo } from 'react';
import { Box, styled, useTheme } from '@mui/material';
import { getColorForType } from '../../utils/colorUtils';
import {
    findAllTokens,
    parseTokenContent,
    createParameterTypeMap,
    createOutputTypeMap,
    TokenMatch,
} from '../../utils/tokenParser'


const Token = styled('span')<{ color: string }>(({ color }) => ({
    backgroundColor: color,
    borderRadius: '4px',
    padding: '0px 4px',
    margin: '0 1px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    color: '#000', // Text inside tokens is usually dark for contrast with pastel colors
    fontSize: 'inherit',
    lineHeight: 'inherit',
}));

interface ExpressionViewerProps {
    value: string;
    parameters?: Array<{ name: string; type: string }>;
    outputs?: Array<{ id: string; outputs: any }>;
}

export const ExpressionViewer = ({
    value,
    parameters = [],
    outputs = [],
}: ExpressionViewerProps) => {

    const outputTypeMap = useMemo(
        () => createOutputTypeMap(outputs),
        [outputs]
    );
    const parameterTypeMap = useMemo(
        () => createParameterTypeMap(parameters),
        [parameters]
    );
    const theme = useTheme();

    if (!value) return null;

    const parts = [];
    let lastIndex = 0;

    // We need to loop through matches
    const tokens = findAllTokens(value)

    tokens.forEach((token: TokenMatch) => {
        const { fullMatch, index } = token

        // Push preceding text if any
        if (index > lastIndex) {
            parts.push(
                <span key={`text-${lastIndex}`}>
                    {value.slice(lastIndex, index)}
                </span>
            );
        }

        // Determine token type and color
        const parsed = parseTokenContent(token.content);
        let display = token.content
        let color = '#F1FA8C'; // Default yellow-ish

        if (parsed) {
            display = parsed.display;
            if (parsed.type === 'step' && parsed.stepId && parsed.outputName) {
                const baseName = `${parsed.stepId}.${parsed.outputName}`;
                const outputType = outputTypeMap.get(baseName);
                color = getColorForType(outputType);
            } else if (parsed.type === 'parameter' && parsed.paramName) {
                const paramType = parameterTypeMap.get(parsed.paramName);
                color = getColorForType(paramType);
            }
        }

        parts.push(
            <Token key={`token-${index}`} color={color}>
                {display}
            </Token>
        );

        lastIndex = index + fullMatch.length;
    });

    // Push remaining text
    if (lastIndex < value.length) {
        parts.push(
            <span key={`text-${lastIndex}`}>
                {value.slice(lastIndex)}
            </span>
        );
    }

    return (
        <Box
            sx={{
                fontFamily: 'Monospace',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'inline-flex',
                alignItems: 'center',
                color: theme.palette.text.primary,
            }}
        >
            {parts}
        </Box>
    );
};
