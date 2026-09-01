import { createClient } from "@supabase/supabase-js";

// Base de Dados Centralizada do Supabase - MoranteHub (Compartilhada entre ERP e Catálogo Digital)
const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const isTestEnvironment = import.meta.env.MODE === 'test';
const testSupabaseUrl = import.meta.env.VITE_SUPABASE_TEST_URL;
const testSupabaseKey = import.meta.env.VITE_SUPABASE_TEST_ANON_KEY;

if (isTestEnvironment && (!testSupabaseUrl || !testSupabaseKey)) {
  throw new Error(
    'Testes que acessam Supabase exigem VITE_SUPABASE_TEST_URL e VITE_SUPABASE_TEST_ANON_KEY de um projeto exclusivo de testes.',
  );
}

const supabaseUrl = isTestEnvironment
  ? testSupabaseUrl
  : import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = isTestEnvironment
  ? testSupabaseKey
  : import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);
export const ecommerceSupabase = supabase;
