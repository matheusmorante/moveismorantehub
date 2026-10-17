import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  CheckCircle2,
  RotateCcw,
  Check,
  MessageSquare,
  Calendar,
  Tag,
} from 'lucide-react-native';
import { StockMove } from '../../types/stock.types';
import { isOrderLinked as checkIsOrderLinked } from '../domain/inventoryTimelineBalance';
import { styles } from './stock-move-card/stockMoveCard.styles';
import {
  getTypeVisualConfig,
  formatCurrency,
  formatDateAndTime,
  getReversedLabel,
  parseObservationAndReason,
  getQuantityDisplay,
} from './stock-move-card/stockMoveCardUtils';

export const StockMoveCard = ({
  move,
  isDarkMode,
  canManage,
  onReverse,
  onEdit,
}: {
  move: StockMove;
  isDarkMode: boolean;
  canManage?: boolean;
  onReverse?: (move: StockMove) => void;
  onEdit?: (move: StockMove) => void;
}) => {
  const [expandedObservation, setExpandedObservation] = React.useState(false);

  const isReversed = move.status === 'reversed';
  const isEffective = move.status === 'effective' || move.status === 'active';
  const isOrderLinked = checkIsOrderLinked(move);

  const { TypeIcon, typeText, typeColor, typeBg, typeBorder, isEntry, isExit } =
    getTypeVisualConfig(move, isDarkMode);

  const { dateStr, timeStr } = formatDateAndTime(move.created_at);
  const reversedLabel = getReversedLabel(isReversed, move.reversedAt);
  const { finalObs, obsLabel, reasonText } = parseObservationAndReason(move, isReversed);
  const { qtyPrefix, displayedQuantity, qtyColor } = getQuantityDisplay(
    move,
    isEntry,
    isExit,
    isDarkMode
  );

  const dividerColor = isDarkMode ? '#263245' : '#f1f5f9';
  const footerBg = isDarkMode ? 'rgba(15,23,42,0.4)' : '#f8fafc';

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeBorder }]}>
            <View style={{ position: 'relative' }}>
              <TypeIcon size={13} color={typeColor} />
              <View
                style={[
                  styles.microBadge,
                  {
                    backgroundColor: isReversed ? '#f43f5e' : '#047857',
                    borderColor: isDarkMode ? '#1e293b' : '#fff',
                  },
                ]}
              >
                {isReversed ? (
                  <RotateCcw size={5} color="#fff" strokeWidth={3} />
                ) : (
                  <Check size={5} color="#fff" strokeWidth={3} />
                )}
              </View>
            </View>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeText}</Text>
          </View>
          {isReversed ? (
            <View
              style={[
                styles.statusBadge,
                {
                  borderColor: '#d97706',
                  backgroundColor: isDarkMode ? 'rgba(217,119,6,0.12)' : '#fffbeb',
                },
              ]}
            >
              <RotateCcw size={11} color="#d97706" />
              <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>ESTORNADA</Text>
            </View>
          ) : isEffective ? (
            <View
              style={[
                styles.statusBadge,
                {
                  borderColor: isDarkMode ? '#4ade80' : '#16a34a',
                  backgroundColor: isDarkMode ? 'rgba(74,222,128,0.12)' : '#dcfce7',
                },
              ]}
            >
              <CheckCircle2 size={11} color={isDarkMode ? '#4ade80' : '#16a34a'} />
              <Text style={[styles.statusBadgeText, { color: isDarkMode ? '#4ade80' : '#16a34a' }]}>
                EFETIVADA
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.quantity, { color: qtyColor }]}>
          {qtyPrefix}
          {displayedQuantity} <Text style={styles.qtyUnit}>un</Text>
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* Corpo */}
      <View style={styles.body}>
        {!!move.productDescription && (
          <View>
            <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>PRODUTO</Text>
            <Text style={[styles.productText, isDarkMode && styles.textDark]} numberOfLines={2}>
              {move.productDescription}
            </Text>
          </View>
        )}
        {!!move.label && (
          <View style={styles.bodyRow}>
            <Tag size={11} color={isDarkMode ? '#64748b' : '#94a3b8'} style={{ marginTop: 1 }} />
            <Text style={[styles.labelText, isDarkMode && styles.textMutedDark]} numberOfLines={2}>
              {move.label}
            </Text>
          </View>
        )}
      </View>

      {/* Observacao */}
      {!!finalObs && (
        <View
          style={[
            styles.obsBox,
            { borderTopColor: dividerColor },
            isDarkMode ? styles.obsBoxDark : {},
            isReversed && reasonText
              ? isDarkMode
                ? styles.obsBoxAmberDark
                : styles.obsBoxAmber
              : {},
          ]}
        >
          <MessageSquare
            size={11}
            color={
              isReversed && reasonText
                ? isDarkMode
                  ? '#fbbf24'
                  : '#d97706'
                : isDarkMode
                  ? '#94a3b8'
                  : '#64748b'
            }
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.obsLabel,
                {
                  color:
                    isReversed && reasonText
                      ? isDarkMode
                        ? '#fbbf24'
                        : '#b45309'
                      : isDarkMode
                        ? '#94a3b8'
                        : '#64748b',
                },
              ]}
            >
              {obsLabel}
            </Text>
            <Text
              style={[
                styles.obsContent,
                {
                  color:
                    isReversed && reasonText
                      ? isDarkMode
                        ? '#fde68a'
                        : '#92400e'
                      : isDarkMode
                        ? '#e2e8f0'
                        : '#334155',
                },
              ]}
            >
              {expandedObservation || finalObs.length <= 120
                ? finalObs
                : `${finalObs.slice(0, 120)}…`}
            </Text>
            {finalObs.length > 120 && (
              <TouchableOpacity onPress={() => setExpandedObservation((current) => !current)}>
                <Text style={styles.expandText}>
                  {expandedObservation ? 'Mostrar menos' : 'Ler mais'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* Rodapé */}
      <View style={[styles.footer, { backgroundColor: footerBg }]}>
        <View style={styles.footerCell}>
          <View style={styles.footerCellHeader}>
            <Calendar size={11} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>DATA</Text>
          </View>
          <Text style={[styles.footerValue, isDarkMode && styles.textDark]}>{dateStr}</Text>
          <Text style={[styles.footerSub, isDarkMode && styles.textMutedDark]}>{timeStr}</Text>
        </View>
        {move.unitCost != null && move.unitCost > 0 && (
          <View style={[styles.footerCell, { borderLeftWidth: 1, borderLeftColor: dividerColor }]}>
            <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
              CUSTO UNIT.
            </Text>
            <Text style={[styles.footerValue, isDarkMode && styles.textDark]}>
              {formatCurrency(move.unitCost)}
            </Text>
          </View>
        )}
      </View>

      {!!reversedLabel && (
        <Text
          style={[
            styles.reversedText,
            { backgroundColor: footerBg },
            isDarkMode && { color: '#fbbf24' },
          ]}
        >
          {reversedLabel}
        </Text>
      )}

      {canManage && isEffective && !isOrderLinked && (onReverse || onEdit) && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(move)}>
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>
          )}
          {onReverse && (
            <TouchableOpacity
              style={styles.reverseButton}
              onPress={() => onReverse(move)}
              accessibilityLabel="Estornar movimentação"
            >
              <RotateCcw size={14} color={isDarkMode ? '#fbbf24' : '#b45309'} />
              <Text style={[styles.reverseButtonText, isDarkMode && { color: '#fbbf24' }]}>
                Estornar movimentação
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
