import yaml from 'js-yaml';
import { AllNodeData } from '../types';

/**
 * Filter out non-serializable fields from node data.
 */
export const getSerializableNodeData = (
  data: AllNodeData,
): Record<string, any> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onChange, onAddProperty, ...serializable } = data as any;

  // Clean up undefined values for cleaner YAML
  Object.keys(serializable).forEach(key => {
    if (serializable[key] === undefined) {
      delete serializable[key];
    }
  });

  const { customYamlData, ...finalSerializable } = serializable;

  return {
    serializable: finalSerializable,
    customYamlData: customYamlData || {},
  };
};

/**
 * Serialize node data to YAML string.
 */
export const serializeNodeData = (node: {
  type: string;
  data: AllNodeData;
}): string => {
  const { data, type } = node;
  const { serializable: baseSerializable, customYamlData } =
    getSerializableNodeData(data);
  let serializable = baseSerializable;

  if (type === 'step') {
    const stepData = data as any;
    serializable = {
      id: stepData.stepId,
      name: stepData.name,
      action: stepData.actionId,
      if: stepData.if || undefined,
      input: stepData.formData,
    };
  } else if (type === 'template') {
    const templateData = data as any;
    serializable = {
      name: templateData.name,
      owner: templateData.owner,
      description: templateData.description,
      spec: templateData.spec,
      annotations: templateData.annotations,
    };
  } else if (type === 'property') {
    const propData = data as any;
    serializable = {
      name: propData.name,
      title: propData.title,
      type: propData.variableType,
      description: propData.description,
      'ui:field': propData['ui:field'],
      'ui:options': propData['ui:options'],
      pattern: propData.pattern,
      enum: propData.enum,
    };
  } else if (type === 'templateOutput') {
    const outputData = data as any;
    serializable = {
      links: outputData.links,
      text: outputData.text,
    };
  }

  // Spread custom YAML data back into the text
  serializable = {
    ...serializable,
    ...customYamlData,
  };

  // Clean up undefined values
  Object.keys(serializable).forEach(key => {
    if (
      serializable[key] === undefined ||
      serializable[key] === null ||
      (Array.isArray(serializable[key]) && serializable[key].length === 0)
    ) {
      delete serializable[key];
    }
  });

  return yaml.dump(serializable, {
    noRefs: true,
    sortKeys: false, // Keep user order if possible, though dump usually sorts or uses insertion order
    lineWidth: -1,
  });
};

/**
 * Deserialize YAML string to node data.
 */
export const deserializeNodeData = (
  yamlStr: string,
  type: string,
): Partial<AllNodeData> => {
  try {
    const parsed = yaml.load(yamlStr) as any;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid YAML: output is not an object');
    }

    if (type === 'step') {
      const { id, name, action, if: ifCondition, input, ...rest } = parsed;
      return {
        stepId: id,
        name: name,
        actionId: action,
        if: ifCondition,
        formData: input,
        customYamlData: Object.keys(rest).length > 0 ? rest : undefined,
      } as any;
    }

    if (type === 'property') {
      const {
        name,
        title,
        type: propType,
        description,
        'ui:field': uiField,
        'ui:options': uiOptions,
        pattern,
        enum: enumValues,
        ...rest
      } = parsed;
      return {
        name: name,
        title: title,
        variableType: propType,
        description: description,
        'ui:field': uiField,
        'ui:options': uiOptions,
        pattern: pattern,
        enum: enumValues,
        customYamlData: Object.keys(rest).length > 0 ? rest : undefined,
      } as any;
    }

    if (type === 'template') {
      const { name, owner, description, spec, annotations, ...rest } = parsed;
      return {
        name,
        owner,
        description,
        spec,
        annotations,
        customYamlData: Object.keys(rest).length > 0 ? rest : undefined,
      } as any;
    }

    if (type === 'templateOutput') {
      const { links, text, ...rest } = parsed;
      return {
        links,
        text,
        customYamlData: Object.keys(rest).length > 0 ? rest : undefined,
      } as any;
    }

    if (type === 'parameters') {
      const { title, parameters, ...rest } = parsed;
      return {
        title,
        parameters,
        customYamlData: Object.keys(rest).length > 0 ? rest : undefined,
      } as any;
    }

    return parsed as Partial<AllNodeData>;
  } catch (e) {
    throw new Error(`YAML Parse Error: ${(e as Error).message}`);
  }
};
