import { Node } from '@xyflow/react';
import { parseDocument, isSeq, isMap } from 'yaml';
import { AllNodeData } from '../types';

export const calculateReadOnlyRanges = (
  template: string,
  nodes: Node<AllNodeData>[],
  resolvedNodes: Node<AllNodeData>[],
): Array<{ from: number; to: number }> => {
  const ranges: Array<{ from: number; to: number }> = [];
  const prefabNodes = nodes.filter(n => n.type === 'prefab');

  const doc = parseDocument(template);
  const contents = doc.contents;

  if (isMap(contents)) {
    const spec = contents.get('spec');
    if (isMap(spec)) {
      // Handle steps
      const steps = spec.get('steps');
      if (isSeq(steps)) {
        for (const step of steps.items) {
          if (isMap(step)) {
            const stepId = step.get('id');
            const stepName = step.get('name');

            // Check if this step corresponds to any prefab node
            const matchingPrefab = prefabNodes.find(prefabNode => {
              const resolvedNode = resolvedNodes.find(n => n.id === prefabNode.id);
              if (resolvedNode && resolvedNode.data) {
                const resolvedId = (resolvedNode.data as any).stepId;
                const resolvedName = (resolvedNode.data as any).name;

                // Match by ID if available, otherwise by name
                if (resolvedId && stepId) {
                  return String(resolvedId).trim() === String(stepId).trim();
                }
                if (resolvedName && stepName) {
                  return String(resolvedName).trim() === String(stepName).trim();
                }
              }
              return false;
            });

            if (matchingPrefab && (step as any).range) {
              ranges.push({
                from: (step as any).range[0],
                to: (step as any).range[1],
              });
            }
          }
        }
      }

      // Handle parameters (properties)
      const parameters = spec.get('parameters');
      
      const findMatches = (properties: any) => {
        const matches: Array<{ from: number; to: number }> = [];
        let totalProperties = 0;

        if (isMap(properties)) {
          totalProperties = properties.items.length;
          for (const prop of properties.items) {
            const rawKey = prop.key;
            const propName =
              rawKey && typeof rawKey === 'object' && 'value' in rawKey
                ? (rawKey as any).value
                : rawKey;

            // Check if this property corresponds to any prefab node
            const matchingPrefab = prefabNodes.find(prefabNode => {
              const resolvedNode = resolvedNodes.find(n => n.id === prefabNode.id);
              if (resolvedNode && resolvedNode.data) {
                const resolvedName = (resolvedNode.data as any).name;

                // Match by name
                if (resolvedName && propName) {
                  return String(resolvedName).trim() === String(propName).trim();
                }
              }
              return false;
            });

            if (matchingPrefab) {
              let from: number | undefined;
              let to: number | undefined;

              if ((prop as any).range) {
                from = (prop as any).range[0];
                to = (prop as any).range[1];
              } else if (prop.key && prop.value) {
                const keyRange = (prop.key as any).range;
                const valueRange = (prop.value as any).range;
                if (keyRange && valueRange) {
                  from = keyRange[0];
                  to = valueRange[1];
                }
              }

              if (from !== undefined && to !== undefined) {
                matches.push({ from, to });
              }
            }
          }
        }
        return { matches, totalProperties };
      };

      if (isSeq(parameters)) {
        for (const param of parameters.items) {
          if (isMap(param)) {
            const properties = param.get('properties');
            const { matches, totalProperties } = findMatches(properties);

            // If all properties in this block match prefabs (and there's at least one),
            // disable the entire block (including title, required, etc.)
            if (totalProperties > 0 && matches.length === totalProperties) {
              if ((param as any).range) {
                ranges.push({
                  from: (param as any).range[0],
                  to: (param as any).range[1],
                });
              } else {
                ranges.push(...matches);
              }
            } else {
              ranges.push(...matches);
            }
          }
        }
      } else if (isMap(parameters)) {
        const properties = parameters.get('properties');
        const { matches } = findMatches(properties);
        ranges.push(...matches);
      }
    }
  }

  return ranges;
};
