import { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { getPhoneLookupCandidates, extractDigits, parseBrazilianPhone } from './phoneUtils';

export interface CustomerSummary {
  id: string;
  fullName: string;
  phone?: string | null;
  cpfCnpj?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt?: string | null;
  active?: boolean | null;
}

export type CustomerLinkStatus = 'unlinked' | 'auto_matched' | 'manually_linked' | 'ambiguous';

export interface CustomerMatchResult {
  status: CustomerLinkStatus;
  customer: CustomerSummary | null;
  ambiguityList: CustomerSummary[];
}

export const CUSTOMER_QUERY_COLUMNS =
  'id, full_name, phone, cpf_cnpj, email, address, created_at, active';

/**
 * Normaliza um registro retornado do banco para o padrão CustomerSummary
 */
export function mapPersonToSummary(row: any): CustomerSummary {
  return {
    id: String(row.id),
    fullName: row.full_name || 'Cliente Sem Nome',
    phone: row.phone,
    cpfCnpj: row.cpf_cnpj,
    email: row.email,
    address: row.address,
    createdAt: row.created_at,
    active: row.active ?? true,
  };
}

/**
 * Identifica o cliente no cadastro de pessoas do ERP a partir do telefone do WhatsApp.
 * Segue estritamente as regras de identificação do MoranteHub:
 * 1. Não vincula automaticamente se houver mais de um cliente (ambiguidade).
 * 2. Trata nono dígito e DDI brasileiro +55.
 * 3. Não altera telefones do cadastro original.
 * 4. Não cria clientes automaticamente.
 */
export async function matchCustomerByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<CustomerMatchResult> {
  const candidates = getPhoneLookupCandidates(phone);
  if (candidates.length === 0) {
    return { status: 'unlinked', customer: null, ambiguityList: [] };
  }

  // Monta filtro OR para os candidatos de busca (ex: phone.eq.11999999999,phone.ilike.%11999999999%)
  // Para evitar queries gigantes, usa os 4 candidatos mais estáveis
  const phoneFilters = candidates
    .slice(0, 6)
    .map((c) => `phone.ilike.%${c.replace(/[^0-9]/g, '')}%`)
    .join(',');

  const { data, error } = await supabase
    .from('people')
    .select(CUSTOMER_QUERY_COLUMNS)
    .or(phoneFilters)
    .or('deleted.is.null,deleted.eq.false')
    .limit(20);

  if (error || !data || data.length === 0) {
    return { status: 'unlinked', customer: null, ambiguityList: [] };
  }

  // Filtragem precisa em memória comparando dígitos normalizados e DDD
  const targetParsed = parseBrazilianPhone(phone);
  const matchingCustomers: CustomerSummary[] = [];

  for (const row of data) {
    const rowPhone = row.phone;
    if (!rowPhone) continue;

    const rowDigits = extractDigits(rowPhone);
    const rowParsed = parseBrazilianPhone(rowPhone);

    let isMatch = false;

    if (targetParsed.isBrazilian && rowParsed.isBrazilian) {
      if (targetParsed.ddd && rowParsed.ddd && targetParsed.ddd === rowParsed.ddd) {
        // Compara os 8 dígitos base (sem o nono dígito)
        const targetBase8 = targetParsed.number.slice(-8);
        const rowBase8 = rowParsed.number.slice(-8);
        if (targetBase8 === rowBase8) {
          isMatch = true;
        }
      }
    } else {
      // Comparação direta de sufixo ou exata
      if (rowDigits.endsWith(extractDigits(phone)) || extractDigits(phone).endsWith(rowDigits)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matchingCustomers.push(mapPersonToSummary(row));
    }
  }

  // Deduplica por ID de cliente
  const uniqueMatches = Array.from(
    new Map(matchingCustomers.map((c) => [c.id, c])).values()
  );

  if (uniqueMatches.length === 1) {
    return {
      status: 'auto_matched',
      customer: uniqueMatches[0],
      ambiguityList: [],
    };
  }

  if (uniqueMatches.length > 1) {
    return {
      status: 'ambiguous',
      customer: null,
      ambiguityList: uniqueMatches,
    };
  }

  return { status: 'unlinked', customer: null, ambiguityList: [] };
}

/**
 * Vincula manualmente uma conversa a um cliente escolhido pelo operador
 */
export async function manuallyLinkCustomer(
  supabase: SupabaseClient,
  conversationId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await withTimeout<any>(supabase.rpc('customer_support_link_customer', {
    p_conversation_id: conversationId,
    p_customer_id: customerId,
  }), 15_000, null, 'central:vincular-cliente');
  const { data, error } = response || { data: null, error: new Error('Timeout ao vincular cliente') };

  if (error || data !== true) {
    console.error('[CustomerMatching] Erro ao vincular cliente manualmente:', error);
    return { success: false, error: error?.message || 'Cliente ou conversa não encontrados.' };
  }

  return { success: true };
}

/**
 * Desvincula o cliente de uma conversa
 */
export async function unlinkCustomer(
  supabase: SupabaseClient,
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await withTimeout<any>(supabase.rpc('customer_support_unlink_customer', {
    p_conversation_id: conversationId,
  }), 15_000, null, 'central:desvincular-cliente');
  const { data, error } = response || { data: null, error: new Error('Timeout ao desvincular cliente') };

  if (error || data !== true) {
    console.error('[CustomerMatching] Erro ao desvincular cliente:', error);
    return { success: false, error: error?.message || 'Conversa não encontrada.' };
  }

  return { success: true };
}
