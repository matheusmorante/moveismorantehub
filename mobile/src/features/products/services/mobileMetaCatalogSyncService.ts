import { requestMobileMetaCatalog, type MobileMetaCatalogSyncResult } from './mobileProductMetaCatalogSyncService';

export async function fetchLastMobileMetaCatalogRun(): Promise<MobileMetaCatalogSyncResult | null> {
  const { lastRun } = await requestMobileMetaCatalog<{ lastRun: MobileMetaCatalogSyncResult | null }>(
    'reconcile_catalog_status', {}, 15_000,
  );
  return lastRun;
}

export async function syncMobileMetaCatalog(isAdministrator: boolean): Promise<MobileMetaCatalogSyncResult> {
  if (!isAdministrator) {
    return {
      success: false,
      count: 0,
      error: 'Apenas administradores podem iniciar a sincronização via Graph API.',
    };
  }
  try {
    return await requestMobileMetaCatalog('reconcile_catalog', {}, 280_000);
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Erro ao sincronizar o catálogo da Meta.',
    };
  }
}
