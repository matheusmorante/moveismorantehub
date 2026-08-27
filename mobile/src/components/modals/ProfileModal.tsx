import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { X, ShieldCheck, Settings, LogOut, RefreshCw, BellRing } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { checkAndUpdateManually } from '../../hooks/useExpoAutoUpdate';
import { testRemotePushNotification } from '../../services/notificationService';
import { APP_VERSION, APP_BUILD } from '../../constants/appVersion';

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
                  {isAdmin ? 'Administrador Master' : isAssemblerDriver ? 'Montador / Entregador' : (userProfile?.role === 'seller' ? 'Vendedor' : (userProfile?.role || 'Colaborador'))}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu de Ações */}
          <View style={styles.profileMenuItems}>
            {/* Botão Testar Notificação na Barra */}
            <TouchableOpacity
              style={[styles.profileMenuItem, isDarkMode && styles.profileMenuItemDark]}
              onPress={handleTestNotif}
              disabled={testingNotif}
            >
              <View style={[styles.profileMenuIconWrapper, { backgroundColor: '#eff6ff' }]}>
                {testingNotif ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <BellRing size={18} color="#2563eb" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileMenuLabel, isDarkMode && styles.textPrimaryDark]}>
                  Testar Notificação na Barra
                </Text>
                <Text style={styles.profileMenuSubtext}>
                  Dispara um teste com banner e som no aparelho
                </Text>
              </View>
            </TouchableOpacity>

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
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  profileModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36
  },
  modalContentDark: {
    backgroundColor: '#0f172a'
  },
  profileModalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  versionBadgeDark: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e40af'
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5
  },
  textPrimaryDark: {
    color: '#f8fafc'
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonDark: {
    backgroundColor: '#1e293b'
  },
  profileUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  profileUserCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  profileBigAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileBigAvatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff'
  },
  profileUserName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  profileUserEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981'
  },
  profileMenuItems: {
    gap: 12
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  profileMenuItemDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  profileLogoutItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2'
  },
  profileMenuIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileMenuLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  profileMenuSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  }
});
