/** Normalize formData so number/integer fields don't persist "" (RJSF often sends "" for empty number inputs, which then fails to display on load). */
export const normalizeFormDataForSchema = (
  schema: { properties?: Record<string, { type?: string }> } | null | undefined,
  formData: Record<string, unknown>,
): Record<string, unknown> => {
  if (!schema?.properties || typeof formData !== 'object' || !formData)
    return formData;
  const out = { ...formData };
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const type = propSchema?.type;
    if (
      (type === 'number' || type === 'integer') &&
      (out[key] === '' || out[key] === null || out[key] === undefined)
    ) {
      delete out[key];
    }
  }
  return out;
};

export const fixSchema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') return schema;

  const newSchema = { ...schema };

  if (newSchema.properties) {
    const newProperties: Record<string, any> = {};
    Object.keys(newSchema.properties).forEach(key => {
      newProperties[key] = fixSchema(newSchema.properties[key]);
    });
    newSchema.properties = newProperties;
  }

  if (newSchema.items) {
    newSchema.items = fixSchema(newSchema.items);
  }

  // Fix for z.any() which often results in a schema without a type
  if (
    !newSchema.type &&
    !newSchema.$ref &&
    !newSchema.oneOf &&
    !newSchema.anyOf &&
    !newSchema.allOf &&
    !newSchema.enum // enum implies type
  ) {
    // Default to object with additional properties allowed for any-type fields
    newSchema.type = 'object';
    newSchema.additionalProperties = true;
  }

  return newSchema;
};
