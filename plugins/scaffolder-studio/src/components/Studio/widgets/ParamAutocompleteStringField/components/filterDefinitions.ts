export type ViewMode = 'main' | 'filters';

export interface SelectedToken {
  display: string;
  baseExpression: string;
  color: string;
}

export interface FilterParam {
  name: string;
  label: string;
  defaultValue: string;
}

export interface NunjucksFilter {
  name: string;
  description: string;
  syntax: string;
  requiresParams: boolean;
  params?: FilterParam[];
  category: 'nunjucks' | 'backstage';
}

export const NUNJUCKS_FILTERS: NunjucksFilter[] = [
  { name: 'abs', description: 'Absolute value', syntax: 'abs', requiresParams: false, category: 'nunjucks' },
  { name: 'center', description: 'Center the value in a field of a given width', syntax: 'center', requiresParams: false, category: 'nunjucks' },
  { name: 'lower', description: 'Convert to lowercase', syntax: 'lower', requiresParams: false, category: 'nunjucks' },
  { name: 'upper', description: 'Convert to uppercase', syntax: 'upper', requiresParams: false, category: 'nunjucks' },
  { name: 'capitalize', description: 'Capitalize first letter', syntax: 'capitalize', requiresParams: false, category: 'nunjucks' },
  { name: 'title', description: 'Capitalize each word', syntax: 'title', requiresParams: false, category: 'nunjucks' },
  { name: 'trim', description: 'Remove leading/trailing whitespace', syntax: 'trim', requiresParams: false, category: 'nunjucks' },
  {
    name: 'replace',
    description: 'Replace text',
    syntax: 'replace("{old}", "{new}")',
    requiresParams: true,
    category: 'nunjucks',
    params: [
      { name: 'old', label: 'Text to replace', defaultValue: '' },
      { name: 'new', label: 'Replace with', defaultValue: '' },
    ]
  },
  {
    name: 'default',
    description: 'Provide default value',
    syntax: 'default("{value}")',
    requiresParams: true,
    category: 'nunjucks',
    params: [
      { name: 'value', label: 'Default value', defaultValue: '' },
    ]
  },
  { name: 'length', description: 'Get length', syntax: 'length', requiresParams: false, category: 'nunjucks' },
  { name: 'first', description: 'Get first item', syntax: 'first', requiresParams: false, category: 'nunjucks' },
  { name: 'last', description: 'Get last item', syntax: 'last', requiresParams: false, category: 'nunjucks' },
  {
    name: 'join',
    description: 'Join array items',
    syntax: 'join("{delimiter}")',
    requiresParams: true,
    category: 'nunjucks',
    params: [
      { name: 'delimiter', label: 'Delimiter', defaultValue: ', ' },
    ]
  },
  { name: 'safe', description: 'Mark as safe HTML', syntax: 'safe', requiresParams: false, category: 'nunjucks' },
  { name: 'escape', description: 'Escape HTML', syntax: 'escape', requiresParams: false, category: 'nunjucks' },
  { name: 'float', description: 'Convert a value into a floating point number. If the conversion fails 0.0 is returned. This default can be overridden by using the first parameter.', syntax: 'float', requiresParams: false, category: 'nunjucks' },
  { name: 'indent', description: 'Indent a string using spaces. Default behaviour is not to indent the first line. Default indentation is 4 spaces.', syntax: 'indent', requiresParams: false, category: 'nunjucks' },
  { name: 'int', description: 'Convert the value into an integer. If the conversion fails 0 is returned.', syntax: 'int', requiresParams: false, category: 'nunjucks' },
  { name: 'reverse', description: 'Reverse a string', syntax: 'reverse', requiresParams: false, category: 'nunjucks' },
  { name: 'round', description: 'Round a number', syntax: 'round', requiresParams: false, category: 'nunjucks' },
  { name: 'string', description: 'Convert a value into a string', syntax: 'string', requiresParams: false, category: 'nunjucks' },
  {
    name: 'truncate', description: 'Truncate a string', syntax: 'truncate', requiresParams: true, category: 'nunjucks', params: [
      { name: 'length', label: 'Length', defaultValue: '25' },
      { name: 'killwords', label: 'Killwords', defaultValue: 'false' },
      { name: 'end', label: 'End', defaultValue: '...' },
    ]
  },
  { name: 'urlencode', description: 'Escape strings for use in URLs, using UTF-8 encoding. Accepts both dictionaries and regular strings as well as pairwise iterables.', syntax: 'urlencode', requiresParams: false, category: 'nunjucks' },
  { name: 'urlize', description: 'Convert URLs in plain text into clickable links:', syntax: 'urlize', requiresParams: false, category: 'nunjucks' },
  { name: 'wordcount', description: 'Count the number of words in a string', syntax: 'wordcount', requiresParams: false, category: 'nunjucks' },
];

export const listItemButtonStyles = {
  width: '100%',
  justifyContent: 'flex-start',
  '&:hover': {
    borderRadius: '8px',
  },
};
