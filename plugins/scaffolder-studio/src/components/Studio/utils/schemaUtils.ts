
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
