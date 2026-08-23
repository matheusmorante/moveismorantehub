import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ShoppingBag, Calendar, Hammer, BarChart3 } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  currentTab: string;
  canSeeReports: boolean;
  handleTabChange: (tab: string, url: string) => void;
  WEB_URL: string;
}

export const NativeBottomNav: React.FC<Props> = ({
  isDarkMode,
  currentTab,
  canSeeReports,
  handleTabChange,
  WEB_URL,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const totalNavHeight = 58 + bottomInset;

  return (
    <View style={[
      styles.bottomNav,
      { height: totalNavHeight, paddingBottom: bottomInset },
      isDarkMode && styles.bottomNavDark
    ]}>
      <TouchableOpacity
        style={[styles.navItem, currentTab === 'home' && styles.navItemActive]}
        onPress={() => handleTabChange('home', WEB_URL)}
      >
        <LayoutDashboard size={22} color={currentTab === 'home' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
        <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'pedidos' && styles.navItemActive]}
        onPress={() => handleTabChange('pedidos', `${WEB_URL}/mobile-orders`)}
      >
        <ShoppingBag size={22} color={currentTab === 'pedidos' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'pedidos' ? 2.5 : 2} />
        <Text style={[styles.navText, currentTab === 'pedidos' && styles.navTextActive]}>Pedidos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, (currentTab === 'entregas' || currentTab === 'logistica') && styles.navItemActive]}
        onPress={() => handleTabChange('logistica', `${WEB_URL}/schedule`)}
      >
        <Calendar size={22} color={(currentTab === 'entregas' || currentTab === 'logistica') ? '#2563eb' : '#94a3b8'} strokeWidth={(currentTab === 'entregas' || currentTab === 'logistica') ? 2.5 : 2} />
        <Text style={[styles.navText, (currentTab === 'entregas' || currentTab === 'logistica') && styles.navTextActive]}>Cronograma</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'montagens' && styles.navItemActive]}
        onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
      >
        <Hammer size={22} color={currentTab === 'montagens' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'montagens' ? 2.5 : 2} />
        <Text style={[styles.navText, currentTab === 'montagens' && styles.navTextActive]}>Montagens</Text>
      </TouchableOpacity>

      {canSeeReports && (
        <TouchableOpacity
          style={[styles.navItem, currentTab === 'relatorios' && styles.navItemActive]}
          onPress={() => handleTabChange('relatorios', `${WEB_URL}/mobile-reports`)}
        >
          <BarChart3 size={22} color={currentTab === 'relatorios' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'relatorios' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'relatorios' && styles.navTextActive]}>Relatórios</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 8
  },
  bottomNavDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b'
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3
  },
  navItemActive: {},
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8'
  },
  navTextActive: {
    color: '#2563eb',
    fontWeight: '900'
  }
});
