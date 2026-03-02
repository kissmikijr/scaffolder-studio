import CustomStepEdge from './CustomStepEdge';
import DependencyEdge from './DependencyEdge';

export const edgeTypes = {
  'custom-step': CustomStepEdge,
  dependency: DependencyEdge,
};

export { defaultEdgeOptions } from './edgeTypes';
