import { supabase } from '../supabaseConfig';

export type HmlCsosnConfiguration = {
  csosn: string;
  environment: 2;
  model: '55';
  issuerCrt: '1';
  productionApproved: false;
  version: string;
};
export type PreparedItemCsosn = {
  itemNumber: number;
  csosn: string;
  source: string;
  cfop?: string;
  cfopSource?: string;
};

async function request(method: 'GET' | 'POST' | 'PATCH', body?: Record<string, unknown>) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Faça login novamente.');
  const response = await fetch('/api/nfe/item-defaults', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true)
    throw new Error(result.error || 'Configuração fiscal indisponível.');
  return result;
}

export async function getHmlCsosnConfiguration(): Promise<HmlCsosnConfiguration> {
  return (await request('GET')).configuration;
}
export async function saveHmlCsosnConfiguration(csosn: string): Promise<HmlCsosnConfiguration> {
  return (await request('PATCH', { environment: 2, csosn })).configuration;
}
export async function prepareHmlItemCsosns(orderId: string): Promise<PreparedItemCsosn[]> {
  return (await request('POST', { environment: 2, orderId })).items;
}
