import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { InventorySession } from '../../../types/stock.types';
import { MoreVertical } from 'lucide-react-native';

export const InventoryCardContent = ({
  session,
  isDarkMode,
  onPress,
  onOptionsPress,
}: {
  session: InventorySession;
  isDarkMode: boolean;
  onPress?: (session: InventorySession) => void;
  onOptionsPress?: (session: InventorySession) => void;
}) => {
  const isCompleted = session.status === 'completed';
  const statusColor = isCompleted ? '#059669' : '#d97706';
  const statusBg = isCompleted ? '#d1fae5' : '#fef3c7';
  const statusBgDark = isCompleted ? '#064e3b' : '#451a03';

  const adjustmentsCount = session.adjustmentsCount || 0;
  const reversedCount = session.reversedCount || 0;

  let adjColor = '#94a3b8';
  let adjBg = '#f1f5f9';
  let adjBgDark = '#334155';
  let adjText = 'SEM AJUSTE';

  if (reversedCount > 0) {
    adjColor = '#e11d48';
    adjBg = '#ffe4e6';
    adjBgDark = '#881337';
    adjText = 'ESTORNADO';
  } else if (adjustmentsCount > 0) {
    adjColor = '#059669';
    adjBg = '#d1fae5';
    adjBgDark = '#064e3b';
    adjText = 'LANÇADO';
  } else if (!isCompleted) {
    adjText = 'PENDENTE';
  }

  const dateObj = new Date(session.created_at);
  const dateStr = dateObj.toLocaleDateString('pt-BR');
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity
      testID="inventory-card"
      activeOpacity={0.85}
      onPress={() => onPress?.(session)}
      style={[styles.card, isDarkMode && styles.cardDark]}
    >
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.borderDark]}>
        <View style={styles.headerTitleLine}>
          <Text style={[styles.titlePrefix, isDarkMode && styles.textWhite]}>Inventário</Text>
          <Text style={[styles.title, isDarkMode && styles.textWhite]} numberOfLines={1}>
            #{session.inventoryCode || session.name?.replace('Inventário #', '') || '---'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: isDarkMode ? statusBgDark : statusBg }]}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {isCompleted
                ? 'CONCLUÍDO'
                : session.status === 'pending_sync'
                ? 'AGUARDANDO ENVIO'
                : 'EM ANDAMENTO'}
            </Text>
          </View>
          <TouchableOpacity
            testID="inventory-options-btn"
            style={styles.moreButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            onPress={() => onOptionsPress?.(session)}
          >
            <MoreVertical size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <View style={styles.bodyGrid}>
        <Text style={[styles.metadataValue, isDarkMode && styles.textWhite]}>
          {dateStr} · {timeStr}
        </Text>
        <View style={styles.responsibleRow}>
          <Text style={[styles.metadataLabel, isDarkMode && styles.metadataLabelDark]}>
            Responsável:
          </Text>
          <Text style={[styles.metadataValue, styles.responsibleValue, isDarkMode && styles.textWhite]} numberOfLines={1}>
            {session.responsibleName?.toLowerCase() === 'usuário logado' ||
            session.responsibleName?.toLowerCase() === 'usuario logado'
              ? 'Colaborador'
              : session.responsibleName || 'Não informado'}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footerGrid, isDarkMode && styles.footerGridDark]}>
        <View style={[styles.gridItem, isDarkMode && styles.borderRightDark]}>
          <Text style={styles.label}>Quantidades contadas</Text>
          <Text style={[styles.bigValue, isDarkMode && styles.textWhite]}>
            {session.countedQuantityTotal === undefined
              ? '—'
              : session.countedQuantityTotal.toLocaleString('pt-BR')}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Ajustes gerados</Text>
          <View style={styles.adjBadgeContainer}>
            <Text
              style={[
                styles.adjNumber,
                {
                  color:
                    reversedCount > 0
                      ? '#e11d48'
                      : adjustmentsCount > 0
                      ? '#059669'
                      : isDarkMode
                      ? '#cbd5e1'
                      : '#475569',
                },
              ]}
            >
              {adjustmentsCount}
            </Text>
            <View style={[styles.adjBadge, { backgroundColor: isDarkMode ? adjBgDark : adjBg }]}>
              <Text style={[styles.adjBadgeText, { color: adjColor }]}>{adjText}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  borderDark: {
    borderBottomColor: '#1e293b',
  },
  borderRightDark: {
    borderRightColor: '#1e293b',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  titlePrefix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  headerTitleLine: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textWhite: {
    color: '#f8fafc',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyGrid: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  responsibleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  metadataLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  metadataLabelDark: {
    color: '#94a3b8',
  },
  metadataValue: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  responsibleValue: {
    flex: 1,
    minWidth: 0,
  },
  footerGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerGridDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  gridItem: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  bigValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#334155',
  },
  adjBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  adjNumber: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 6,
  },
  adjBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adjBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreButton: {
    padding: 2,
    marginRight: -4,
  },
});
