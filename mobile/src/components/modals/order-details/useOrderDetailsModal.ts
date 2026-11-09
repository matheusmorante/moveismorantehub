import { useState, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { loadMobileOrderDetails } from '../../../services/orderDetailsReadService';

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
  const {
    rolePermissions,
    rolePermissionsLoaded,
    rolePermissionsConfirmed,
    rolePermissionsLoadFailed,
  } = useAuth();
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

  // Reutiliza a leitura confirmada da sessão ou o último valor salvo no aparelho.
  useEffect(() => {
    const hasPermissionSnapshot = rolePermissionsConfirmed || rolePermissionsLoaded;
    if (!hasPermissionSnapshot && !rolePermissionsLoadFailed) {
      setCanStartDelivery(false);
      return;
    }

    const permissionSource = rolePermissionsConfirmed
      ? 'server'
      : rolePermissionsLoaded
        ? 'cache'
        : 'unavailable';
    const configuredRoles =
      permissionSource === 'unavailable'
        ? undefined
        : rolePermissions.startDelivery;
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

    // Este controle afeta apenas a exibição; o servidor continua validando a operação.
    setCanStartDelivery(isAdministrator || isDefaultRole || hasConfiguredPermission || !normalizedRole);
  }, [
    userRole,
    rolePermissions,
    rolePermissionsLoaded,
    rolePermissionsConfirmed,
    rolePermissionsLoadFailed,
  ]);

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
