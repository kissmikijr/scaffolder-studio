import { z } from 'zod';

export const outputSchema = z.object({
  links: z.array(
    z.object({
      title: z.string().min(1, { message: 'Title is required' }),
      url: z.string().min(1, { message: 'URL is required' }),
      icon: z.string().optional(),
    }),
  ),
  text: z.array(
    z.object({
      title: z.string().min(1, { message: 'Title is required' }),
      content: z.string().min(1, { message: 'Content is required' }),
    }),
  ),
});

export type OutputForm = z.infer<typeof outputSchema>;
