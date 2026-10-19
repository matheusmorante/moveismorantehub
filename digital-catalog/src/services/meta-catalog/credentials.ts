/**
 * Credenciais e configurações da integração Meta Catalog.
 * Responsabilidade única: resolução de access token e catalog ID.
 */
import { supabase } from '@/lib/supabase/client';

export interface MetaCredentials {
  accessToken: string;
  catalogId: string;
}

const META_DEFAULT_CATALOG_ID = '949184464866249';

/**
 * Obtém credenciais válidas do Meta Catalog a partir do banco ou variáveis de ambiente.
 * O banco tem precedência apenas se as variáveis de ambiente estiverem vazias.
 */
export async function getMetaCatalogCredentials(): Promise<MetaCredentials | null> {
  let accessToken = process.env.META_ACCESS_TOKEN
    ? String(process.env.META_ACCESS_TOKEN).trim()
    : '';
  let catalogId = process.env.META_CATALOG_ID
    ? String(process.env.META_CATALOG_ID).trim().replace(/\D/g, '')
    : '';

  try {
    const { data: catSettings } = await supabase
      .from('facebook_catalog_settings')
      .select('meta_access_token, meta_catalog_id')
      .eq('id', true)
      .maybeSingle();

    if (catSettings) {
      if (catSettings.meta_access_token && !accessToken) {
        accessToken = String(catSettings.meta_access_token).trim();
      }
      if (catSettings.meta_catalog_id && !catalogId) {
        catalogId = String(catSettings.meta_catalog_id).trim().replace(/\D/g, '');
      }
    }
  } catch (err) {
    console.warn('[MetaCatalog] Erro ao ler facebook_catalog_settings:', err);
  }

  // Fallback se o catalogId for vazio ou inválido
  if (!catalogId || catalogId === '2597693034029026') {
    catalogId = META_DEFAULT_CATALOG_ID;
  }

  if (!accessToken || !catalogId) {
    return null;
  }

  return { accessToken, catalogId };
}
