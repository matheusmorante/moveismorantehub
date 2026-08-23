import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { X, ShieldCheck, Settings, LogOut } from 'lucide-react-native';

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
            <Text style={[styles.profileModalTitle, isDarkMode && styles.textPrimaryDark]}>Perfil & Configurações</Text>
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
