import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string(),
    category: z.enum(['For Translators', 'For Developers']),
    tags: z.array(z.string()),
    heroImage: z.string().optional(),
  }),
});

export const collections = { posts }; 