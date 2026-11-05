import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, MoreVertical, PackagePlus, PackageX } from 'lucide-react-native';
import { styles } from './receiptsScreen.styles';

interface Props {
  receipt: any;
  isDarkMode: boolean;
  isFocused: boolean;
  isDraft: boolean;
  onOpenReceipt: () => void;
  onShowMovement: () => void;
  onOpenMenu: () => void;
}

export const ReceiptCard: React.FC<Props> = ({
  receipt: r,
  isDarkMode,
  isFocused,
  isDraft,
  onOpenReceipt,
  onShowMovement,
  onOpenMenu,
}) => {
  const hasNF = Boolean(r.fiscal_key);
  const formattedDate = new Date(r.received_at || r.created_at).toLocaleDateString('pt-BR');
  const total = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(r.totalValue || 0);
  const isEstornado = r.status === 'estornado';
  const movementBadgeLabel = isDraft
    ? 'Sem Movimentação'
    : isEstornado
      ? 'Entrada Estornada'
      : 'Entrada Efetivada';

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          styles.card,
          isDarkMode && styles.cardDark,
          isFocused && styles.focusedReceiptCard,
        ]}
        onPress={onOpenReceipt}
      >
        <View style={styles.receiptCardHeader}>
          <View>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>
              #
              {r.receipt_index || r.receiptIndex
                ? String(r.receipt_index || r.receiptIndex).padStart(6, '0')
                : r.id
                  ? r.id.split('-')[0].toUpperCase()
                  : '—'}
            </Text>
            <Text
              style={{ color: '#059669', fontSize: 12, fontWeight: '700', marginTop: 2 }}
            >
              {r.items?.length || 0} itens recebidos
            </Text>
          </View>
          <View style={styles.receiptStatusGroup}>
            <TouchableOpacity
              style={[
                styles.movementBadge,
                isDraft
                  ? styles.movementBadgePending
                  : isEstornado
                    ? styles.movementBadgeReversed
                    : styles.movementBadgeEffective,
              ]}
              onPress={(event) => {
                event.stopPropagation();
                onShowMovement();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Movimentação do recebimento: ${movementBadgeLabel}. Abrir detalhes por item`}
              accessibilityHint="Mostra a situação da entrada de estoque para cada item"
            >
              {isEstornado ? (
                <PackageX size={16} color="#ffffff" />
              ) : (
                <PackagePlus size={16} color="#ffffff" />
              )}
              {!isDraft && !isEstornado && (
                <View style={styles.movementBadgeCheckIndicator}>
                  <Check size={7} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
            <View
              style={[
                styles.badge,
                isDraft ? styles.badgeDraft : isEstornado ? styles.badgeError : styles.badgeSuccess,
                isDarkMode && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isDraft
                    ? styles.badgeTextDraft
                    : isEstornado
                      ? styles.badgeTextError
                      : styles.badgeTextSuccess,
                ]}
              >
                {isDraft ? 'Rascunho' : isEstornado ? 'Estornado' : 'Recebido'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12, gap: 6 }}>
          <View style={styles.receiptSupplierRow}>
            <Text
              style={[styles.supplierName, styles.receiptSupplierName, isDarkMode && styles.textDark]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {r.supplierName}
            </Text>
            <Text
              style={[styles.receiptInvoiceLabel, isDarkMode && styles.receiptInvoiceLabelDark]}
              numberOfLines={1}
            >
              {hasNF
                ? `📄 Com NF ${r.invoice_number ? `(${r.invoice_number})` : ''}`
                : '📄 Sem NF'}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 2,
            }}
          >
            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              📅 {formattedDate}
            </Text>
            <View style={styles.receiptTotalInline}>
              <Text style={[styles.receiptTotalLabel, isDarkMode && styles.receiptTotalLabelDark]}>
                Total recebido
              </Text>
              <Text
                style={[styles.receiptTotalValue, isDarkMode && styles.textDark]}
                accessibilityLabel={`Total recebido ${total}`}
              >
                {total}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.cardMenuTrigger, isDarkMode && styles.cardMenuTriggerDark]}
        onPress={onOpenMenu}
        accessibilityRole="button"
        accessibilityLabel={`Mais opções do recebimento ${r.receipt_index || ''}`}
      >
        <MoreVertical size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
      </TouchableOpacity>
    </View>
  );
};
