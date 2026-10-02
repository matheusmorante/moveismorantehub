import { AlertTriangle, Building2, MapPin, RotateCcw } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StockUnavailability } from '../types';

interface Props {
  item: StockUnavailability;
  isDarkMode: boolean;
  canManageStock: boolean;
  onUndo: (id: string) => void;
}

export const UnavailabilityCard: React.FC<Props> = ({
  item,
  isDarkMode,
  canManageStock,
  onUndo,
}) => {
  const isActive = item.status === 'active';
  const productName = item.products?.name
    ? item.product_variations?.name
      ? `${item.products.name} - ${item.product_variations.name}`
      : item.products.name
    : item.product_variations?.name || 'Produto sem nome';
  const variationSku = item.product_variations?.sku;
  const productKind =
    item.products?.product_kind === 'salvado'
      ? 'Salvados'
      : item.products?.product_kind === 'usado'
        ? 'Usados'
        : 'Normal';

  const formattedDate = new Date(item.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>{formattedDate}</Text>
          <View style={styles.dot} />
          <Text style={[styles.kindBadge, isDarkMode && styles.textMutedDark]}>{productKind}</Text>
        </View>

        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusCancelled]}>
          <Text
            style={[
              styles.statusText,
              isActive ? styles.statusTextActive : styles.statusTextCancelled,
            ]}
          >
            {isActive ? 'Ativa' : 'Desfeita'}
          </Text>
        </View>
      </View>

      {/* Main Info */}
      <View style={styles.body}>
        <Text style={[styles.productName, isDarkMode && styles.productNameDark]} numberOfLines={2}>
          {productName}
        </Text>

        {variationSku ? (
          <Text style={[styles.skuText, isDarkMode && styles.textMutedDark]}>
            SKU: {variationSku}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.reasonBadge}>
            <AlertTriangle size={13} color="#d97706" />
            <Text style={styles.reasonText}>
              {item.reason} {item.treatment ? `• ${item.treatment}` : ''}
            </Text>
          </View>

          <Text style={styles.quantityText}>-{item.quantity}</Text>
        </View>

        {item.physical_location && (
          <View style={styles.infoRow}>
            <MapPin size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text style={[styles.infoText, isDarkMode && styles.textMutedDark]}>
              Local: {item.physical_location}
            </Text>
          </View>
        )}

        {item.suppliers?.fantasy_name && (
          <View style={styles.infoRow}>
            <Building2 size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text style={[styles.infoText, isDarkMode && styles.textMutedDark]}>
              Fornecedor: {item.suppliers.fantasy_name}
            </Text>
          </View>
        )}

        {item.observation && (
          <Text style={[styles.observationText, isDarkMode && styles.textMutedDark]}>
            Obs: {item.observation}
          </Text>
        )}

        {item.photos && item.photos.length > 0 && (
          <View style={styles.photosBadge}>
            <Text style={styles.photosBadgeText}>📷 {item.photos.length} foto(s)</Text>
          </View>
        )}
      </View>

      {/* Action Footer */}
      {canManageStock && isActive && (
        <View style={[styles.footer, isDarkMode && styles.footerDark]}>
          <TouchableOpacity
            style={styles.undoBtn}
            onPress={() => onUndo(item.id)}
            activeOpacity={0.7}
          >
            <RotateCcw size={14} color="#64748b" />
            <Text style={styles.undoBtnText}>Desfazer indisponibilidade</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94a3b8',
    marginHorizontal: 6,
  },
  kindBadge: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#fef3c7',
  },
  statusCancelled: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#92400e',
  },
  statusTextCancelled: {
    color: '#64748b',
  },
  body: {
    gap: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  productNameDark: {
    color: '#f8fafc',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
    marginRight: 10,
  },
  reasonText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
  },
  observationText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerDark: {
    borderTopColor: '#334155',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  undoBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  skuText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: -2,
    marginBottom: 4,
  },
  photosBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photosBadgeText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
});
