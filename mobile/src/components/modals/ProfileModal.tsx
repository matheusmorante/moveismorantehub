import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShieldCheck, Settings, LogOut, RefreshCw, BellRing } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { checkAndUpdateManually } from '../../hooks/useExpoAutoUpdate';
import { testRemotePushNotification } from '../../services/notificationService';
import { APP_VERSION, APP_BUILD } from '../../constants/appVersion';
import { styles } from './ProfileModalStyles';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  userProfile: any;
  isAdmin: boolean;
  isAssemblerDriver: boolean;
  handleTabChange: (tab: string, url: string) => void;
  handleLogout: () => void;
  WEB_URL: string;
}

export const ProfileModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode,
  userProfile,
  isAdmin,
  isAssemblerDriver,
  handleTabChange,
  handleLogout,
  WEB_URL,
}) => {
  const insets = useSafeAreaInsets();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    await checkAndUpdateManually();
    setCheckingUpdate(false);
  };

  const handleTestNotif = async () => {
    setTestingNotif(true);
    await testRemotePushNotification();
    setTestingNotif(false);
  };

  const currentUpdateId = Updates.updateId ? `#${Updates.updateId.substring(0, 8)}` : 'OTA Ativa';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.profileModalContent, isDarkMode && styles.modalContentDark]}>
          {/* Topo do Modal */}
          <View style={styles.profileModalTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.profileModalTitle, isDarkMode && styles.textPrimaryDark]}>Perfil</Text>
              <View style={[styles.versionBadge, isDarkMode && styles.versionBadgeDark]}>
                <Text style={styles.versionBadgeText}>v{APP_VERSION}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeModalButton, isDarkMode && styles.iconButtonDark]}
              onPress={onClose}
            >
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.profileScrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 32 }]}
          >
          {/* Cartão do Usuário */}
          <View style={[styles.profileUserCard, isDarkMode && styles.profileUserCardDark]}>
            <View style={styles.profileBigAvatar}>
              <Text style={styles.profileBigAvatarText}>
                {(userProfile?.fullName || 'M')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileUserName, isDarkMode && styles.textPrimaryDark]}>
                {userProfile?.fullName || 'Matheus Morante'}
              </Text>
              <Text style={styles.profileUserEmail}>
                {userProfile?.email || 'matheusmorante002@gmail.com'}
              </Text>
              <View style={styles.roleBadgeContainer}>
                <ShieldCheck size={12} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={styles.roleBadgeText}>
                  {(() => {
                    const roleLabels: Record<string, string> = {
                      administrator: 'Administrador',
                      admin: 'Administrador',
                      master: 'Administrador',
                      manager: 'Gestor',
                      seller: 'Vendedor',
                      deliverer: 'Entregador / Montador',
                      driver: 'Entregador / Montador',
                      assembler: 'Entregador / Montador',
                    };
                    const rawRoles: string[] = [];
                    if (Array.isArray(userProfile?.roles) && userProfile.roles.length > 0) rawRoles.push(...userProfile.roles);
                    if (userProfile?.role && userProfile.role !== 'pending') rawRoles.push(userProfile.role);
                    const formattedSet = new Set<string>();
                    rawRoles.forEach((r) => {
                      const key = String(r).toLowerCase().trim();
                      if (roleLabels[key]) formattedSet.add(roleLabels[key]);
                    });
                    if (formattedSet.size === 0) return userProfile?.role === 'pending' ? 'Pendente' : (isAdmin ? 'Administrador' : 'Colaborador');
                    return Array.from(formattedSet).join(' & ');
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu de Ações */}
          <View style={styles.profileMenuItems}>
            {/* Botão Verificar Atualizações */}
            <TouchableOpacity
              style={[styles.profileMenuItem, isDarkMode && styles.profileMenuItemDark]}
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
            >
              <View style={[styles.profileMenuIconWrapper, { backgroundColor: '#f0fdf4' }]}>
                {checkingUpdate ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <RefreshCw size={18} color="#16a34a" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileMenuLabel, isDarkMode && styles.textPrimaryDark]}>
                  {checkingUpdate ? 'Buscando atualizações...' : 'Verificar Atualizações'}
                </Text>
                <Text style={styles.profileMenuSubtext}>
                  Versão: v{APP_VERSION} (Build {APP_BUILD}) • Update: {currentUpdateId}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Botão Configurações */}
            <TouchableOpacity
              style={[styles.profileMenuItem, isDarkMode && styles.profileMenuItemDark]}
              onPress={() => {
                onClose();
                handleTabChange('configuracoes', `${WEB_URL}/settings`);
              }}
            >
              <View style={styles.profileMenuIconWrapper}>
                <Settings size={18} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileMenuLabel, isDarkMode && styles.textPrimaryDark]}>Configurações</Text>
                <Text style={styles.profileMenuSubtext}>Preferências gerais e dados do sistema</Text>
              </View>
            </TouchableOpacity>

            {/* Botão Sair da Conta */}
            <TouchableOpacity
              style={[styles.profileMenuItem, styles.profileLogoutItem]}
              onPress={() => {
                onClose();
                handleLogout();
              }}
            >
              <View style={[styles.profileMenuIconWrapper, { backgroundColor: '#fee2e2' }]}>
                <LogOut size={18} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileMenuLabel, { color: '#ef4444' }]}>Sair do Aplicativo</Text>
                <Text style={styles.profileMenuSubtext}>Encerrar sessão no dispositivo</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* Rodapé Informativo de Versão */}
          <View style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: isDarkMode ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Equipe Morante • v{APP_VERSION} • Morante Móveis
            </Text>
          </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
