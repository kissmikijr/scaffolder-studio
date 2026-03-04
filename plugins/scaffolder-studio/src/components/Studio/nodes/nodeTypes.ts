import { createElement } from 'react';
import TemplateNode from './template/TemplateNode';
import ParametersNode from './parameters/ParametersNode';
import StepNode from './step/StepNode';
import OutputNode from './output/OutputNode';
import PropertyNode from './property/PropertyNode';
import PrefabQueenNode from './prefab/PrefabQueenNode';
import PrefabInstanceNode from './prefab/PrefabInstanceNode';

export type NodeTypesOptions = {
  relationshipMode?: boolean;
  shouldForceExpandStep?: (stepNodeId: string) => boolean;
};

export const createNodeTypes = ({
  relationshipMode = false,
  shouldForceExpandStep = () => false,
}: NodeTypesOptions = {}) => {
  const StepNodeRenderer = (props: unknown) =>
    createElement(StepNode as any, {
      ...(props as any),
      relationshipMode,
      forceIoExpanded:
        relationshipMode && shouldForceExpandStep((props as any).id),
    });

  return {
    template: TemplateNode,
    parameters: ParametersNode,
    step: StepNodeRenderer,
    templateOutput: OutputNode,
    property: PropertyNode,
    prefab: PrefabInstanceNode,
    prefabQueen: PrefabQueenNode,
  };
};

export const nodeTypes = createNodeTypes();
