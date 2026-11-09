import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { useScopedOrderSchedule } from '../../logistics/hooks/useScopedOrderSchedule';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import type { AssemblyHandlingOption } from '../../../utils/aiSummaryHelper';
import { addDaysToLocalDateString, getLocalDateString } from '../../../utils/orderUtils';
import type { AssemblyTask } from '../assemblyTasks';
import { AssemblyOrderCard } from '../components/AssemblyOrderCard';
import { getAssemblyTasks } from '../assemblyTasks';
import { styles } from './nativeAssembliesScreen.styles';

const ASSEMBLIES_CACHE_KEY = 'assemblies_orders';
const HANDLING_OPTIONS_CACHE_KEY = 'order_handling_options_v1';

interface Props {
  isDarkMode: boolean;
  initialSubTab?: 'all' | 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
  dateScope?: 'today' | 'tomorrow' | 'next_days';
  handlingOptions?: AssemblyHandlingOption[];
}

type AssemblyLocationFilter = 'all' | 'internal' | 'outside';

const LOCATION_FILTER_TONES: Record<
  AssemblyLocationFilter,
  {
    background: string;
    backgroundDark: string;
    border: string;
    borderDark: string;
    text: string;
    textDark: string;
    active: string;
    activeDark: string;
  }
> = {
  all: {
    background: '#eff6ff',
    backgroundDark: '#172554',
    border: '#bfdbfe',
    borderDark: '#1e40af',
    text: '#1d4ed8',
    textDark: '#bfdbfe',
    active: '#2563eb',
    activeDark: '#1d4ed8',
  },
  internal: {
    background: '#fffbeb',
    backgroundDark: '#451a03',
    border: '#fde68a',
    borderDark: '#92400e',
    text: '#b45309',
    textDark: '#fcd34d',
    active: '#f59e0b',
    activeDark: '#b45309',
  },
  outside: {
    background: '#fef2f2',
    backgroundDark: '#450a0a',
    border: '#fecaca',
    borderDark: '#991b1b',
    text: '#b91c1c',
    textDark: '#fca5a5',
    active: '#dc2626',
    activeDark: '#b91c1c',
  },
};

const formatUpcomingDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const title = weekday.charAt(0).toLocaleUpperCase('pt-BR') + weekday.slice(1);
  return `${title}, ${day}/${String(month).padStart(2, '0')}`;
};

const getScheduledTimeKey = (value?: string) => {
  const normalized = String(value || '').toLocaleLowerCase('pt-BR');
  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  if (normalized.includes('manhã') || normalized.includes('manha')) return '08:00';
  if (normalized.includes('tarde') || normalized.includes('noite')) return '13:00';
  return '99:99';
};

const webStickyHeaderStyle =
  Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 10 } as any) : undefined;

