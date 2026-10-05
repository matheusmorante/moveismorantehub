import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function ensureEnvLoaded(): void {
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
        dotenv.config({ path: fullPath, override: false });
      }
    }
  }
}

ensureEnvLoaded();

/** Return the current Supabase backend key, with the legacy name as fallback. */
export function getSupabaseSecretKey(): string | undefined {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

