import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Clock, HelpCircle } from 'lucide-react-native';
import { OrderFiscalCancellationState } from '../../domain/types';

interface OrderCancellationFailureNoticeProps {
  state?: OrderFiscalCancellationState;
  environment?: 1 | 2;
  dark?: boolean;
}

export const OrderCancellationFailureNotice: React.FC<OrderCancellationFailureNoticeProps> = ({
  state,
  environment,
  dark,
}) => {
  if (!state) return null;

  const noteLabel = environment === 2 ? 'NFH' : 'NF';

  if (state === 'failed') {
    return (
      <View style={[styles.container, styles.failedContainer, dark && styles.failedContainerDark]}>
        <AlertCircle size={12} color="#dc2626" />
        <Text style={[styles.text, styles.failedText]}>
          {noteLabel} — Falha na tentativa de cancelamento fiscal
        </Text>
      </View>
    );
  }

  if (state === 'verify') {
    return (
      <View style={[styles.container, styles.verifyContainer, dark && styles.verifyContainerDark]}>
        <HelpCircle size={12} color="#b45309" />
        <Text style={[styles.text, styles.verifyText]}>
          {noteLabel} — Cancelamento fiscal pendente de confirmação
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.pendingContainer, dark && styles.pendingContainerDark]}>
      <Clock size={12} color="#0369a1" />
      <Text style={[styles.text, styles.pendingText]}>
        {noteLabel} — Cancelamento fiscal pendente de confirmação
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
  failedContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  failedContainerDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#7f1d1d',
  },
  failedText: {
    color: '#dc2626',
  },
  pendingContainer: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  pendingContainerDark: {
    backgroundColor: 'rgba(3, 105, 161, 0.15)',
    borderColor: '#075985',
  },
  pendingText: {
    color: '#0369a1',
  },
  verifyContainer: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  verifyContainerDark: {
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
    borderColor: '#78350f',
  },
  verifyText: {
    color: '#b45309',
  },
});
