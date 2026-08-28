import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShieldCheck, Settings, LogOut } from 'lucide-react-native';
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
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
