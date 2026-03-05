import TemplateNode from './template/TemplateNode';
import ParametersNode from './parameters/ParametersNode';
import StepNode from './step/StepNode';
import OutputNode from './output/OutputNode';
import PropertyNode from './property/PropertyNode';
import PrefabQueenNode from './prefab/PrefabQueenNode';
import PrefabInstanceNode from './prefab/PrefabInstanceNode';

export const createNodeTypes = () => ({
  template: TemplateNode,
  parameters: ParametersNode,
  step: StepNode,
  templateOutput: OutputNode,
  property: PropertyNode,
  prefab: PrefabInstanceNode,
  prefabQueen: PrefabQueenNode,
});

export const nodeTypes = createNodeTypes();
