import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';

export type Database = SupabaseClient<FiscalDatabase>;
export type Result = { status: number; body: Record<string, unknown> };
export type HmlDocumentRow = FiscalDatabase['public']['Tables']['nfe_documents']['Row'];
