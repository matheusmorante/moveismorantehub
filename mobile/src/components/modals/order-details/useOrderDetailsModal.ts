import { useState, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';

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

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  // 1. Carregamento sob demanda de itens completos do pedido caso venha incompleto da listagem
  useEffect(() => {
    setDetailedOrder(order);
    if (!order?.id) {
      setPreparingDelivery(false);
      return;
    }
    if (order._openDeliveryPreparation) {
      setPreparingDelivery(true);
    }

    const existingItems = order.order_data?.items || order.items || [];
    const hasFullItems =
      Array.isArray(existingItems) &&
      existingItems.length > 0 &&
      existingItems.some((i: any) => i.name || i.description || i.productName || i.title);
    if (hasFullItems) return;

    let alive = true;
    const loadFullOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order.id)
          .maybeSingle();
        if (!error && data && alive) {
          setDetailedOrder(data);
          return;
        }
      } catch (err) {
        console.warn('[useOrderDetailsModal] Falha ao carregar detalhes remotos, tentando cache:', err);
      }

      // Fallback offline: tenta recuperar do OrderRepository ou de logistics_orders
      try {
        const local = await OrderRepository.getById(order.id);
        if (local && alive) {
          setDetailedOrder({
            ...order,
            id: local.id,
            status: local.status,
            order_data: local.orderData,
          });
          return;
        }
      } catch {}

      try {
        const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
        const found = cached?.data?.find((item) => item?.id === order.id);
        if (found && alive) {
          setDetailedOrder(found);
        }
      } catch {}
    };

    void loadFullOrder();

    return () => {
      alive = false;
    };
  }, [order]);

  // 2. Consulta de permissão para iniciar entrega com fallback resiliente para equipe
  useEffect(() => {
    let alive = true;
    const loadPermission = async () => {
      try {
        const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
        if (!alive) return;

        const configuredRoles = data?.data?.rolePermissions?.startDelivery;
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
    preparingDelivery,
    setPreparingDelivery,
    canStartDelivery,
    topInset,
  };
}
