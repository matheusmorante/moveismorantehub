import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../services/supabaseClient';
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
    supabase
      .from('profiles')
      .select('id, full_name, position, role, email')
      .not('full_name', 'is', null)
      .neq('role', 'pending')
      .limit(50)
      .then(({ data: profiles, error }) => {
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
        }
      })
      .catch((err) =>
        console.warn('[useDeliveryStaff] Falha ao carregar colaboradores da equipe:', err)
      );

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
