import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, subscribeToSettings, AppSettings } from '@/pages/utils/settingsService';
import { getShowcaseAssemblies } from '@/pages/utils/showcaseAssemblyService';
import { toast } from 'react-toastify';
import { fetchAssemblyOrderRows } from '../services/assemblyOrderListService';
import {
  parseOrderDate,
  getOrderAssemblyTasks,
} from './assemblyListHelpers';

export function useAssemblyListQuery() {
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const fetchInProgress = useRef(false);
  const refetchRequested = useRef(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
      settingsRef.current = newSettings;
      setSettingsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchAllAssemblies = useCallback(async () => {
    if (fetchInProgress.current) {
      refetchRequested.current = true;
      return;
    }
    fetchInProgress.current = true;
    setLoading(true);
    try {
      const [ordersResult, showcaseData] = await Promise.all([
        fetchAssemblyOrderRows(),
        getShowcaseAssemblies(),
      ]);

      const showcaseTasks = showcaseData.map((assembly) => ({
        id: assembly.id || '',
        origin: 'showcase' as const,
        title: assembly.description,
        subtitle: assembly.observation || 'MOSTRUÁRIO',
        date: parseOrderDate(assembly.date),
        items: [{ description: assembly.description, quantity: assembly.quantity }],
        status: assembly.status === 'completed' ? 'fulfilled' : 'scheduled',
        observation: assembly.observation || '',
        fullData: assembly,
      }));

      const unified = [
        ...getOrderAssemblyTasks(ordersResult, settingsRef.current),
        ...showcaseTasks,
      ].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return String(b.createdAt || b.fullData?.created_at || '').localeCompare(
          String(a.createdAt || a.fullData?.created_at || '')
        );
      });

      setAssemblies(unified);
    } catch (error) {
      console.error('Erro ao buscar montagens:', error);
      toast.error('Erro ao carregar lista de montagens.');
    } finally {
      fetchInProgress.current = false;
      setLoading(false);
      if (refetchRequested.current) {
        refetchRequested.current = false;
        void fetchAllAssemblies();
      }
    }
  }, []);

  useEffect(() => {
    if (settingsLoaded) fetchAllAssemblies();
  }, [fetchAllAssemblies, settings, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const requestFetchAssemblies = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAllAssemblies();
      }, 3000);
    };

    const channel = supabase
      .channel(`assembly-list-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        requestFetchAssemblies
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'showroom_assemblies' },
        requestFetchAssemblies
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchAllAssemblies, settingsLoaded]);

  return {
    assemblies,
    loading,
    refetchAssemblies: fetchAllAssemblies,
  };
}
