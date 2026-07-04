import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';

type JsonSchemaProperty = {
  title?: string;
  description?: string;
};

type SecretJsonSchema = {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

export type SecretSourceType =
  | 'template-schema'
  | 'template-reference'
  | 'action-schema';

export type SecretFieldSource = {
  type: SecretSourceType;
  stepId?: string;
  stepName?: string;
  actionId?: string;
};

export type SecretField = {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  sources: SecretFieldSource[];
};

const TEMPLATE_EXPRESSION_PATTERN = /\${{\s*([^}]+?)\s*}}/g;
const DOT_SECRET_PATTERN = /(?:^|[^\w])secrets\.([A-Za-z_][\w.-]*)/g;
const BRACKET_SECRET_PATTERN = /secrets\[['"]([^'"]+)['"]\]/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const formatSecretLabel = (key: string) => {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const extractSchema = (value: unknown): SecretJsonSchema | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const schema = isRecord(value.schema) ? value.schema : value;
  if (!isRecord(schema.properties)) {
    return undefined;
  }

  return {
    properties: schema.properties as Record<string, JsonSchemaProperty>,
    required: Array.isArray(schema.required)
      ? schema.required.filter(
          (item): item is string => typeof item === 'string',
        )
      : undefined,
  };
};

const addSecretField = (
  fields: Map<string, SecretField>,
  key: string,
  source: SecretFieldSource,
  options: {
    required?: boolean;
    title?: string;
    description?: string;
  } = {},
) => {
  const existing = fields.get(key);
  const nextSource = { ...source };

  if (existing) {
    existing.required = existing.required || Boolean(options.required);
    existing.description = existing.description ?? options.description;
    existing.sources.push(nextSource);
    return;
  }

  fields.set(key, {
    key,
    label: options.title || formatSecretLabel(key),
    description: options.description,
    required: Boolean(options.required),
    sources: [nextSource],
  });
};

const addSchemaSecrets = ({
  fields,
  schema,
  source,
}: {
  fields: Map<string, SecretField>;
  schema: unknown;
  source: SecretFieldSource;
}) => {
  const secretSchema = extractSchema(schema);
  if (!secretSchema?.properties) {
    return;
  }

  const required = new Set(secretSchema.required ?? []);
  for (const [key, property] of Object.entries(secretSchema.properties)) {
    addSecretField(fields, key, source, {
      required: required.has(key),
      title: property?.title,
      description: property?.description,
    });
  }
};

const extractSecretRefsFromString = (value: string) => {
  const refs = new Set<string>();

  for (const expression of value.matchAll(TEMPLATE_EXPRESSION_PATTERN)) {
    const body = expression[1] ?? '';

    for (const match of body.matchAll(DOT_SECRET_PATTERN)) {
      if (match[1]) {
        refs.add(match[1]);
      }
    }

    for (const match of body.matchAll(BRACKET_SECRET_PATTERN)) {
      if (match[1]) {
        refs.add(match[1]);
      }
    }
  }

  return refs;
};

const collectSecretRefs = (value: unknown, refs = new Set<string>()) => {
  if (typeof value === 'string') {
    for (const ref of extractSecretRefsFromString(value)) {
      refs.add(ref);
    }
    return refs;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectSecretRefs(item, refs);
    }
    return refs;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      collectSecretRefs(item, refs);
    }
  }

  return refs;
};

const getTemplateSpec = (template: unknown) =>
  isRecord(template) && isRecord(template.spec) ? template.spec : undefined;

export const collectDryRunSecretFields = ({
  template,
  actions,
}: {
  template: unknown;
  actions: ScaffolderAction[];
}) => {
  const fields = new Map<string, SecretField>();
  const spec = getTemplateSpec(template);

  addSchemaSecrets({
    fields,
    schema: spec?.secrets,
    source: { type: 'template-schema' },
  });

  const actionsById = new Map(actions.map(action => [action.id, action]));
  const steps = Array.isArray(spec?.steps) ? spec.steps : [];

  for (const step of steps) {
    if (!isRecord(step)) {
      continue;
    }

    const stepId = typeof step.id === 'string' ? step.id : undefined;
    const stepName = typeof step.name === 'string' ? step.name : undefined;
    const actionId = typeof step.action === 'string' ? step.action : undefined;
    const action = actionId ? actionsById.get(actionId) : undefined;

    addSchemaSecrets({
      fields,
      schema: action?.schema?.secrets,
      source: {
        type: 'action-schema',
        stepId,
        stepName,
        actionId,
      },
    });

    for (const ref of collectSecretRefs(step)) {
      addSecretField(
        fields,
        ref,
        {
          type: 'template-reference',
          stepId,
          stepName,
          actionId,
        },
        { required: true },
      );
    }
  }

  if (spec?.output) {
    for (const ref of collectSecretRefs(spec.output)) {
      addSecretField(
        fields,
        ref,
        { type: 'template-reference' },
        { required: true },
      );
    }
  }

  return [...fields.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const getMissingRequiredSecrets = (
  fields: SecretField[],
  values: Record<string, string>,
) =>
  fields
    .filter(field => field.required && !values[field.key]?.trim())
    .map(field => field.key);

export const buildSecretsPayload = (
  fields: SecretField[],
  values: Record<string, string>,
) => {
  return fields.reduce<Record<string, string>>((acc, field) => {
    const value = values[field.key];
    if (value?.trim()) {
      acc[field.key] = value;
    }
    return acc;
  }, {});
};
