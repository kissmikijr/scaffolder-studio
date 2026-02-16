// Shared token parsing logic for expression tokens
// Used by both InitialEditorStatePlugin and ExpressionViewer

// Regex patterns for unwrapped tokens
const PARAM_REGEX = /parameters\.([a-zA-Z0-9_]+)(\s*\|[^|${}]+)?/g;
const STEP_REGEX = /steps\['([^']+)'\]\.output\['([^']+)'\](\s*\|[^|${}]+)?/g;

// Regex for extracting parts from matched tokens
export const STEP_ID_REGEX = /steps\['(.*)'\]\.output\['(.*)'\]/;
export const PARAMETER_ID_REGEX = /parameters\.([a-zA-Z0-9_]+)/;

export interface TokenMatch {
    index: number;
    length: number;
    fullMatch: string;
    content: string;
}

export interface ParsedToken {
    type: 'parameter' | 'step';
    display: string;
    fullExpression: string;
    paramName?: string;
    stepId?: string;
    outputName?: string;
    filterPart: string;
}

/**
 * Find all token matches in a string (parameters and step outputs)
 * Supports optional filter syntax (e.g., parameters.foo | trim)
 */
export const findAllTokens = (text: string): TokenMatch[] => {
    const tokens: TokenMatch[] = [];

    // Find parameter tokens
    let match = PARAM_REGEX.exec(text);
    while (match !== null) {
        const filterPart = match[2] || '';
        tokens.push({
            index: match.index,
            length: match[0].length,
            fullMatch: match[0],
            content: `parameters.${match[1]}${filterPart}`,
        });
        match = PARAM_REGEX.exec(text);
    }
    PARAM_REGEX.lastIndex = 0;

    // Find step output tokens
    match = STEP_REGEX.exec(text);
    while (match !== null) {
        // Capture current match in scope
        const currentMatch = match;
        // Check if this position is already covered by another token
        const alreadyCovered = tokens.some(
            t => currentMatch.index >= t.index && currentMatch.index < t.index + t.length
        );
        if (!alreadyCovered) {
            const filterPart = currentMatch[3] || '';
            tokens.push({
                index: currentMatch.index,
                length: currentMatch[0].length,
                fullMatch: currentMatch[0],
                content: `steps['${currentMatch[1]}'].output['${currentMatch[2]}']${filterPart}`,
            });
        }
        match = STEP_REGEX.exec(text);
    }
    STEP_REGEX.lastIndex = 0;

    // Sort by position in string
    tokens.sort((a, b) => a.index - b.index);

    return tokens;
};

/**
 * Parse a token match into structured data with display name and type info
 */
export const parseTokenContent = (tokenContent: string): ParsedToken | null => {
    // Check if there's a filter (pipe character) in the token
    const filterMatch = tokenContent.match(/\|(.+)$/);
    const filterPart = filterMatch ? ` | ${filterMatch[1].trim()}` : '';

    // Clean content for identification (remove filter part)
    const cleanContent = filterMatch
        ? tokenContent.substring(0, filterMatch.index).trim()
        : tokenContent;

    if (cleanContent.startsWith('steps')) {
        const stepMatch = STEP_ID_REGEX.exec(cleanContent);
        if (stepMatch) {
            const stepId = stepMatch[1];
            const outputName = stepMatch[2];
            return {
                type: 'step',
                display: `${stepId}.${outputName}${filterPart}`,
                fullExpression: tokenContent,
                stepId,
                outputName,
                filterPart,
            };
        }
    } else if (cleanContent.startsWith('parameters')) {
        const paramMatch = PARAMETER_ID_REGEX.exec(cleanContent);
        if (paramMatch) {
            const paramName = paramMatch[1];
            return {
                type: 'parameter',
                display: `${paramName}${filterPart}`,
                fullExpression: tokenContent,
                paramName,
                filterPart,
            };
        }
    }

    return null;
};

/**
 * Helper to create a lookup map for parameter types
 */
export const createParameterTypeMap = (
    parameters: Array<{ name: string; type: string }>
): Map<string, string> => {
    const map = new Map<string, string>();
    parameters.forEach(param => {
        map.set(param.name, param.type);
    });
    return map;
};

/**
 * Helper to create a lookup map for output types
 */
export const createOutputTypeMap = (
    outputs: Array<{ id: string; outputs: any }>
): Map<string, string> => {
    const map = new Map<string, string>();
    outputs.forEach(output => {
        if (output.outputs) {
            Object.entries(output.outputs).forEach(([key, value]: [string, any]) => {
                const fullKey = `${output.id}.${key}`;
                map.set(fullKey, value?.type);
            });
        }
    });
    return map;
};
