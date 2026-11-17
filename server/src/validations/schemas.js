import z from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  folderId: z.string().optional(),
});

export const taskRangeSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .refine(({ start, end }) => new Date(start) < new Date(end), {
    message: 'start must be before end',
  })
  .refine(({ start, end }) => new Date(end) - new Date(start) <= 62 * 24 * 60 * 60 * 1000, {
    message: 'range can be at most 62 days',
  });

export const createFolderSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
});

export const createLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const createSessionSchema = z.object({
  type: z.enum(['pomodoro', 'focus', 'short_break', 'long_break', 'custom']),
  duration: z.number().positive(),
});
