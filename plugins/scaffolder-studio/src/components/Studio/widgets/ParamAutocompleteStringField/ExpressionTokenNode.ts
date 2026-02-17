import {
  $getState,
  $getStateChange,
  $setState,
  $create,
  createState,
  TextNode,
  type EditorConfig,
} from 'lexical';

const DEFAULT_COLOR = '#000000';
const colorState = createState('color', {
  parse: (value: any) => (typeof value === 'string' ? value : DEFAULT_COLOR),
});
const fullExpressionState = createState('fullExpression', {
  parse: (value: any) => (typeof value === 'string' ? value : ''),
});

export class ExpressionTokenNode extends TextNode {
  $config() {
    return this.config('expression-token-node', {
      extends: TextNode,
      stateConfigs: [
        { flat: true, stateConfig: colorState },
        { flat: true, stateConfig: fullExpressionState },
      ],
    });
  }
  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.color = `black;`;
    element.style.borderRadius = `4px`;
    element.style.backgroundColor = $getState(this, colorState);
    element.style.padding = '0px 1px';
    element.style.borderRadius = '4px';
    element.style.color = 'black';

    return element;
  }
  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);

    const colorChange = $getStateChange(this, prevNode, colorState);
    if (colorChange !== null) {
      dom.style.backgroundColor = colorChange[0];
    }

    return isUpdated;
  }
  getFullExpression(): string {
    return $getState(this, fullExpressionState);
  }
}

export function $createExpressionTokenNode(
  text: string,
  fullExpression: string,
  color: string,
): ExpressionTokenNode {
  const node = $create(ExpressionTokenNode);
  node.setTextContent(text).setMode('token');
  let n = node;
  n = $setState(n, colorState, color);
  n = $setState(n, fullExpressionState, fullExpression);
  return n;
}
