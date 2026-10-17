import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { crmIntelligenceService, CustomerDesire } from '@/pages/utils/crmIntelligenceService';
import { redeConciliationService } from '@/pages/services/redeConciliationService';
import { SupabaseAnomalyNotification } from '../types';

interface UseGlobalAppEventsOptions {
  isAdmin?: boolean;
}

export function useGlobalAppEvents({ isAdmin = false }: UseGlobalAppEventsOptions = {}) {
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isAssistanceModalOpen, setIsAssistanceModalOpen] = useState(false);
  const [assistanceInitialData, setAssistanceInitialData] = useState<unknown>(null);
  const [anomaly, setAnomaly] = useState<SupabaseAnomalyNotification | null>(null);

  useEffect(() => {
    const handleOpenAssistance = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      setAssistanceInitialData(customEvent.detail);
      setIsAssistanceModalOpen(true);
    };

    const handleRegisterDesire = async (e: Event) => {
      const customEvent = e as CustomEvent<CustomerDesire>;
      try {
        await crmIntelligenceService.registerProductDesire(customEvent.detail);
        toast.success(`Desejo registrado: ${customEvent.detail?.product_name || 'Produto'} ✨`);
      } catch {
        toast.error('Erro ao registrar desejo.');
      }
    };

    window.addEventListener('OPEN_ASSISTANCE_MODAL', handleOpenAssistance);
    window.addEventListener('REGISTER_CUSTOMER_DESIRE', handleRegisterDesire);

    return () => {
      window.removeEventListener('OPEN_ASSISTANCE_MODAL', handleOpenAssistance);
      window.removeEventListener('REGISTER_CUSTOMER_DESIRE', handleRegisterDesire);
    };
  }, []);

  useEffect(() => {
    const handleOpenAgent = () => setIsAgentOpen(true);
    window.addEventListener('morante:open-agent', handleOpenAgent);
    return () => window.removeEventListener('morante:open-agent', handleOpenAgent);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const handleAnomaly = (e: Event) => {
      const customEvent = e as CustomEvent<SupabaseAnomalyNotification>;
      setAnomaly(customEvent.detail);
    };
    window.addEventListener('SUPABASE_ANOMALY', handleAnomaly);
    return () => window.removeEventListener('SUPABASE_ANOMALY', handleAnomaly);
  }, [isAdmin]);

  useEffect(() => {
    // Polling de transações Rede a cada 5 minutos (evita consumo massivo de Egress)
    const syncInterval = setInterval(() => {
      redeConciliationService.syncPendingTransactions();
    }, 300000);

    // Primeira execução imediata
    redeConciliationService.syncPendingTransactions();

    return () => clearInterval(syncInterval);
  }, []);

  return {
    isAgentOpen,
    setIsAgentOpen,
    isAssistanceModalOpen,
    setIsAssistanceModalOpen,
    assistanceInitialData,
    setAssistanceInitialData,
    anomaly,
    setAnomaly,
  };
}
