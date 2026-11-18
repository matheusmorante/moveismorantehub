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

type PendingAssemblySources = { orders: boolean; showcase: boolean };

const emptyPendingAssemblySources = (): PendingAssemblySources => ({ orders: false, showcase: false });

const buildAssemblyList = (orderRows: any[], showcaseData: any[], settings: AppSettings) => {
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

  return [
    ...getOrderAssemblyTasks(orderRows, settings),
    ...showcaseTasks,
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return String(b.createdAt || b.fullData?.created_at || '').localeCompare(
      String(a.createdAt || a.fullData?.created_at || '')
    );
  });
};

export function useAssemblyListQuery(filters: Record<string, unknown> = {}) {
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lastLoadedFiltersKey = useRef<string | null>(null);
  const filtersKey = JSON.stringify(filters);
  const settingsRef = useRef(settings);
  const handlingOptionsKey = JSON.stringify([
    settings.deliveryHandlingOptions || [],
    settings.pickupHandlingOptions || [],
  ]);
  const orderRowsRef = useRef<any[] | null>(null);
  const showcaseDataRef = useRef<any[] | null>(null);
  const activeRequestKind = useRef<'full' | 'partial' | null>(null);
  const pendingSources = useRef<PendingAssemblySources>(emptyPendingAssemblySources());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drainPendingSourcesRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
      settingsRef.current = newSettings;
      setSettingsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchAllAssemblies = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    // A full read covers all changes queued before it starts. New events are
    // queued separately while this request is running.
    pendingSources.current = emptyPendingAssemblySources();
    const current = ++sequence.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    activeRequestKind.current = 'full';
    setLoading(true);
    try {
      const [ordersResult, showcaseData] = await Promise.all([
        fetchAssemblyOrderRows(JSON.parse(filtersKey), request.signal),
        getShowcaseAssemblies(undefined, JSON.parse(filtersKey), request.signal),
      ]);
      if (current !== sequence.current || request.signal.aborted) return;

      orderRowsRef.current = ordersResult;
      showcaseDataRef.current = showcaseData;
      setAssemblies(buildAssemblyList(ordersResult, showcaseData, settingsRef.current));
      lastLoadedFiltersKey.current = filtersKey;
    } catch (error) {
      if (current === sequence.current && !request.signal.aborted) {
        if (lastLoadedFiltersKey.current !== filtersKey) {
          lastLoadedFiltersKey.current = null;
          orderRowsRef.current = null;
          showcaseDataRef.current = null;
          setAssemblies([]);
        }
        console.error('Erro ao buscar montagens:', error);
        toast.error('Erro ao carregar lista de montagens.');
      }
    } finally {
      if (current === sequence.current) {
        activeRequestKind.current = null;
        setLoading(false);
        void Promise.resolve().then(() => drainPendingSourcesRef.current());
      }
    }
  }, [filtersKey]);

  const refreshPendingSources = useCallback(async () => {
    const requested = pendingSources.current;
    if ((!requested.orders && !requested.showcase) || activeRequestKind.current) return;

    // If no complete snapshot exists for these filters yet, retain the
    // original full-read contract instead of building a partial list.
    if (
      lastLoadedFiltersKey.current !== filtersKey ||
      orderRowsRef.current === null ||
      showcaseDataRef.current === null
    ) {
      void fetchAllAssemblies();
      return;
    }

    const shouldRefreshOrders = requested.orders;
    const shouldRefreshShowcase = requested.showcase;
    pendingSources.current = emptyPendingAssemblySources();

    const current = ++sequence.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    activeRequestKind.current = 'partial';
    setLoading(true);

    try {
      const [ordersResult, showcaseData] = await Promise.all([
        shouldRefreshOrders
          ? fetchAssemblyOrderRows(JSON.parse(filtersKey), request.signal)
          : Promise.resolve(orderRowsRef.current),
        shouldRefreshShowcase
          ? getShowcaseAssemblies(undefined, JSON.parse(filtersKey), request.signal)
          : Promise.resolve(showcaseDataRef.current),
      ]);
      if (current !== sequence.current || request.signal.aborted) return;

      if (shouldRefreshOrders) orderRowsRef.current = ordersResult;
      if (shouldRefreshShowcase) showcaseDataRef.current = showcaseData;
      setAssemblies(buildAssemblyList(
        orderRowsRef.current || [],
        showcaseDataRef.current || [],
        settingsRef.current
      ));
      lastLoadedFiltersKey.current = filtersKey;
    } catch (error) {
      if (current === sequence.current && !request.signal.aborted) {
        // Keep the last complete list when a partial refresh fails.
        console.error('Erro ao atualizar montagens:', error);
        toast.error('Erro ao atualizar lista de montagens.');
      }
    } finally {
      if (current === sequence.current) {
        activeRequestKind.current = null;
        setLoading(false);
        void Promise.resolve().then(() => drainPendingSourcesRef.current());
      }
    }
  }, [fetchAllAssemblies, filtersKey]);

  drainPendingSourcesRef.current = () => { void refreshPendingSources(); };

  useEffect(() => {
    if (settingsLoaded) fetchAllAssemblies();
    return () => {
      sequence.current += 1;
      controller.current?.abort();
      activeRequestKind.current = null;
    };
  }, [fetchAllAssemblies, settingsLoaded]);

  useEffect(() => {
    if (
      !settingsLoaded ||
      lastLoadedFiltersKey.current !== filtersKey ||
      orderRowsRef.current === null ||
      showcaseDataRef.current === null
    ) {
      return;
    }

    setAssemblies(buildAssemblyList(
      orderRowsRef.current,
      showcaseDataRef.current,
      settingsRef.current
    ));
  }, [filtersKey, handlingOptionsKey, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;

    let hasSubscribedOnce = false;
    const requestSourceRefresh = (source: keyof PendingAssemblySources) => {
      pendingSources.current[source] = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        drainPendingSourcesRef.current();
      }, 3000);
    };

    const channel = supabase
      .channel(`assembly-list-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => requestSourceRefresh('orders')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'showroom_assemblies' },
        () => requestSourceRefresh('showcase')
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (!hasSubscribedOnce) {
          hasSubscribedOnce = true;
          return;
        }
        // The initial subscribe follows the initial full read. A later
        // SUBSCRIBED means the channel rejoined and may have missed changes.
        void fetchAllAssemblies();
      });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      pendingSources.current = emptyPendingAssemblySources();
      supabase.removeChannel(channel);
    };
  }, [fetchAllAssemblies, settingsLoaded]);

  return {
    assemblies,
    loading,
    refetchAssemblies: fetchAllAssemblies,
  };
}
