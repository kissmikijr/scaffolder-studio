import { JsonObject } from '@backstage/types';
import { Prefab } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import type { Node } from '@xyflow/react';

export type VisualTemplateProject = {
  id: string;
  owner: string;
  metadata?: JsonObject;
  nodes: JsonObject[];
  edges: JsonObject[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  updated: string;
  deleted: boolean;
  published_at?: string;
  published_version?: number;
  dryRunInputs?: Record<string, unknown>;
};

export type RawDatabaseVisualTemplateRow = {
  id: string;
  user_entity_ref?: string;
  owner: string;
  metadata: JsonObject;
  viewport: JsonObject;
  nodes: string;
  edges: string;
  updated: string;
  deleted: boolean;
  dry_run_inputs?: string;
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
}

export type PublishedTemplate = {
  id: string;
  visual_template_id: string;
  scaffolder_template: string;
  published_at: string;
  published_by: string;
  version: number;
  unpublished: boolean;
  unpublished_at: string | null;
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

export type RawDatabasePrefab = {
  id: string;
  node: string;
  title: string;
  description: string;
  owner: string;
  created_at: string;
  updated_at: string;
};

export type RawDatabasePrefabRow = RawDatabasePrefab & {
  deleted: boolean;
};

export interface PrefabStore {
  get({ id }: { id: string }): Promise<Prefab>;
  list(): Promise<Prefab[]>;
  update({
    id,
    node,
    title,
    description,
  }: {
    id: string;
    node: Node;
    title: string;
    description: string;
  }): Promise<void>;
  create({
    node,
    owner,
  }: {
    node: Node;
    owner: string;
  }): Promise<{ id: string }>;
  delete({ id }: { id: string }): Promise<void>;
}

export type RawDatabasePrefabLibrary = {
  id: string;
  prefab_id: string;
  node: string;
  title: string;
  description: string;
  owner: string;
  version: string;
  created_at: string;
  updated_at: string;
};

export type RawDatabasePrefabLibraryRow = RawDatabasePrefabLibrary & {
  deleted: boolean;
};
export interface PrefabLibraryStore {
  get({ id, version }: { id: string; version?: string }): Promise<Prefab>;
  list(): Promise<Prefab[]>;
  create({
    prefabId,
    owner,
  }: {
    prefabId: string;
    owner: string;
  }): Promise<{ id: string }>;
  delete({ id }: { id: string }): Promise<void>;
}
