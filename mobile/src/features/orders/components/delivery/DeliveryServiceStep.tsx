import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { Clock, AlertTriangle, PackageCheck, MapPin, Navigation, User } from 'lucide-react-native';
import { SlideHoldToStart } from '../SlideHoldToStart';
import { DeliveryPaymentSection } from './DeliveryPaymentSection';

interface Props {
  order: any;
  items: any[];
  customer?: any;
  fullAddress?: string;
  isDarkMode: boolean;
  arrivedAt: string;
  onOpenUnattendedModal: () => void;
  onFinishDelivery: () => void;
  onStepBackToRoute: () => void;
  finishing: boolean;
  payments: any[];
  onPaymentsChange: (payments: any[]) => void;
  paymentsConfirmed: boolean;
}

export const DeliveryServiceStep: React.FC<Props> = ({
  order,
  items,
  customer: customCustomer,
  fullAddress: customAddress,
  isDarkMode,
  arrivedAt,
  onOpenUnattendedModal,
  onFinishDelivery,
  onStepBackToRoute,
  finishing,
  payments,
  onPaymentsChange,
  paymentsConfirmed,
}) => {
  const data = order.order_data || order;
  const customer = customCustomer || data.customerData || {};
  const fullAddress = customAddress || data.shipping?.address || '';

  const openGPS = () => {
    if (!fullAddress) return;
    const encoded = encodeURIComponent(fullAddress);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });
  };

  const formattedArrivalTime = arrivedAt
    ? new Date(arrivedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <View style={styles.container}>
      {/* Banner Em Atendimento */}
      <View style={[styles.serviceBanner, isDarkMode && styles.serviceBannerDark]}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 24 }}>📍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, isDarkMode && styles.textLight]}>No Local • Em Atendimento</Text>
          <View style={styles.timeRow}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.bannerSubtitle}>Chegada registrada às {formattedArrivalTime}</Text>
          </View>
        </View>
      </View>

      {/* Cartão do Cliente, Endereço e Botão GPS */}
      {Boolean(fullAddress) && (
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <View style={styles.infoRow}>
            <User size={18} color="#2563eb" />
            <Text style={[styles.customerName, isDarkMode && styles.textLight]}>
              {customer.fullName || 'Cliente'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={18} color="#ef4444" style={{ marginTop: 2 }} />
            <Text style={[styles.addressText, isDarkMode && styles.textLight]}>{fullAddress}</Text>
          </View>

          {/* Botão de abrir GPS */}
          <TouchableOpacity onPress={openGPS} style={styles.gpsButton} activeOpacity={0.8}>
            <Navigation size={16} color="#2563eb" />
            <Text style={styles.gpsButtonText}>Abrir no GPS / Navegador</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Itens a Entregar */}
      {items.length > 0 && (
        <View style={[styles.itemsCard, isDarkMode && styles.itemsCardDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <PackageCheck size={16} color="#16a34a" />
            <Text style={[styles.itemsTitle, isDarkMode && styles.textLight]}>Conferência de Produtos:</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, isDarkMode && styles.itemRowDark]}>
              <Text style={styles.itemQty}>{item.quantity || item.qty || 1}x</Text>
              <Text style={[styles.itemName, isDarkMode && styles.textLight]}>
                {item.name || item.title || item.description || 'Produto'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Botão Não Atendido */}
      <TouchableOpacity
        onPress={onOpenUnattendedModal}
        style={[styles.unattendedButton, isDarkMode && styles.unattendedButtonDark]}
        activeOpacity={0.8}
      >
        <AlertTriangle size={18} color="#dc2626" />
        <Text style={styles.unattendedButtonText}>Cliente Não Atendeu / Insucesso</Text>
      </TouchableOpacity>

      <DeliveryPaymentSection payments={payments} onChange={onPaymentsChange} isDarkMode={isDarkMode} />

      {/* Finalizar Entrega (Slide 2x - Direita para Esquerda) */}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.safetyText}>
          {paymentsConfirmed ? 'Para confirmar a entrega realizada com sucesso, deslize 2 vezes da direita para a esquerda:' : 'Confirme todos os pagamentos como pagos para liberar a finalização.'}
        </Text>
        <SlideHoldToStart
          disabled={finishing || !paymentsConfirmed}
          onComplete={onFinishDelivery}
          actionText="« Deslize para FINALIZAR"
          trackColor="#16a34a"
          knobColor="#14532d"
          iconType="check"
          direction="left"
        />
      </View>

      {/* Retroceder Etapa (Slide 2x Cinza - Esquerda para Direita) */}
      <View style={{ marginTop: 6, gap: 6 }}>
        <Text style={[styles.safetyText, { color: '#64748b' }]}>
          Para retroceder para a Etapa 2 (Em Rota), deslize 2 vezes da esquerda para a direita:
        </Text>
        <SlideHoldToStart
          disabled={finishing}
          onComplete={onStepBackToRoute}
          actionText="Deslize para VOLTAR PARA EM ROTA »"
          trackColor="#64748b"
          knobColor="#334155"
          iconType="back"
          direction="right"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  serviceBannerDark: {
    backgroundColor: '#14532d20',
    borderColor: '#166534',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  textLight: {
    color: '#f8fafc',
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  itemsCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 18,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 4,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  itemRowDark: {
    backgroundColor: '#0f172a',
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  unattendedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 16,
  },
  unattendedButtonDark: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
  },
  unattendedButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
  },
  safetyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
});
