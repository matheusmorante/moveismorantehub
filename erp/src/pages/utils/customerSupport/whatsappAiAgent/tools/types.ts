import type { SupabaseClient } from '@supabase/supabase-js';

export interface SafeToolContext {
  conversationId: string;
  customerId?: string | null;
  contactPhone: string;
  settings?: any;
  isSimulation?: boolean;
}

export interface AddressFreightEvaluation {
  localizado: boolean;
  distanciaKm: number;
  freteGratis: boolean;
  enderecoNormalizado?: string;
}

export type SafeToolHandler = (
  supabase: SupabaseClient,
  args: Record<string, any>,
  context: SafeToolContext
) => Promise<Record<string, any>>;
