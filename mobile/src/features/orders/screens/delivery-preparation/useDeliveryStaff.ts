import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../services/supabaseClient';
import { offlineStorageService } from '../../../../services/offline/offlineStorageService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import {
  DeliveryResponsibleItem,
  AvailableStaffMember,
  DeliveryStaffSearchFeedback,
} from './deliveryPreparation.types';
import {
  resolveInitialDeliveryResponsibles,
  addDeliveryResponsible,
  filterUnaddedStaff,
  removeDeliveryResponsible,
} from './deliveryStaffRules';
import {
  isTestOperator,
  isTestOperatorVisibleToUser,
} from '../../../../../../shared-utils/testOperatorVisibility';
import {
  getGrantedNonAccountantAccessRoles,
  hasGrantedNonAccountantAccessProfile,
} from '../../../../../../shared-utils/operationalCollaborators';
import { matchesSearchText, normalizeSearchTerm } from '../../../../../../shared-utils/searchText';

const DELIVERY_STAFF_CACHE_KEY_PREFIX = 'delivery_staff_search_v2';
const MAX_CACHED_SEARCHES = 12;

interface CachedStaffMember extends AvailableStaffMember {
  // Guardado apenas para perfis de teste, para revalidar a regra sem persistir
  // o e-mail de todos os colaboradores no cache local.
  testOperatorEmail?: string | null;
}

interface CachedStaffSearch {
  query: string;
  cachedAt: string;
  staff: CachedStaffMember[];
}

interface DeliveryStaffCache {
  accountId: string;
  entries: CachedStaffSearch[];
}

const cacheKeyForAccount = (accountId: string) =>
  `${DELIVERY_STAFF_CACHE_KEY_PREFIX}:${encodeURIComponent(accountId)}`;

const publicStaffRows = (rows: CachedStaffMember[]): AvailableStaffMember[] =>
  rows.map(({ testOperatorEmail: _testOperatorEmail, ...staff }) => staff);

const matchesCurrentVisibility = (
  staff: CachedStaffMember,
  userEmail?: string | null
): boolean =>
  hasGrantedNonAccountantAccessProfile(staff) &&
  isTestOperatorVisibleToUser(
    { fullName: staff.fullName, email: staff.testOperatorEmail },
    userEmail
  );

const formatCachedAt = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('pt-BR');
};

interface UseDeliveryStaffOptions {
  order: any;
  userProfile?: any;
}

