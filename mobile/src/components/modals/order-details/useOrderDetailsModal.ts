import { useState, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../services/supabaseClient';
import { loadMobileOrderDetails } from '../../../services/orderDetailsReadService';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

const DEFAULT_ALLOWED_DELIVERY_ROLES = [
  'administrator',
  'admin',
  'master',
  'manager',
  'gerente',
  'deliverer',
  'entregador',
  'driver',
  'seller',
  'vendedor',
  'stockist',
  'estoquista',
  'assembler',
  'montador',
];

interface UseOrderDetailsModalProps {
  order: any;
  userRole?: string;
}

export function useOrderDetailsModal({ order, userRole }: UseOrderDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [preparingDelivery, setPreparingDelivery] = useState(false);
  const [canStartDelivery, setCanStartDelivery] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<any>(order);
  const [detailsLoading, setDetailsLoading] = useState(Boolean(order?.id));
  const [detailsError, setDetailsError] = useState('');
  const [detailsAttempt, setDetailsAttempt] = useState(0);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  useEffect(() => {
    const controller = new AbortController();
    setDetailedOrder(order);
    setPreparingDelivery(false);
    setDetailsLoading(Boolean(order?.id));
    setDetailsError('');
    if (!order?.id) return () => controller.abort();
    void loadMobileOrderDetails(order, controller.signal).then((full) => {
      if (controller.signal.aborted) return;
      setDetailedOrder(full);
      setPreparingDelivery(Boolean(order._openDeliveryPreparation));
    }).catch((cause) => {
      if (!controller.signal.aborted) setDetailsError(cause instanceof Error ? cause.message : 'Não foi possível carregar os detalhes.');
    }).finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [order, detailsAttempt]);

  // 2. Consulta de permissão para iniciar entrega com fallback resiliente para equipe
  useEffect(() => {
    let alive = true;
    const loadPermission = async () => {
      try {
        const { data } = await withAbortTimeout(supabase.from('settings').select('roles:data->rolePermissions').eq('id', 'app').maybeSingle(), 'app:permissoes-entrega', 15_000);
        if (!alive) return;

        const configuredRoles = (data?.roles as { startDelivery?: unknown } | null)?.startDelivery;
        const allowedRoles =
          Array.isArray(configuredRoles) && configuredRoles.length > 0
            ? configuredRoles
            : DEFAULT_ALLOWED_DELIVERY_ROLES;

        const normalizedRole = String(userRole || '')
          .trim()
          .toLowerCase();
        const isAdministrator = ['admin', 'administrator', 'master'].includes(normalizedRole);
        const isDefaultRole = DEFAULT_ALLOWED_DELIVERY_ROLES.includes(normalizedRole);
        const hasConfiguredPermission = allowedRoles.some(
          (role: string) => String(role).trim().toLowerCase() === normalizedRole
        );

        // Qualquer usuário da equipe (estoquista, entregador, vendedor, gerente, admin) tem acesso
        setCanStartDelivery(isAdministrator || isDefaultRole || hasConfiguredPermission || !normalizedRole);
      } catch (err) {
        console.warn('[useOrderDetailsModal] Falha ao verificar permissões de entrega:', err);
        if (alive) setCanStartDelivery(true);
      }
    };

    void loadPermission();
    return () => {
      alive = false;
    };
  }, [userRole]);

  return {
    detailedOrder: detailedOrder || order,
    detailsLoading, detailsError, retryDetails: () => setDetailsAttempt((value) => value + 1),
    setDetailedOrder,
    preparingDelivery,
    setPreparingDelivery,
    canStartDelivery: canStartDelivery && !detailsLoading && !detailsError,
    topInset,
  };
}
