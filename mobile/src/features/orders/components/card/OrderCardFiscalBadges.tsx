import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { FiscalBadgeStatus, FiscalOperationBadgeStatus } from '../../domain/types';

interface OrderCardFiscalBadgesProps {
  fiscalBadgeStatus?: FiscalBadgeStatus;
  fiscalHmlBadgeStatus?: FiscalBadgeStatus;
  fiscalEstornoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoCount?: number;
}

export const OrderCardFiscalBadges: React.FC<OrderCardFiscalBadgesProps> = ({
  fiscalBadgeStatus,
  fiscalHmlBadgeStatus,
  fiscalEstornoStatus,
  fiscalDevolucaoStatus,
  fiscalDevolucaoCount,
}) => {
  return (
    <>
      {/* Selo NF (Produção) */}
      {Boolean(fiscalBadgeStatus) && (
        <View
          accessibilityLabel={`Nota fiscal ${
            fiscalBadgeStatus === 'not_issued'
              ? 'não emitida'
              : fiscalBadgeStatus === 'issued'
                ? 'emitida'
                : fiscalBadgeStatus === 'cancelled'
                  ? 'cancelada'
                  : 'de devolução ou estorno'
          }`}
          style={[
            styles.textBadge,
            fiscalBadgeStatus === 'not_issued'
              ? styles.fiscalBadgeMuted
              : fiscalBadgeStatus === 'issued'
                ? styles.fiscalBadgeSuccess
                : fiscalBadgeStatus === 'cancelled'
                  ? styles.fiscalBadgeCancelled
                  : styles.fiscalBadgeReversed,
          ]}
        >
          <Text style={styles.textBadgeLabel}>NF</Text>
          {fiscalBadgeStatus === 'issued' && <CheckCircle2 size={10} color="#ffffff" />}
        </View>
      )}

      {/* Selo NFH (Homologação) */}
      {Boolean(fiscalHmlBadgeStatus && fiscalHmlBadgeStatus !== 'not_issued') && (
        <View
          accessibilityLabel={`Nota fiscal de homologação ${
            fiscalHmlBadgeStatus === 'issued'
              ? 'emitida'
              : fiscalHmlBadgeStatus === 'cancelled'
                ? 'cancelada'
                : 'de devolução ou estorno'
          }`}
          style={[
            styles.textBadge,
            fiscalHmlBadgeStatus === 'issued'
              ? styles.fiscalBadgeSuccess
              : fiscalHmlBadgeStatus === 'cancelled'
                ? styles.fiscalBadgeCancelled
                : styles.fiscalBadgeReversed,
          ]}
        >
          <Text style={styles.textBadgeLabel}>NFH</Text>
          {fiscalHmlBadgeStatus === 'issued' && <CheckCircle2 size={10} color="#ffffff" />}
        </View>
      )}

      {/* Selo NFE (Estorno autorizado) */}
      {fiscalEstornoStatus === 'issued' && (
        <View
          accessibilityLabel="Nota fiscal de estorno autorizada"
          style={[styles.textBadge, styles.fiscalBadgeReversed]}
        >
          <Text style={styles.textBadgeLabel}>NFE</Text>
          <CheckCircle2 size={10} color="#ffffff" />
        </View>
      )}

      {/* Selo NFD (Devolução autorizada) */}
      {fiscalDevolucaoStatus === 'issued' && (
        <View
          accessibilityLabel="Nota fiscal de devolução autorizada"
          style={[styles.textBadge, styles.badgeAmber]}
        >
          <Text style={styles.textBadgeLabel}>NFD</Text>
          {fiscalDevolucaoCount && fiscalDevolucaoCount > 1 ? (
            <Text style={[styles.textBadgeLabel, { fontSize: 8 }]}>({fiscalDevolucaoCount})</Text>
          ) : (
            <CheckCircle2 size={10} color="#ffffff" />
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  textBadge: {
    height: 24,
    minWidth: 24,
    paddingHorizontal: 6,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
  },
  textBadgeLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  fiscalBadgeMuted: {
    backgroundColor: '#94a3b8',
    borderColor: '#64748b',
  },
  fiscalBadgeSuccess: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  fiscalBadgeCancelled: {
    backgroundColor: '#f43f5e',
    borderColor: '#e11d48',
  },
  fiscalBadgeReversed: {
    backgroundColor: '#f97316',
    borderColor: '#c2410c',
  },
  badgeAmber: {
    backgroundColor: '#d97706',
    borderColor: '#b45309',
  },
});
