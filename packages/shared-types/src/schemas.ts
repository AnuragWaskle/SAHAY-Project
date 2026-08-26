import { z } from 'zod';

export const reportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  imageUrl: z.string().nullable().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  bio: z.string().optional(),
  language_pref: z.string().optional(),
});