export function useDeliveryStaff({ order, userProfile }: UseDeliveryStaffOptions) {
  const [responsibles, setResponsibles] = useState<DeliveryResponsibleItem[]>(() =>
    resolveInitialDeliveryResponsibles(order, userProfile)
  );
  const responsiblesRef = useRef(responsibles);
  responsiblesRef.current = responsibles;

  const [availableStaff, setAvailableStaff] = useState<AvailableStaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearchFeedback, setStaffSearchFeedback] =
    useState<DeliveryStaffSearchFeedback | null>(null);
  const requestVersionRef = useRef(0);
  const latestSearchRef = useRef('');
  const cacheWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const accountId = typeof userProfile?.id === 'string' ? userProfile.id : '';
  const userEmail = typeof userProfile?.email === 'string' ? userProfile.email : '';

  useEffect(() => {
    const initialResponsibles = resolveInitialDeliveryResponsibles(order, userProfile);
    if (initialResponsibles.length === 0) return;

    setResponsibles((current) =>
      current.length > 0 ? current : initialResponsibles
    );
  }, [order, userProfile]);

  useEffect(() => {
    requestVersionRef.current += 1;
    latestSearchRef.current = '';
    setAvailableStaff([]);
    setLoadingStaff(false);
    setStaffSearchFeedback(null);
  }, [accountId, userEmail]);

  const getAccountCache = useCallback(async (
    targetAccountId: string
  ): Promise<DeliveryStaffCache | null> => {
    if (!targetAccountId) return null;
    try {
      const cached = await offlineStorageService.getWorkingSet<DeliveryStaffCache>(
        cacheKeyForAccount(targetAccountId)
      );
      if (
        !cached?.data ||
        cached.data.accountId !== targetAccountId ||
        !Array.isArray(cached.data.entries)
      ) return null;
      return cached.data;
    } catch {
      return null;
    }
  }, []);

  const findCachedMatches = useCallback(async (
    targetAccountId: string,
    query: string,
    currentEmail: string
  ): Promise<{ staff: CachedStaffMember[]; cachedAt?: string; hasCache: boolean }> => {
    const cache = await getAccountCache(targetAccountId);
    if (!cache) return { staff: [], hasCache: false };

    const matchingEntries = cache.entries.filter((entry) =>
      entry.staff.some((staff) =>
        matchesSearchText(`${staff.fullName} ${staff.role || ''}`, query)
      )
    );
    const newestMatchingEntry = [...matchingEntries].sort((left, right) =>
      right.cachedAt.localeCompare(left.cachedAt)
    )[0];
    const candidates = new Map<string, CachedStaffMember>();

    for (const entry of cache.entries) {
      for (const staff of entry.staff) {
        if (
          matchesCurrentVisibility(staff, currentEmail) &&
          matchesSearchText(`${staff.fullName} ${staff.role || ''}`, query)
        ) {
          candidates.set(staff.id, staff);
        }
      }
    }

    const visible = filterUnaddedStaff(
      Array.from(candidates.values()),
      responsiblesRef.current
    ).slice(0, 5);

    return {
      staff: visible,
      cachedAt: newestMatchingEntry?.cachedAt || cache.entries[0]?.cachedAt,
      hasCache: cache.entries.length > 0,
    };
  }, [getAccountCache]);

  const searchStaff = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    const normalizedQuery = normalizeSearchTerm(query);
    const requestVersion = ++requestVersionRef.current;
    const isCurrentRequest = () => requestVersionRef.current === requestVersion;

    if (normalizedQuery.length < 3) {
      latestSearchRef.current = '';
      setAvailableStaff([]);
      setLoadingStaff(false);
      setStaffSearchFeedback(null);
      return;
    }

    latestSearchRef.current = query;
    setLoadingStaff(true);
    setAvailableStaff([]);
    setStaffSearchFeedback(null);

    const currentAccountId = accountId;
    const currentEmail = userEmail;

    const showLocalResults = async (kind: 'local' | 'offline-empty' | 'error') => {
      const cached = await findCachedMatches(currentAccountId, normalizedQuery, currentEmail);
      if (!isCurrentRequest()) return;

      const localStaff = filterUnaddedStaff(
        cached.staff,
        responsiblesRef.current
      );
      setAvailableStaff(publicStaffRows(localStaff));

      if (localStaff.length > 0) {
        const cachedAt = formatCachedAt(cached.cachedAt);
        setStaffSearchFeedback({
          kind: 'local',
          message: cachedAt
            ? `Resultados salvos no aparelho em ${cachedAt}; podem estar desatualizados.`
            : 'Resultados salvos no aparelho; podem estar desatualizados.',
        });
        return;
      }

      if (kind === 'error') {
        setStaffSearchFeedback({
          kind: 'error',
          message: cached.hasCache
            ? 'Não foi possível atualizar. Não há resultados locais para esta busca.'
            : 'Não foi possível pesquisar agora. Tente novamente quando a conexão voltar.',
        });
        return;
      }

      setStaffSearchFeedback({
        kind: 'offline-empty',
        message: 'Sem conexão e sem resultados salvos para esta busca. Conecte-se para pesquisar.',
      });
    };

    if (!connectivityService.connected) {
      await showLocalResults('offline-empty');
      if (isCurrentRequest()) setLoadingStaff(false);
      return;
    }

    try {
      const currentResponsibles = responsiblesRef.current;
      const excludedProfileIds = currentResponsibles
        .map((responsible) => responsible.id)
        .filter((id): id is string => Boolean(id));
      const excludedNames = currentResponsibles
        .map((responsible) => responsible.name)
        .filter((name) => Boolean(name?.trim()));

      const { data, error } = await (supabase as any).rpc('search_delivery_staff', {
        p_search: query,
        p_excluded_profile_ids: excludedProfileIds,
        p_excluded_names: excludedNames,
      });
      if (error) throw error;
      if (!isCurrentRequest()) return;

      const cacheRows: CachedStaffMember[] = (Array.isArray(data) ? data : [])
        .filter((profile: any) =>
          isTestOperatorVisibleToUser(profile, currentEmail) &&
          hasGrantedNonAccountantAccessProfile(profile) &&
          Boolean(profile.full_name?.trim())
        )
        .map((profile: any) => {
          const staff: CachedStaffMember = {
            id: profile.id,
            fullName: profile.full_name.trim(),
            role: getGrantedNonAccountantAccessRoles(profile)[0],
          };
          if (isTestOperator(profile)) staff.testOperatorEmail = profile.email;
          return staff;
        });
      const selectedFilteredRows = filterUnaddedStaff(
        cacheRows.filter((staff) =>
          matchesSearchText(`${staff.fullName} ${staff.role || ''}`, normalizedQuery)
        ),
        currentResponsibles
      ).slice(0, 5);

      setAvailableStaff(publicStaffRows(selectedFilteredRows));
      setStaffSearchFeedback(null);

      if (currentAccountId) {
        const cacheWrite = cacheWriteQueueRef.current.then(async () => {
          const existing = await getAccountCache(currentAccountId);
          const nextEntry: CachedStaffSearch = {
            query: normalizedQuery,
            cachedAt: new Date().toISOString(),
            staff: selectedFilteredRows,
          };
          const nextCache: DeliveryStaffCache = {
            accountId: currentAccountId,
            entries: [
              nextEntry,
              ...(existing?.entries || []).filter(
                (entry) => entry.query !== normalizedQuery
              ),
            ].slice(0, MAX_CACHED_SEARCHES),
          };
          await offlineStorageService.cacheWorkingSet(
            cacheKeyForAccount(currentAccountId),
            nextCache
          );
        });
        cacheWriteQueueRef.current = cacheWrite.catch(() => {});
        await cacheWrite;
      }
    } catch (error) {
      if (isCurrentRequest()) {
        console.warn('[useDeliveryStaff] Falha ao pesquisar responsáveis pela entrega.');
        await showLocalResults(connectivityService.connected ? 'error' : 'offline-empty');
      }
    } finally {
      if (isCurrentRequest()) setLoadingStaff(false);
    }
  }, [accountId, findCachedMatches, getAccountCache, userEmail]);

  const searchStaffRef = useRef(searchStaff);
  searchStaffRef.current = searchStaff;

  useEffect(() => {
    let wasConnected = connectivityService.connected;
    const unsubscribe = connectivityService.subscribe((connected) => {
      const reconnected = connected && !wasConnected;
      wasConnected = connected;
      const activeSearch = latestSearchRef.current;
      if (reconnected && activeSearch.length >= 3) {
        void searchStaffRef.current(activeSearch);
      }
    });
    return unsubscribe;
  }, []);

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
    loadingStaff,
    staffSearchFeedback,
    searchStaff,
    handleAddResponsible,
    handleRemoveResponsible,
  };
}
