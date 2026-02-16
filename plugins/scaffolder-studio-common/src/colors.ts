export enum NodeTypeColors {
  step = '#ffb86c',
  templateOutput = '#4ae1fc',
  template = '#bd93f9',
  parameters = '#4fffe0',
  unknown = '#6272a4',
}

export const getPropertyBackgroundColor = (variableType: string) => {
  switch (variableType) {
    case 'string':
      return '#F1FA8C';
    case 'number':
      return '#818CF8';
    case 'boolean':
      return '#8BE9FD';
    default:
      return '#818CF8';
  }
};
