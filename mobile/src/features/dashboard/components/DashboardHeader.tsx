import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Moon, Sun } from 'lucide-react-native';

const MORANTE_LOGO = require('../../../../assets/logo-morante.png');

interface Props {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  userProfile: any;
  setShowProfileModal: (val: boolean) => void;
  handleOpenNotificationsModal: () => void;
  unreadCount: number;
}

export const DashboardHeader: React.FC<Props> = ({
  isDarkMode,
  setIsDarkMode,
  userProfile,
  setShowProfileModal,
  handleOpenNotificationsModal,
  unreadCount,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: topInset,
      paddingBottom: 12,
      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    }}>
      {/* Marca da empresa */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 92,
          height: 52,
          overflow: 'hidden',
        }}>
          <Image
            source={MORANTE_LOGO}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Lado Direito: Dark Mode, Notificações e Botão de Perfil */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Toggle Dark Mode */}
        <TouchableOpacity
          onPress={() => setIsDarkMode(prev => !prev)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            elevation: 1
          }}
        >
          {isDarkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
        </TouchableOpacity>

        {/* Notificações Bell Icon */}
        <TouchableOpacity
          onPress={handleOpenNotificationsModal}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            elevation: 1,
            position: 'relative'
          }}
        >
          <Bell size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: '#ef4444',
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              borderWidth: 2,
              borderColor: isDarkMode ? '#0f172a' : '#f8fafc'
            }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffffff' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botão de Perfil do Lado Direito */}
        <TouchableOpacity
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 2,
            shadowColor: '#2563eb',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4
          }}
          onPress={() => setShowProfileModal(true)}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>
            {(userProfile?.fullName || 'M')[0].toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
