import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../services/supabaseClient';
import { offlineStorageService } from '../../../../services/offline/offlineStorageService';
import {
  DeliveryResponsibleItem,
  AvailableStaffMember,
} from './deliveryPreparation.types';
import {
  resolveInitialDeliveryResponsibles,
  addDeliveryResponsible,
  removeDeliveryResponsible,
} from './deliveryStaffRules';
import {
  isTestOperator,
  isTestOperatorVisibleToUser,
} from '../../../../../../shared-utils/testOperatorVisibility';

const DELIVERY_STAFF_CACHE_KEY = 'delivery_staff_profiles_v1';

interface UseDeliveryStaffOptions {
  order: any;
  userProfile?: any;
}

export function useDeliveryStaff({ order, userProfile }: UseDeliveryStaffOptions) {
  const [responsibles, setResponsibles] = useState<DeliveryResponsibleItem[]>(() =>
    resolveInitialDeliveryResponsibles(order, userProfile)
  );

  const [availableStaff, setAvailableStaff] = useState<AvailableStaffMember[]>([]);

  useEffect(() => {
    let alive = true;
    const loadStaff = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, position, role, email')
          .not('full_name', 'is', null)
          .neq('role', 'pending')
          .limit(50);

        if (!error && profiles && alive) {
          const list = profiles
            .filter((profile: any) =>
              isTestOperatorVisibleToUser(profile, userProfile?.email)
            )
            .filter((profile: any) => {
              const ownTestOperator =
                isTestOperator(profile) &&
                isTestOperatorVisibleToUser(profile, userProfile?.email);
              const hasCollaboratorCargo = Boolean(
                profile.position?.trim() && profile.role && profile.role !== 'pending'
              );
              return ownTestOperator || hasCollaboratorCargo;
            })
            .filter((p: any) => Boolean(p.full_name?.trim()))
            .map((p: any) => ({
              id: p.id,
              fullName: p.full_name.trim(),
              role: p.role,
            }));
          setAvailableStaff(list);
          await offlineStorageService
            .cacheWorkingSet(DELIVERY_STAFF_CACHE_KEY, list)
            .catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[useDeliveryStaff] Falha ao carregar colaboradores da equipe, tentando cache:', err);
      }

      try {
        const cached = await offlineStorageService.getWorkingSet<AvailableStaffMember[]>(
          DELIVERY_STAFF_CACHE_KEY
        );
        if (alive && Array.isArray(cached?.data)) {
          setAvailableStaff(cached.data);
        }
      } catch {}
    };

    void loadStaff();

    return () => {
      alive = false;
    };
  }, [userProfile?.email]);

  const handleAddResponsible = useCallback((responsible: DeliveryResponsibleItem) => {
    setResponsibles((prev) => addDeliveryResponsible(prev, responsible));
  }, []);

  const handleRemoveResponsible = useCallback((index: number) => {
    setResponsibles((prev) => removeDeliveryResponsible(prev, index));
  }, []);

  return {
    responsibles,
    setResponsibles,
    availableStaff,
    handleAddResponsible,
    handleRemoveResponsible,
  };
}
