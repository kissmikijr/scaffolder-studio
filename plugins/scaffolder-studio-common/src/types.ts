/***/
/**
 * Common functionalities for the scaffolder-studio plugin.
 *
 * @packageDocumentation
 */

import type { Edge, Node } from '@xyflow/react';

export type PropertyNodeData = {
  name: string;
  variableType: string;
  required?: boolean;
  onChange: (
    nodeId: string,
    data: Pick<
      PropertyNodeData,
      | 'name'
      | 'variableType'
      | 'required'
      | 'description'
      | 'ui:field'
      | 'ui:options'
      | 'pattern'
      | 'enum'
      | 'title'
    >,
  ) => void;
  description?: string;
  'ui:field'?: string;
  'ui:options'?: string;
  pattern?: string;
  enum?: string[];
  title?: string;
};

export type StepNodeData = {
  type: 'step';
  actionId?: string;
  stepId?: string;
  name?: string;
  schema?: Record<string, unknown>;
  formData: Record<string, unknown>;
  if: string;
  description?: string;
  onChange: (
    nodeId: string,
    data: Pick<
      StepNodeData,
      'name' | 'stepId' | 'if' | 'formData' | 'schema' | 'description'
    >,
  ) => void;
};

// Union type for all node data types
export type AllNodeData =
  | StepNodeData
  | TemplateNodeData
  | ParametersNodeData
  | OutputNodeData
  | PropertyNodeData
  | PrefabInstanceNodeData;

// Specific node types with their data
export type StepNode = Node<StepNodeData> & { type: 'step' };
export type TemplateNode = Node<TemplateNodeData> & { type: 'template' };
export type ParametersNode = Node<ParametersNodeData> & { type: 'parameters' };
export type OutputNode = Node<OutputNodeData> & { type: 'templateOutput' };
export type PropertyNode = Node<PropertyNodeData> & { type: 'property' };
export type PrefabNode = Node<PrefabInstanceNodeData> & { type: 'prefab' };

export type TypedNode =
  | StepNode
  | TemplateNode
  | ParametersNode
  | OutputNode
  | PropertyNode
  | PrefabNode;

// Type guard functions
export const isStepNode = (node: Node<AllNodeData>): node is StepNode => {
  return node.type === 'step';
};

export const isTemplateNode = (
  node: Node<AllNodeData>,
): node is TemplateNode => {
  return node.type === 'template';
};

export const isParametersNode = (
  node: Node<AllNodeData>,
): node is ParametersNode => {
  return node.type === 'parameters';
};

export const isOutputNode = (node: Node<AllNodeData>): node is OutputNode => {
  return node.type === 'templateOutput';
};

export const isPropertyNode = (
  node: Node<AllNodeData>,
): node is PropertyNode => {
  return node.type === 'property';
};

export const isPrefabNode = (node: Node<AllNodeData>): node is PrefabNode => {
  return node.type === 'prefab';
};

export interface StepFormDrawerProps {
  availableActions: ScaffolderAction[];
  node?: Node<AllNodeData>;
  children?: React.ReactNode;
}

export type CustomNodeType =
  | 'template'
  | 'parameters'
  | 'step'
  | 'templateOutput'
  | 'property';

export type OutputNodeData = {
  links?: {
    title: string;
    url?: string;
    icon?: string;
    entityRef?: string;
  }[];
  text?: {
    title: string;
    content: string;
  }[];
  onChange: (nodeId: string, data: OutputNodeData) => void;
};

export type ParametersNodeData = {
  type: 'parameters';
  title: string;
  parameters: {
    name: string;
    type: string;
    required?: boolean;
  }[];
  onChange: (nodeId: string, parameters: Record<string, unknown>) => void;
  onAddProperty?: (parentId: string) => void;
};

export type TemplateNodeData = {
  nodeType: 'template';
  name: string;
  owner: string;
  description: string;
  spec: { type: string };
  annotations: Record<string, string>;
  onChange: (
    nodeId: string,
    data: Pick<
      TemplateNodeData,
      'name' | 'owner' | 'description' | 'spec' | 'annotations'
    >,
  ) => void;
};

export type PrefabQueenNodeData = {
  id: string;
  title: string;
  description: string;
  owner: string;
  created_at: string;
  updated_at: string;
  node?: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: AllNodeData;
  };
};

export type PrefabNodeData = {
  type: 'prefab';
  id: string;
};

export type VisualTemplateProject = {
  id: string;
  metadata: {
    name: string;
    description?: string;
  };
  nodes: Node<
    ParametersNodeData | TemplateNodeData | OutputNodeData | StepNodeData
  >[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  updated: string;
  owner: string;
  deleted: boolean;
  published_at: string | null;
  dryRunInputs?: Record<string, unknown>;
};

export interface Parameter {
  name: string;
  type: string;
  required?: boolean;
}

export type ScaffolderActionPatch = {
  id: string;
  patch: {
    input: {
      type: string;
      properties: Record<string, unknown>;
    };
    output: {
      type: string;
      properties: Record<string, unknown>;
    };
  };
};

export type PrefabInstanceNodeData = {
  type: 'prefab';
  id: string;
  version?: string;
  refType?: string;
};

export interface VisualTemplateProjectStore {
  get(id: string): Promise<VisualTemplateProject>;
  list(options?: {
    trashed?: boolean;
    owner?: string;
  }): Promise<VisualTemplateProject[]>;
  set(data: Omit<VisualTemplateProject, 'deleted'>): Promise<void>;
  delete(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<void>;
  hardDelete(ids: string[]): Promise<void>;
  getDryRunInputs(id: string): Promise<Record<string, unknown> | null>;
  setDryRunInputs(id: string, inputs: Record<string, unknown>): Promise<void>;
}

export type PublishedTemplate = {
  id: string;
  visual_template_id: string;
  scaffolder_template: string;
  published_at: string;
  published_by: string;
  version: number;
  unpublished: boolean;
};

export interface PublishedTemplatesStore {
  list(): Promise<PublishedTemplate[]>;
  publish(options: {
    visualTemplateId: string;
    publishedBy: string;
    scaffolderTemplate: string;
  }): Promise<void>;
  unpublish(id: string): Promise<void>;
}
export enum SCAFFOLDER_STUDIO_EVENTS {
  TEMPLATE_PUBLISHED = 'scaffolder-studio.template.published',
  TEMPLATE_UNPUBLISHED = 'scaffolder-studio.template.unpublished',
}
export type ScaffolderAction = {
  id: string;
  description?: string;
  schema?: {
    input?: {
      type: string;
      properties: Record<string, unknown>;
    };
    output?: {
      type: string;
      properties: Record<string, unknown>;
    };
  };
};

export type Prefab = {
  id?: string;
  prefabId?: string;
  node: Node<AllNodeData>;
  title?: string;
  description?: string;
  owner?: string;
  version?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  is_published?: boolean;
};

// For creating new prefabs (no ID, timestamps, etc.)
export type PrefabInput = {
  node: Node<AllNodeData>;
  title: string;
  description?: string;
  owner?: string;
};

// For prefabs fetched from storage (always has ID and timestamps)
export type StoredPrefab = Required<
  Pick<Prefab, 'id' | 'created_at' | 'updated_at'>
> &
  Omit<Prefab, 'id' | 'created_at' | 'updated_at'>;
