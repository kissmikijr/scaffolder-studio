import { z } from 'zod';

export const parametersSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
});

export type ParametersForm = z.infer<typeof parametersSchema>;
