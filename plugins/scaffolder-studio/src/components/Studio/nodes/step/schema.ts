import { z } from 'zod';

export const stepSchema = z.object({
  name: z.string().min(1, { message: 'Step name is required' }),
  id: z.string().min(1, { message: 'Step id is required' }),
  // .regex(/^\S+$/, { message: 'Step id must not contain spaces' }),
  if: z.string().optional(),
});

export type StepForm = z.infer<typeof stepSchema>;
