import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Tag, Clock, RefreshCw } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import PickupIcon from '../../../components/shared/PickupIcon';
import { getOperationActivityPresentation } from '../utils/operationActivity';
import { resolveEffectiveSchedule } from '../../../../../shared-utils/commercialOrderRules';

interface AgendaItemCardProps {
  item: any;
  isDarkMode?: boolean;
  onSelectOrder?: (order: any) => void;
}

export const AgendaItemCard: React.FC<AgendaItemCardProps> = ({
  item,
  isDarkMode = false,
  onSelectOrder,
}) => {
  const isOrder = Boolean(item.order);
  const scheduleRes = isOrder ? resolveEffectiveSchedule(item.order) : null;
  const effective = scheduleRes?.effective;
  const isUsingAlternative = scheduleRes?.isUsingAlternative;
  const alternatives = scheduleRes?.alternatives || [];

  return (
    <TouchableOpacity
      style={[styles.itemCard, isDarkMode && styles.itemCardDark]}
      onPress={() => isOrder && onSelectOrder && onSelectOrder(item.order)}
      activeOpacity={isOrder ? 0.7 : 1}
    >
      <View style={styles.itemBadgeCol}>
        {item.kind === 'delivery' || item.kind === 'assistance' || item.kind === 'return' ? (
          <View
            style={[
              styles.kindBadge,
              {
                backgroundColor: getOperationActivityPresentation(item.order).backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.operationLabel,
                { color: getOperationActivityPresentation(item.order).color },
              ]}
            >
              {getOperationActivityPresentation(item.order).label}
            </Text>
          </View>
        ) : item.kind === 'pickup' ? (
          <View style={[styles.kindBadge, { backgroundColor: '#f3e8ff' }]}>
            <PickupIcon size={18} color="#7c3aed" />
          </View>
        ) : item.kind === 'assembly' ? (
          <View style={[styles.kindBadge, { backgroundColor: '#fef3c7' }]}>
            <MobileDrill size={14} color="#d97706" />
          </View>
        ) : (
          <View style={[styles.kindBadge, { backgroundColor: '#dcfce7' }]}>
            <Tag size={14} color="#16a34a" />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{item.title}</Text>
          {isUsingAlternative && (
            <View style={styles.alternativoPill}>
              <Text style={styles.alternativoPillText}>ALTERNATIVO</Text>
            </View>
          )}
        </View>
        <Text style={[styles.itemSub, isDarkMode && styles.subtitleDark]}>{item.subtitle}</Text>

        {effective?.formattedTime && (
          <View style={styles.scheduleRow}>
            <Clock size={12} color="#2563eb" />
            <Text style={[styles.scheduleTimeText, isDarkMode && styles.textPrimaryDark]}>
              {effective.formattedTime}
            </Text>
          </View>
        )}

        {isUsingAlternative && effective && (
          <View style={styles.alternativeBadge}>
            <RefreshCw size={10} color="#b45309" />
            <Text style={styles.alternativeBadgeText}>
              ALTERNATIVO · {effective.label} ({effective.formattedDate})
            </Text>
          </View>
        )}

        {!isUsingAlternative && alternatives.length > 0 && (
          <Text style={[styles.alternativesText, isDarkMode && styles.subtitleDark]}>
            Alternativas: {alternatives.map((a) => a.formattedSummary).join(' • ')}
          </Text>
        )}

        {item.observationLabels?.length ? (
          <View style={styles.observationLabels}>
            {item.observationLabels.map((notice: string, index: number) => (
              <View
                key={`${index}-${notice}`}
                style={[styles.observationLabel, isDarkMode && styles.observationLabelDark]}
              >
                <Text
                  style={[
                    styles.observationLabelText,
                    isDarkMode && styles.observationLabelTextDark,
                  ]}
                >
                  {notice}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isOrder ? <ChevronRight size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  itemCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  itemBadgeCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  alternativoPill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alternativoPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  scheduleTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  alternativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  alternativeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400e',
  },
  alternativesText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 3,
  },
  observationLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  observationLabel: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  observationLabelDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  observationLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  observationLabelTextDark: {
    color: '#cbd5e1',
  },
  textDark: {
    color: '#f8fafc',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  textPrimaryDark: {
    color: '#60a5fa',
  },
});
