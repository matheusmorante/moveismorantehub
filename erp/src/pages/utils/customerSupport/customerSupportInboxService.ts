import { SupabaseClient } from '@supabase/supabase-js';
import {
  CustomerSupportFolder,
  CustomerSupportFolderCriteria,
} from '@/pages/App/CustomerSupport/types';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const DEFAULT_SUPPORT_FOLDER_CRITERIA: CustomerSupportFolderCriteria = {
  status: 'all',
  assigneeId: 'all',
  unread: false,
  customerLink: 'all',
  orders: 'all',
  search: '',
};

function mapFolder(row: any): CustomerSupportFolder {
  return {
    id: String(row.id),
    name: String(row.name),
    criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, ...(row.criteria || {}) },
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function fetchCustomerSupportFolders(
  supabase: SupabaseClient
): Promise<CustomerSupportFolder[]> {
  const response = await withTimeout<any>(supabase
    .from('customer_support_inboxes')
    .select('id, name, criteria, created_by, created_at, updated_at')
    .order('created_at', { ascending: false }), 15_000, null, 'central:pastas');
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar pastas') };

  if (error || !data) {
    throw new Error('Não foi possível carregar as pastas. Tente atualizar.');
  }
  return data.map(mapFolder);
}

export async function saveCustomerSupportFolder(
  supabase: SupabaseClient,
  input: {
    id?: string;
    name: string;
    criteria: CustomerSupportFolderCriteria;
    userId: string;
  }
): Promise<{ folder: CustomerSupportFolder | null; error: string | null }> {
  const name = input.name.trim();
  const payload = {
    name,
    criteria: input.criteria,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase.from('customer_support_inboxes').update(payload).eq('id', input.id)
    : supabase.from('customer_support_inboxes').insert({ ...payload, created_by: input.userId });
  const response = await withTimeout<any>(query
    .select('id, name, criteria, created_by, created_at, updated_at')
    .single(), 15_000, null, 'central:salvar-pasta');
  const { data, error } = response || { data: null, error: new Error('Timeout ao salvar pasta') };

  if (error || !data) {
    const message = error?.code === '23505'
      ? 'Já existe uma pasta com esse nome.'
      : error?.code === '42501'
        ? 'Você não tem permissão para salvar esta pasta.'
        : 'Não foi possível salvar a pasta. Tente novamente.';
    return { folder: null, error: message };
  }
  return { folder: mapFolder(data), error: null };
}

export async function deleteCustomerSupportFolder(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const response = await withTimeout<any>(supabase
    .from('customer_support_inboxes')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle(), 15_000, null, 'central:excluir-pasta');
  const { data, error } = response || { data: null, error: new Error('Timeout ao excluir pasta') };

  if (error || !data) {
    return {
      success: false,
      error: error?.code === '42501'
        ? 'Você não tem permissão para excluir esta pasta.'
        : 'Não foi possível excluir a pasta. Tente novamente.',
    };
  }
  return { success: true, error: null };
}
