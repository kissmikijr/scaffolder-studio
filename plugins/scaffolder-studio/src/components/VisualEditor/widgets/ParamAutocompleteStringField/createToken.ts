import { TextNode } from 'lexical';

import { $createExpressionTokenNode } from './ExpressionTokenNode';

export const createToken = ({
  display,
  fullExpression,
  color,
}: {
  display: string;
  fullExpression: string;
  color: string;
}): TextNode => {
  const textNode = $createExpressionTokenNode(display, fullExpression, color);

  return textNode;
};
