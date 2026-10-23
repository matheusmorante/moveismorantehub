import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, RotateCcw, X } from 'lucide-react-native';
import type { FiscalBadgeStatus, FiscalOperationBadgeStatus } from '../../domain/types';

interface OrderCardFiscalBadgesProps {
  fiscalBadgeStatus?: FiscalBadgeStatus;
  fiscalHmlBadgeStatus?: FiscalBadgeStatus;
  fiscalEstornoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoCount?: number;
}

const FiscalBadge: React.FC<{ status: FiscalBadgeStatus; label: string; title: string }> = ({
  status,
  label,
  title,
}) => {
  const Indicator =
    status === 'issued'
      ? Check
      : status === 'cancelled'
        ? X
        : status === 'reversed'
          ? RotateCcw
          : null;
  const indicatorStyle =
    status === 'issued'
      ? styles.fiscalIndicatorSuccess
      : status === 'cancelled'
        ? styles.fiscalIndicatorCancelled
        : status === 'reversed'
          ? styles.fiscalIndicatorReversed
          : null;

  return (
    <View
      accessibilityLabel={title}
      style={[
        styles.textBadge,
        status === 'not_issued'
          ? styles.fiscalBadgeMuted
          : status === 'issued'
            ? styles.fiscalBadgeSuccess
            : status === 'cancelled'
              ? styles.fiscalBadgeCancelled
              : styles.fiscalBadgeReversed,
      ]}
    >
      <Text style={styles.textBadgeLabel}>{label}</Text>
      {Indicator && (
        <View style={[styles.statusIndicator, indicatorStyle]}>
          <Indicator size={9} color="#ffffff" strokeWidth={2.5} />
        </View>
      )}
    </View>
  );
};

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
        <FiscalBadge
          status={fiscalBadgeStatus!}
          label="NF"
          title={`Nota fiscal ${
            fiscalBadgeStatus === 'not_issued'
              ? 'não emitida'
              : fiscalBadgeStatus === 'issued'
                ? 'emitida'
                : fiscalBadgeStatus === 'cancelled'
                  ? 'cancelada'
                  : 'estornada'
          }`}
        />
      )}

      {/* Selo NFH (Homologação) */}
      {Boolean(fiscalHmlBadgeStatus && fiscalHmlBadgeStatus !== 'not_issued') && (
        <FiscalBadge
          status={fiscalHmlBadgeStatus!}
          label="NFH"
          title={`Nota fiscal de homologação ${
            fiscalHmlBadgeStatus === 'issued'
              ? 'emitida'
              : fiscalHmlBadgeStatus === 'cancelled'
                ? 'cancelada'
                : 'estornada'
          }`}
        />
      )}

      {/* Selo NFE (Estorno autorizado) */}
      {fiscalEstornoStatus === 'issued' && (
        <View
          accessibilityLabel="Nota fiscal de estorno autorizada"
          style={[styles.textBadge, styles.fiscalBadgeSuccess]}
        >
          <Text style={styles.textBadgeLabel}>NFE</Text>
          <View style={[styles.statusIndicator, styles.fiscalIndicatorSuccess]}>
            <Check size={9} color="#ffffff" strokeWidth={2.5} />
          </View>
        </View>
      )}

      {/* Selo NFD (Devolução autorizada) */}
      {fiscalDevolucaoStatus === 'issued' && (
        <View
          accessibilityLabel="Nota fiscal de devolução autorizada"
          style={[styles.textBadge, styles.fiscalBadgeSuccess]}
        >
          <Text style={styles.textBadgeLabel}>NFD</Text>
          {fiscalDevolucaoCount && fiscalDevolucaoCount > 1 ? (
            <Text style={[styles.textBadgeLabel, { fontSize: 8 }]}>({fiscalDevolucaoCount})</Text>
          ) : null}
          <View style={[styles.statusIndicator, styles.fiscalIndicatorSuccess]}>
            <Check size={9} color="#ffffff" strokeWidth={2.5} />
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  textBadge: {
    height: 24,
    minWidth: 32,
    paddingHorizontal: 8,
    borderRadius: 6,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
  },
  textBadgeLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 12,
  },
  statusIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fiscalIndicatorSuccess: {
    backgroundColor: '#047857',
  },
  fiscalIndicatorCancelled: {
    backgroundColor: '#b91c1c',
  },
  fiscalIndicatorReversed: {
    backgroundColor: '#4338ca',
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
    backgroundColor: '#e11d48',
    borderColor: '#be123c',
  },
  fiscalBadgeReversed: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
});