export const NativeAssembliesScreen: React.FC<Props> = ({
  isDarkMode,
  initialSubTab = 'all',
  onSelectOrder,
  dateScope,
  handlingOptions: sharedHandlingOptions,
}) => {
  const [loadedHandlingOptions, setLoadedHandlingOptions] = useState<AssemblyHandlingOption[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [locationFilter, setLocationFilter] = useState<AssemblyLocationFilter>(initialSubTab);
  const todayKey = getLocalDateString(new Date());
  const { orders, loading, refreshing, showingOffline, error, counts, onRefresh: refreshOrders } =
    useScopedOrderSchedule('assembly_mobile', { dateScope, location: locationFilter, startDate: todayKey }, ASSEMBLIES_CACHE_KEY);
  const hasExternalHandlingOptions = sharedHandlingOptions !== undefined;
  const handlingOptionsRequestRef = useRef<{
    authGeneration: number;
    promise: Promise<void>;
  } | null>(null);
  const handlingOptionsAuthGenerationRef = useRef(0);

  useEffect(() => setLocationFilter(initialSubTab), [initialSubTab]);

  const fetchSettings = async () => {
    const authGeneration = handlingOptionsAuthGenerationRef.current;
    const current = handlingOptionsRequestRef.current;
    if (current?.authGeneration === authGeneration) return current.promise;

    const promise = (async () => {
      try {
        const { data, error } = await withAbortTimeout(supabase.from('settings').select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions').eq('id', 'app').limit(1), 'montagens:opcoes-manuseio', 15_000);
        if (!error && data?.length) {
          const settings = data[0] as { delivery?: AssemblyHandlingOption[]; pickup?: AssemblyHandlingOption[] };
          const opts = [
            ...(Array.isArray(settings.delivery) ? settings.delivery : []),
            ...(Array.isArray(settings.pickup) ? settings.pickup : []),
          ];
          setLoadedHandlingOptions(opts);
          await offlineStorageService
            .cacheWorkingSet(HANDLING_OPTIONS_CACHE_KEY, opts)
            .catch(() => {});
          return;
        }
      } catch {}

      try {
        const cached =
          await offlineStorageService.getWorkingSet<any[]>(HANDLING_OPTIONS_CACHE_KEY);
        if (Array.isArray(cached?.data)) {
          setLoadedHandlingOptions(cached.data);
        }
      } catch {}
    })();
    const pendingRequest = { authGeneration, promise };
    handlingOptionsRequestRef.current = pendingRequest;

    try {
      await promise;
    } finally {
      if (handlingOptionsRequestRef.current === pendingRequest) {
        handlingOptionsRequestRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (hasExternalHandlingOptions) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      handlingOptionsAuthGenerationRef.current += 1;
      handlingOptionsRequestRef.current = null;
    });
    return () => {
      handlingOptionsAuthGenerationRef.current += 1;
      handlingOptionsRequestRef.current = null;
      subscription.unsubscribe();
    };
  }, [hasExternalHandlingOptions]);

  useEffect(() => {
    if (!hasExternalHandlingOptions) void fetchSettings();
  }, [hasExternalHandlingOptions]);

  const onRefresh = () => {
    refreshOrders();
    if (!hasExternalHandlingOptions) void fetchSettings();
  };

  const handlingOptions = sharedHandlingOptions ?? loadedHandlingOptions;
  const allTasks = useMemo(
    () => getAssemblyTasks(orders, handlingOptions),
    [orders, handlingOptions]
  );
  const tomorrowKey = addDaysToLocalDateString(todayKey, 1);
  const periodTasks = useMemo(
    () =>
      allTasks
        .filter((task) =>
          dateScope === 'today'
            ? task.dateKey === todayKey
            : dateScope === 'tomorrow'
              ? task.dateKey === tomorrowKey
              : dateScope === 'next_days'
                ? task.dateKey > tomorrowKey
                : true
        )
        .sort(
          (a, b) =>
            a.dateKey.localeCompare(b.dateKey) ||
            getScheduledTimeKey(a.scheduledTime).localeCompare(
              getScheduledTimeKey(b.scheduledTime)
            )
        ),
    [allTasks, dateScope, todayKey, tomorrowKey]
  );
  const locationCounts = showingOffline ? {
    all: periodTasks.length,
    internal: periodTasks.filter((task) => !task.isOutside).length,
    outside: periodTasks.filter((task) => task.isOutside).length,
  } : { all: counts.all || 0, internal: counts.internal || 0, outside: counts.outside || 0 };
  const tasks = periodTasks.filter(
    (task) =>
      locationFilter === 'all' ||
      (locationFilter === 'internal' ? !task.isOutside : task.isOutside)
  );
  const todayTasks = tasks.filter((task) => task.dateKey === todayKey);
  const upcomingTasks = tasks.filter((task) => task.dateKey > todayKey);
  const upcomingSections = Array.from(
    upcomingTasks.reduce((groups, task) => {
      const group = groups.get(task.dateKey) || [];
      group.push(task);
      groups.set(task.dateKey, group);
      return groups;
    }, new Map<string, AssemblyTask[]>()),
    ([dateKey, data]) => ({ key: dateKey, title: formatUpcomingDate(dateKey), data })
  );
  const defaultExpandedSectionKey =
    dateScope === 'tomorrow' || dateScope === 'next_days' ? upcomingSections[0]?.key : 'today';
  const sections = [
    ...(todayTasks.length
      ? [{ key: 'today', title: 'Hoje', data: todayTasks }]
      : []),
    ...upcomingSections,
  ].map((section) => {
    const isCollapsed = collapsedSections[section.key] ?? section.key !== defaultExpandedSectionKey;
    return { ...section, count: section.data.length, data: isCollapsed ? [] : section.data };
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [key]: !(previous[key] ?? key !== defaultExpandedSectionKey),
    }));
  };
  const emptyMessage =
    periodTasks.length > 0
      ? 'Nenhuma montagem para este local no período.'
      : dateScope === 'today'
        ? 'Nenhuma montagem agendada para hoje.'
        : dateScope === 'tomorrow'
          ? 'Nenhuma montagem agendada para amanhã.'
          : dateScope === 'next_days'
            ? 'Nenhuma montagem agendada para os próximos dias.'
            : 'Nenhuma montagem para hoje ou próximos dias.';
  const locationFilterOptions: {
    key: AssemblyLocationFilter;
    label: string;
    count: number;
  }[] = [
    { key: 'all', label: 'Todas', count: locationCounts.all },
    { key: 'internal', label: 'No depósito', count: locationCounts.internal },
    { key: 'outside', label: 'Fora', count: locationCounts.outside },
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {showingOffline ? <Text style={styles.emptyText}>Sem conexão. Exibindo os pedidos salvos neste aparelho.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.emptyText}>{error}</Text> : null}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Carregando montagens...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.locationFilters}>
                {locationFilterOptions.map((option) => {
                  const isSelected = locationFilter === option.key;
                  const tone = LOCATION_FILTER_TONES[option.key];
                  const textColor = isSelected
                    ? '#ffffff'
                    : isDarkMode
                      ? tone.textDark
                      : tone.text;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.locationFilter,
                        {
                          backgroundColor: isSelected
                            ? isDarkMode
                              ? tone.activeDark
                              : tone.active
                            : isDarkMode
                              ? tone.backgroundDark
                              : tone.background,
                          borderColor: isSelected
                            ? isDarkMode
                              ? tone.activeDark
                              : tone.active
                            : isDarkMode
                              ? tone.borderDark
                              : tone.border,
                        },
                      ]}
                      onPress={() => setLocationFilter(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.locationFilterText,
                          { color: textColor },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.locationFilterCount,
                          { color: textColor },
                        ]}
                      >
                        {option.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>{emptyMessage}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
          }
          renderSectionHeader={({ section }) => {
            const isCollapsed =
              collapsedSections[section.key] ?? section.key !== defaultExpandedSectionKey;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
                style={[
                  styles.sectionHeader,
                  webStickyHeaderStyle,
                  isDarkMode && styles.sectionHeaderDark,
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded: !isCollapsed }}
              >
                <View style={styles.sectionHeaderLeft}>
                  <CalendarIcon size={16} color="#2563eb" />
                  <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <Text style={[styles.sectionHeaderCount, isDarkMode && styles.sectionHeaderCountDark]}>
                    {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                  </Text>
                  {isCollapsed ? (
                    <ChevronRight size={18} color="#2563eb" />
                  ) : (
                    <ChevronDown size={18} color="#2563eb" />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => (
            <AssemblyOrderCard
              order={item.order}
              item={item.item}
              isOutside={item.isOutside}
              isDarkMode={isDarkMode}
              scheduledTime={item.scheduledTime}
              responsibleName={item.responsibleName}
              onPress={() => onSelectOrder?.(item.order)}
            />
          )}
        />
      )}
    </View>
  );
};
