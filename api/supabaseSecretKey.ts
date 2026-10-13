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

export const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

export function getSupabaseUrl(): string {
  ensureEnvLoaded();
  return (
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabaseAnonKey(): string {
  ensureEnvLoaded();
  return (
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_SUPABASE_ANON_KEY
  );
}

/** Return the current Supabase backend key, with the legacy name as fallback. */
export function getSupabaseSecretKey(): string | undefined {
  ensureEnvLoaded();
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()
  );
}

