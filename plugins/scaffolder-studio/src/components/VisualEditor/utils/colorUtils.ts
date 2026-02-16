// Color mapping for different variable types (used in PropertyNode and tokens)
export const getBackgroundColor = (variableType: string | undefined): string => {
  if (!variableType) return '#818CF8'; // Default purple for unknown types
  
  switch (variableType.toLowerCase()) {
    case 'string':
      return '#F1FA8C'; // Yellow
    case 'number':
    case 'integer':
      return '#818CF8'; // Purple
    case 'boolean':
      return '#8BE9FD'; // Cyan
    case 'object':
      return '#50FA7B'; // Green
    case 'array':
      return '#FFB86C'; // Orange
    default:
      return '#818CF8'; // Purple for other types
  }
};

// Alias for token colors (same as background colors)
export const getColorForType = getBackgroundColor;
