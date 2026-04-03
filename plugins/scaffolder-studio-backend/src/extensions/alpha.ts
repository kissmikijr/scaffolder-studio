import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { LintRuleExtension, PublisherExtension } from './types';

export interface ScaffolderStudioPublisherExtensionPoint {
  addPublisher(publisher: PublisherExtension): void;
}

export const scaffolderStudioPublisherExtensionPoint =
  createExtensionPoint<ScaffolderStudioPublisherExtensionPoint>({
    id: 'scaffolder-studio/publisher',
  });

export interface ScaffolderStudioLinterExtensionPoint {
  addRule(rule: LintRuleExtension['rule']): void;
  addRules(rules: LintRuleExtension['rule'][]): void;
}

export const scaffolderStudioLinterExtensionPoint =
  createExtensionPoint<ScaffolderStudioLinterExtensionPoint>({
    id: 'scaffolder-studio/linter',
  });
