import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, LogOut } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  userEmail: string;
  fullName: string;
  onLogout: () => void;
}

export const PendingApprovalScreen: React.FC<Props> = ({
  isDarkMode,
  userEmail,
  fullName,
  onLogout,
}) => {
  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={styles.iconCircle}>
          <Clock size={36} color="#d97706" style={styles.pulseIcon} />
        </View>

        <Text style={[styles.title, isDarkMode && styles.textLight]}>Aguardando Cargo</Text>
        
        <Text style={styles.description}>
          Olá, <Text style={styles.boldText}>{fullName || 'Colaborador'}</Text>! Sua conta ({userEmail}) foi criada no sistema, mas você ainda não possui um cargo atribuído.
        </Text>

        <Text style={styles.alertNote}>
          Aguarde um administrador te dar um cargo para liberar o acesso às abas operacionais do aplicativo.
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.btnLogout}
            onPress={onLogout}
          >
            <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.btnTextLogout}>SAIR DO APLICATIVO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseIcon: {
    opacity: 0.9,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  textLight: {
    color: '#f8fafc',
  },
  description: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    color: '#3b82f6',
    fontWeight: '800',
  },
  alertNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    textAlign: 'center',
    width: '100%',
    lineHeight: 18,
    marginBottom: 28,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  btnLogout: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnTextLogout: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 1,
  },
});
