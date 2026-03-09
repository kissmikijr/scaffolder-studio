import { createContext, useContext } from 'react';
import { TemplateOutgoingSlots } from './utils/connectionLimits';

export type GraphPerformanceContextValue = {
  relationshipMode: boolean;
  isStepRelated: (stepNodeId: string) => boolean;
  getIncomingConnectionCount: (nodeId: string) => number;
  getOutgoingConnectionCount: (nodeId: string) => number;
  getRelationshipHandleColor: (
    nodeId: string,
    handleId: string,
    direction: 'source' | 'target',
  ) => string | undefined;
  getTemplateOutgoingSlots: (templateId: string) => TemplateOutgoingSlots;
  getParameterType: (parameterName: string) => string | undefined;
};

const EMPTY_TEMPLATE_SLOTS: TemplateOutgoingSlots = {
  hasStep: false,
  hasParameters: false,
  hasOutput: false,
  hasAny: true,
};

const EMPTY_GRAPH_PERFORMANCE_CONTEXT: GraphPerformanceContextValue = {
  relationshipMode: false,
  isStepRelated: () => false,
  getIncomingConnectionCount: () => 0,
  getOutgoingConnectionCount: () => 0,
  getRelationshipHandleColor: () => undefined,
  getTemplateOutgoingSlots: () => EMPTY_TEMPLATE_SLOTS,
  getParameterType: () => undefined,
};

export const GraphPerformanceContext =
  createContext<GraphPerformanceContextValue>(EMPTY_GRAPH_PERFORMANCE_CONTEXT);

export const useGraphPerformanceContext = (): GraphPerformanceContextValue =>
  useContext(GraphPerformanceContext);
