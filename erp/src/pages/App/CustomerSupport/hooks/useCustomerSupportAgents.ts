import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssignedProfileSummary } from '../types';
import { fetchTeamProfiles } from '@/pages/utils/customerSupport/customerSupportService';

export function useCustomerSupportAgents(supabase: SupabaseClient, userId?: string) {
  const [agents, setAgents] = useState<AssignedProfileSummary[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentReloadKey, setAgentReloadKey] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAgents([]);
    setAgentsError(null);
    setIsLoadingAgents(Boolean(userId));
    if (userId) {
      fetchTeamProfiles(supabase)
        .then((profiles) => {
          if (active) setAgents(profiles);
        })
        .catch(() => {
          if (active) setAgentsError('Não foi possível carregar os atendentes. Tente novamente.');
        })
        .finally(() => {
          if (active) setIsLoadingAgents(false);
        });
    }
    return () => {
      active = false;
    };
  }, [userId, agentReloadKey, supabase]);

  const reloadAgents = () => setAgentReloadKey((key) => key + 1);

  return {
    agents,
    isLoadingAgents,
    agentsError,
    activeAgentId,
    setActiveAgentId,
    reloadAgents,
  };
}
