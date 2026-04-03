import { z } from 'zod';

export const envSchema = z.object({
  MODEL_PROVIDER: z.string().default('openai-compatible'),
  MODEL_NAME: z.string().default('gpt-4o-mini'),
  MODEL_API_KEY: z.string().optional(),
  MODEL_BASE_URL: z.string().default('https://api.openai.com/v1'),
  WORKSPACE_ROOT: z.string().default('.'),
  SESSION_DIR: z.string().default('.sessions'),
  DEFAULT_APPROVAL_MODE: z.string().default('confirm'),
  READ_MAX_BYTES: z.coerce.number().default(200000),
  SHELL_ENABLED: z.coerce.boolean().default(true),
  WRITE_ENABLED: z.coerce.boolean().default(true)
});

export type AppEnv = z.infer<typeof envSchema>;

