import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { Bell, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  notifications: any[];
  onSelectOrder?: (order: any) => void;
}

export const NotificationsModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode,
  notifications,
  onSelectOrder,
}) => {
  // Ordenar notificações das mais recentes para as mais antigas
  const sortedNotifications = [...notifications].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA && timeB) return timeB - timeA;
    return 0;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'transparent' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 60 : 50,
          right: 14,
          width: 320,
          maxHeight: 460,
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: isDarkMode ? '#334155' : '#cbd5e1',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#2563eb" />
              <Text style={{ fontSize: 14, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Notificações</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {sortedNotifications.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Bell size={32} color="#cbd5e1" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 8 }}>Nenhuma notificação por enquanto</Text>
              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>Novos pedidos e montagens em tempo real emitirão alerta nesta tela.</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
              {sortedNotifications.map(notif => {
                const notifType = notif.type || '';
                const notifTitle = notif.title || '';
                const isOutsideAssembly = notifType === 'assembly_outside' || notifTitle.toLowerCase().includes('montagem fora');
                const isDepotAssembly = notifType === 'assembly_depot' || notifTitle.toLowerCase().includes('montagem no depósito');
                const isAssembly = isOutsideAssembly || isDepotAssembly || notifType === 'assembly' || notifType.includes('assembly') || notifTitle.includes('Montagem') || notifTitle.includes('🛠️');
                const isOrder = notifType === 'order_created' || notifType === 'order_edited' || notifTitle.includes('Pedido') || notifTitle.includes('🛒');

                let cardBg = isDarkMode ? '#1e293b' : '#f8fafc';
                let cardBorder = isDarkMode ? '#334155' : '#e2e8f0';
                let titleColor = isDarkMode ? '#f8fafc' : '#0f172a';
                let msgColor = isDarkMode ? '#cbd5e1' : '#475569';
                let badgeDateColor = isDarkMode ? '#94a3b8' : '#64748b';

                if (isOrder) {
                  // Fundo Verde para Pedidos de Venda
                  cardBg = isDarkMode ? '#064e3b' : '#ecfdf5';
                  cardBorder = isDarkMode ? '#059669' : '#a7f3d0';
                  titleColor = isDarkMode ? '#ecfdf5' : '#065f46';
                  msgColor = isDarkMode ? '#a7f3d0' : '#047857';
                  badgeDateColor = isDarkMode ? '#6ee7b7' : '#059669';
                } else if (isAssembly) {
                  // Fundo Laranja para Montagens (Depósito / Mostruário)
                  cardBg = isDarkMode ? '#7c2d12' : '#fff7ed';
                  cardBorder = isDarkMode ? '#ea580c' : '#fed7aa';
                  titleColor = isDarkMode ? '#fff7ed' : '#9a3412';
                  msgColor = isDarkMode ? '#fed7aa' : '#c2410c';
                  badgeDateColor = isDarkMode ? '#fdba74' : '#ea580c';
                }

                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => {
                      onClose();
                      if (notif.order && onSelectOrder) {
                        onSelectOrder(notif.order);
                      }
                    }}
                    style={{
                      backgroundColor: cardBg,
                      padding: 11,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: cardBorder,
                      opacity: notif.read ? 0.85 : 1
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: titleColor, flex: 1, paddingRight: 6 }}>
                        {notifTitle}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: badgeDateColor }}>
                        {notif.timestamp}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: msgColor, marginTop: 3 }}>
                      {notif.message}
                    </Text>
                    {isAssembly ? (
                      <Text style={{ fontSize: 9, fontWeight: '900', color: titleColor, marginTop: 5 }}>
                        {isOutsideAssembly ? '🔴 MONTAGEM FORA' : isDepotAssembly ? '🟠 MONTAGEM NO DEPÓSITO' : '🟠 MONTAGEM'}
                      </Text>
                    ) : null}
                    {notif.scheduleText ? (
                      <Text style={{ fontSize: 9, fontWeight: '800', color: titleColor, marginTop: 4 }}>
                        📅 {notif.scheduleText}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
