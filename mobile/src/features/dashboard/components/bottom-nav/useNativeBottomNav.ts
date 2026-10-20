import { useState, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShoppingBag,
  Package,
  Calendar,
  BarChart3,
  Wallet,
  Sparkles,
  Route,
} from 'lucide-react-native';
import { NavItemConfig } from './bottomNav.types';

interface UseNativeBottomNavProps {
  currentTab: string;
  canSeeReports: boolean;
  canSeeProducts?: boolean;
  canSeeFinance?: boolean;
  isAdmin?: boolean;
  WEB_URL: string;
  customTabs?: NavItemConfig[];
}

export function useNativeBottomNav({
  currentTab,
  canSeeReports,
  canSeeProducts,
  canSeeFinance = true,
  isAdmin = false,
  WEB_URL,
  customTabs,
}: UseNativeBottomNavProps) {
  const insets = useSafeAreaInsets();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const totalNavHeight = 58 + bottomInset;

  // Lista base de todas as abas configuradas para o app móvel
  const allTabs: NavItemConfig[] = useMemo(
    () => [
      {
        key: 'entregas',
        label: 'Operações',
        icon: Route,
        url: `${WEB_URL}/schedule`,
        visible: true,
      },
      {
        key: 'agenda',
        label: 'Agenda',
        icon: Calendar,
        url: `${WEB_URL}/schedule`,
        visible: true,
      },
      {
        key: 'agente',
        label: 'Assistente',
        icon: Sparkles,
        url: `${WEB_URL}/agent`,
        visible: true,
        disabled: !isAdmin,
      },
      {
        key: 'pedidos',
        label: 'Pedidos',
        icon: ShoppingBag,
        url: `${WEB_URL}/mobile-orders`,
        visible: true,
      },
      {
        key: 'financeiro',
        label: 'Financeiro',
        icon: Wallet,
        url: `${WEB_URL}/mobile-finance`,
        visible: canSeeFinance,
      },
      {
        key: 'produtos',
        label: 'Produtos',
        icon: Package,
        url: `${WEB_URL}/products`,
        visible: Boolean(canSeeProducts),
      },
      {
        key: 'relatorios',
        label: 'Relatórios',
        icon: BarChart3,
        url: `${WEB_URL}/mobile-reports`,
        visible: canSeeReports,
      },
      {
        key: 'estoque',
        label: 'Estoque',
        icon: Package,
        url: `${WEB_URL}/stock`,
        visible: true,
      },
    ],
    [WEB_URL, isAdmin, canSeeFinance, canSeeProducts, canSeeReports]
  );

  // Filtra apenas abas visíveis para o perfil do usuário
  const visibleTabs = useMemo(() => {
    return (customTabs || allTabs)
      .filter((t) => t.visible !== false)
      .map((tab) => (tab.key === 'agente' ? { ...tab, disabled: !isAdmin } : tab));
  }, [customTabs, allTabs, isAdmin]);

  const hasOverflow = visibleTabs.length > 5;
  const primaryTabs = useMemo(
    () => (hasOverflow ? visibleTabs.slice(0, 4) : visibleTabs),
    [hasOverflow, visibleTabs]
  );
  const overflowTabs = useMemo(
    () => (hasOverflow ? visibleTabs.slice(4) : []),
    [hasOverflow, visibleTabs]
  );

  const isTabActive = useCallback(
    (key: string) => {
      if (key === 'agenda' || key === 'logistica') {
        return currentTab === 'agenda' || currentTab === 'logistica' || currentTab === 'cronograma';
      }
      if (key === 'entregas') return currentTab === 'entregas' || currentTab === 'montagens';
      return currentTab === key;
    },
    [currentTab]
  );

  const isOverflowTabActive = useMemo(() => {
    return overflowTabs.some((t) => {
      if (t.key === 'agenda' || t.key === 'logistica') {
        return currentTab === 'agenda' || currentTab === 'logistica' || currentTab === 'cronograma';
      }
      return currentTab === t.key;
    });
  }, [overflowTabs, currentTab]);

  return {
    primaryTabs,
    overflowTabs,
    hasOverflow,
    showMoreSheet,
    setShowMoreSheet,
    isTabActive,
    isOverflowTabActive,
    bottomInset,
    totalNavHeight,
  };
}
