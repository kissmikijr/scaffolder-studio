import { z } from 'zod';
import { AllNodeData, isPropertyNode } from '../../types';
import { Node } from '@xyflow/react';

export const propertySchema = ({
  nodes,
  excludeId,
}: {
  nodes: Node<AllNodeData>[];
  excludeId?: string;
}) =>
  z.object({
    name: z
      .string()
      .min(1, { message: 'Property name is required' })
      .refine(
        value => {
          return !(
            nodes
              .filter(n => isPropertyNode(n))
              .filter(n => (excludeId ? n.id !== excludeId : true))
              .filter(n => n.data.name === value).length > 0
          );
        },
        { message: 'Property with this name already exists in this project' },
      ),
    variableType: z.string().min(1, { message: 'Variable type is required' }),
    required: z.boolean().optional(),
    'ui:field': z.string().optional(),
    'ui:options': z.any().optional(),
  });

export type PropertyForm = z.infer<ReturnType<typeof propertySchema>>;
