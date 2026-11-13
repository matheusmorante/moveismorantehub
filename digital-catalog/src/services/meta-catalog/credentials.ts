/**
 * Credenciais e configurações da integração Meta Catalog.
 * Responsabilidade única: resolução de access token e catalog ID.
 */
import { supabase } from '@/lib/supabase/client';

export interface MetaCredentials {
  accessToken: string;
  catalogId: string;
}

type MetaCatalogSettingsRecord = {
  meta_access_token?: string | null;
  meta_catalog_id?: string | null;
  global_description_prefix?: string | null;
  column_mappings?: Record<string, string> | null;
};

export interface MetaCatalogSyncSnapshot {
  credentials: MetaCredentials | null;
  globalDescriptionPrefix?: string | null;
  columnMappings?: Record<string, string> | null;
}

const META_DEFAULT_CATALOG_ID = '949184464866249';

function resolveMetaCredentials(
  catSettings: MetaCatalogSettingsRecord | null
): MetaCredentials | null {
  let accessToken = process.env.META_ACCESS_TOKEN
    ? String(process.env.META_ACCESS_TOKEN).trim()
    : '';
  let catalogId = process.env.META_CATALOG_ID
    ? String(process.env.META_CATALOG_ID).trim().replace(/\D/g, '')
    : '';

  if (catSettings) {
    if (catSettings.meta_access_token && !accessToken) {
      accessToken = String(catSettings.meta_access_token).trim();
    }
    if (catSettings.meta_catalog_id && !catalogId) {
      catalogId = String(catSettings.meta_catalog_id).trim().replace(/\D/g, '');
    }
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

/**
 * Obtém credenciais válidas do Meta Catalog a partir do banco ou variáveis de ambiente.
 * O banco tem precedência apenas se as variáveis de ambiente estiverem vazias.
 */
export async function getMetaCatalogCredentials(): Promise<MetaCredentials | null> {
  let catSettings: MetaCatalogSettingsRecord | null = null;

  try {
    const { data } = await supabase
      .from('facebook_catalog_settings')
      .select('meta_access_token, meta_catalog_id')
      .eq('id', true)
      .maybeSingle();
    catSettings = data as MetaCatalogSettingsRecord | null;
  } catch (err) {
    console.warn('[MetaCatalog] Erro ao ler facebook_catalog_settings:', err);
  }

  return resolveMetaCredentials(catSettings);
}

/**
 * Lê uma única fotografia das credenciais e preferências usadas no envio completo.
 * O token permanece no servidor e só é devolvido ao chamador interno desta rota.
 */
export async function getMetaCatalogSyncSnapshot(): Promise<MetaCatalogSyncSnapshot> {
  let catSettings: MetaCatalogSettingsRecord | null = null;

  try {
    const { data } = await supabase
      .from('facebook_catalog_settings')
      .select('meta_access_token, meta_catalog_id, global_description_prefix, column_mappings')
      .eq('id', true)
      .maybeSingle();
    catSettings = data as MetaCatalogSettingsRecord | null;
  } catch (err) {
    console.warn('[MetaCatalogSync] Erro ao carregar facebook_catalog_settings:', err);
  }

  return {
    credentials: resolveMetaCredentials(catSettings),
    globalDescriptionPrefix: catSettings?.global_description_prefix,
    columnMappings: catSettings?.column_mappings,
  };
}
