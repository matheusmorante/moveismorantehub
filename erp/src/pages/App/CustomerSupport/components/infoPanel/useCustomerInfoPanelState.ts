import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportCustomerLinkSchema, type SupportCustomerLinkInput } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import { WhatsAppConversation } from '../types';
import {
  getCustomerOrders,
  SupportOrderSummary,
  SUPPORT_ORDERS_LOAD_ERROR,
  SUPPORT_ORDERS_PERMISSION_ERROR,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { unlinkCustomer } from '@/pages/utils/customerSupport/customerMatchingService';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { PanelTab } from './CustomerInfoTabsNav';

interface UseCustomerInfoPanelStateParams {
  conversation: WhatsAppConversation;
  canViewCommercial: boolean;
  onConversationUpdated: (updated: Partial<WhatsAppConversation>) => void;
}

export function useCustomerInfoPanelState({
  conversation,
  canViewCommercial,
  onConversationUpdated,
}: UseCustomerInfoPanelStateParams) {
  const [activeTab, setActiveTab] = useState<PanelTab>('customer');
  const [orders, setOrders] = useState<SupportOrderSummary[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [ordersAttempt, setOrdersAttempt] = useState(0);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [customerActionError, setCustomerActionError] = useState('');
  const unlinkForm = useForm<SupportCustomerLinkInput>({ resolver: zodResolver(supportCustomerLinkSchema) });
  const unlinkLock = useRef(false);

  // Carrega pedidos vinculados sob demanda (Egress otimizado)
  useEffect(() => {
    setOrders([]);
    setOrdersError('');
    setIsLoadingOrders(false);
    if (!conversation.customerId || !canViewCommercial) {
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);

    getCustomerOrders(supabase, conversation.customerId)
      .then((data) => {
        if (isMounted) setOrders(data);
      })
      .catch((error) => {
        if (isMounted) {
          setOrders([]);
          setOrdersError(
            error instanceof Error && error.message === SUPPORT_ORDERS_PERMISSION_ERROR
              ? SUPPORT_ORDERS_PERMISSION_ERROR
              : SUPPORT_ORDERS_LOAD_ERROR
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversation.customerId, canViewCommercial, ordersAttempt]);

  const handleUnlink = useCallback(async () => {
    if (unlinkLock.current) return;
    unlinkLock.current = true;
    unlinkForm.reset({ conversationId: conversation.id, customerId: conversation.customerId || '' });
    setCustomerActionError('');
    try {
      await unlinkForm.handleSubmit(async (data) => {
        if (!window.confirm('Deseja realmente desvincular este cliente da conversa?')) return;
        const res = await unlinkCustomer(supabase, data.conversationId);
        if (!res.success) {
          setCustomerActionError(res.error || 'Não foi possível desvincular o cliente.');
          return;
        }
        onConversationUpdated({ customerId: null, customerLinkStatus: 'unlinked', customer: null, orders: [] });
        setOrders([]);
      }, () => setCustomerActionError('Conversa ou cliente inválido para desvincular.'))();
    } catch {
      setCustomerActionError('Não foi possível desvincular o cliente. Tente novamente.');
    } finally {
      unlinkLock.current = false;
    }
  }, [conversation.id, conversation.customerId, unlinkForm, onConversationUpdated]);

  const handleLinked = useCallback((newCustomerId: string, newCustomer: unknown) => {
    setIsLinkModalOpen(false);
    onConversationUpdated({
      customerId: newCustomerId,
      customer: newCustomer as any,
      customerLinkStatus: 'manually_linked',
    });
    setOrdersAttempt((a) => a + 1);
  }, [onConversationUpdated]);

  const retryOrders = useCallback(() => {
    setOrdersAttempt((attempt) => attempt + 1);
  }, []);

  return {
    activeTab,
    setActiveTab,
    orders,
    isLoadingOrders,
    ordersError,
    retryOrders,
    isLinkModalOpen,
    setIsLinkModalOpen,
    customerActionError,
    unlinkForm,
    handleUnlink,
    handleLinked,
  };
}
