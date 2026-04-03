const FILTER_CHAIN_REGEX = String.raw`(?:\s*\|\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\([^()]*\))?)*`;
const REFERENCE_REGEX = new RegExp(
  String.raw`(?:\${{\s*)?(parameters\.([a-zA-Z0-9_]+)|steps(?:\['([^']+)'\]|\.([a-zA-Z0-9_-]+))\.output(?:\['([^']+)'\]|\.([a-zA-Z0-9_-]+)))(` +
    FILTER_CHAIN_REGEX +
    String.raw`)(?:\s*}})?`,
  'g',
);

export type ParsedReferenceToken = {
  type: 'parameter' | 'step';
  fullExpression: string;
  paramName?: string;
  stepId?: string;
  outputName?: string;
  filterPart: string;
};

export const findReferenceTokens = (value: string): ParsedReferenceToken[] => {
  const matches: ParsedReferenceToken[] = [];
  let match = REFERENCE_REGEX.exec(value);

  while (match !== null) {
    const filterPart = match[7] || '';
    const parameterName = match[2];
    const bracketStepId = match[3];
    const dotStepId = match[4];
    const bracketOutputName = match[5];
    const dotOutputName = match[6];

    if (parameterName) {
      matches.push({
        type: 'parameter',
        fullExpression: match[0],
        paramName: parameterName,
        filterPart,
      });
    } else {
      matches.push({
        type: 'step',
        fullExpression: match[0],
        stepId: bracketStepId || dotStepId,
        outputName: bracketOutputName || dotOutputName,
        filterPart,
      });
    }

    match = REFERENCE_REGEX.exec(value);
  }

  REFERENCE_REGEX.lastIndex = 0;
  return matches;
};
