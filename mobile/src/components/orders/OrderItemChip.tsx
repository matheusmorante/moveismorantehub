import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../utils/aiSummaryHelper';
import { formatItemDisplayName } from '../../utils/orderUtils';

interface OrderItemChipProps {
  item: any;
  handlingOptions?: any[];
  dark?: boolean;
}

const wrappedDecoration = Platform.OS === 'web'
  ? ({ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } as any)
  : undefined;

export function OrderItemChip({ item, handlingOptions = [], dark = false }: OrderItemChipProps) {
  const quantity = Number(item?.quantity || item?.qty || 1);
  const handlingType = String(item?.handlingType || item?.handling || item?.manuseio || item?.handling_type || '').trim();
  const isOutside = isAssemblyOutsideType(handlingType, handlingOptions);
  const isInternal = isAssemblyInternalType(handlingType, handlingOptions);

  return (
    <Text style={[
      styles.chip,
      wrappedDecoration,
      isOutside ? styles.outside : isInternal ? styles.internal : styles.default,
      dark && styles.dark,
      styles.chipText,
      isOutside ? styles.outsideText : isInternal ? styles.internalText : styles.defaultText,
      dark && isOutside && styles.outsideTextDark,
      dark && isInternal && styles.internalTextDark,
      dark && !isOutside && !isInternal && styles.defaultTextDark,
    ]}>
      <Text style={styles.quantity}>{quantity}x</Text>
      <Text> {formatItemDisplayName(item)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 7,
  },
  dark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  outside: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  internal: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  default: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  chipText: { fontSize: 11, lineHeight: 17, flexShrink: 1 },
  outsideText: { color: '#b91c1c', fontWeight: '700' },
  internalText: { color: '#b45309', fontWeight: '700' },
  defaultText: { color: '#334155' },
  outsideTextDark: { color: '#fca5a5' },
  internalTextDark: { color: '#fcd34d' },
  defaultTextDark: { color: '#cbd5e1' },
  quantity: { fontSize: 10, fontWeight: '900' },
});
