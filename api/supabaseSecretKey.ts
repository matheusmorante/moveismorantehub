import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

let localEnvironmentLoaded = false;
function ensureEnvLoaded(): void {
  if (
    process.env.MORANTE_ENV_SOURCE === 'vercel-development' ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV === 'test' ||
    localEnvironmentLoaded
  )
    return;
  localEnvironmentLoaded = true;
  const candidateDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    __dirname,
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..'),
  ];

  for (const dir of candidateDirs) {
    for (const file of ['.env.local', '.env']) {
      const fullPath = path.resolve(dir, file);
      if (fs.existsSync(fullPath)) {
        dotenv.config({ path: fullPath, override: false, quiet: true });
      }
    }
  }
}

ensureEnvLoaded();

/** Return the current Supabase backend key, with the legacy name as fallback. */
export function getSupabaseSecretKey(): string | undefined {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}
