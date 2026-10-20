import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { offlineStorageService } from '../../services/offline/offlineStorageService';
import { PRODUCT_PERMISSION_ACTIONS } from '../../../../shared-utils/productPermissions';
import { sanitizeLoadedRolePermissions } from './authProfilePermissions';

const ROLE_PERMISSIONS_CACHE_KEY = 'app_role_permissions_v1';

export const useRolePermissionsState = (profileAccessKey: string | null) => {
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [rolePermissionsLoaded, setRolePermissionsLoaded] = useState(false);
  const [rolePermissionsLoadFailed, setRolePermissionsLoadFailed] = useState(false);
  const [permissionReloadVersion, setPermissionReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    if (!profileAccessKey) {
      setRolePermissions({});
      setRolePermissionsLoaded(false);
      setRolePermissionsLoadFailed(false);
      return () => {
        active = false;
      };
    }

    const loadRolePermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'app')
          .maybeSingle();
        if (!active) return;
        if (error) throw error;

        const safePermissions = sanitizeLoadedRolePermissions(data?.data?.rolePermissions);

        setRolePermissions(safePermissions);
        setRolePermissionsLoaded(true);
        setRolePermissionsLoadFailed(false);
        await offlineStorageService
          .cacheWorkingSet(ROLE_PERMISSIONS_CACHE_KEY, safePermissions)
          .catch(() => {});
      } catch {
        if (!active) return;
        console.warn('[Permissions] Falha ao carregar os acessos configurados. Tentando cache...');
        try {
          const cached = await offlineStorageService.getWorkingSet<Record<string, string[]>>(
            ROLE_PERMISSIONS_CACHE_KEY
          );
          if (!active) return;
          if (cached?.data && typeof cached.data === 'object') {
            setRolePermissions(cached.data);
            setRolePermissionsLoaded(true);
            setRolePermissionsLoadFailed(false);
            return;
          }
        } catch {}
        setRolePermissions({});
        setRolePermissionsLoadFailed(true);
      }
    };

    setRolePermissionsLoaded(false);
    setRolePermissionsLoadFailed(false);
    void loadRolePermissions();

    const settingsChannel = supabase
      .channel('mobile-product-role-permissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.app' },
        () => void loadRolePermissions()
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(settingsChannel);
    };
  }, [profileAccessKey, permissionReloadVersion]);

  const reloadRolePermissions = () => setPermissionReloadVersion((version) => version + 1);

  const saveRolePermissions = async (updates: Record<string, string[]>) => {
    const productActionIds = new Set(PRODUCT_PERMISSION_ACTIONS.map((action) => action.id));
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([actionId]) => productActionIds.has(actionId))
    );
    if (Object.keys(safeUpdates).length === 0) return;

    const { data: current, error: readError } = await supabase
      .from('settings')
      .select('data')
      .eq('id', 'app')
      .maybeSingle();
    if (readError) throw readError;

    const currentData =
      current?.data && typeof current.data === 'object' && !Array.isArray(current.data)
        ? current.data
        : {};
    const currentPermissions =
      currentData.rolePermissions &&
      typeof currentData.rolePermissions === 'object' &&
      !Array.isArray(currentData.rolePermissions)
        ? currentData.rolePermissions
        : {};
    const nextPermissions = { ...currentPermissions, ...safeUpdates };
    const { error: saveError } = await supabase.from('settings').upsert({
      id: 'app',
      data: { ...currentData, rolePermissions: nextPermissions },
    });
    if (saveError) throw saveError;

    setRolePermissions(nextPermissions as Record<string, string[]>);
    setRolePermissionsLoaded(true);
    setRolePermissionsLoadFailed(false);
    await offlineStorageService
      .cacheWorkingSet(ROLE_PERMISSIONS_CACHE_KEY, nextPermissions)
      .catch(() => {});
  };

  return {
    rolePermissions,
    rolePermissionsLoaded,
    rolePermissionsLoadFailed,
    reloadRolePermissions,
    saveRolePermissions,
  };
};
