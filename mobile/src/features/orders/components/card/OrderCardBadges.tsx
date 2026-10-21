import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  Clock,
  Truck,
  Wrench,
  RotateCcw,
  Megaphone,
  CheckCircle2,
  XCircle,
  Tag,
  Package,
  Check,
} from 'lucide-react-native';
import { MobileDrill } from '../../../../components/shared/MobileDrill';
import { FiscalBadgeStatus, FiscalOperationBadgeStatus } from '../../domain/types';
import { StatusConfig } from './orderCardTheme';
import { OrderCardFiscalBadges } from './OrderCardFiscalBadges';
import PickupIcon from '../../../../components/shared/PickupIcon';

export interface OrderCardBadgesProps {
  orderType: string;
  isAssistance: boolean;
  isReturn: boolean;
  pickup: boolean;
  isDraft: boolean;
  cancelled: boolean;
  isStockChecked: boolean;
  isRegisteredInBling: boolean;
  stockProcessed: boolean;
  stockReversed: boolean;
  returnOrderId?: string | null;
  returnKind?: string | null;
  isPaidTraffic: boolean;
  hasAssemblyOutside: boolean;
  hasAssemblyDepot: boolean;
  pendingScheduling: boolean;
  fiscalBadgeStatus?: FiscalBadgeStatus;
  fiscalHmlBadgeStatus?: FiscalBadgeStatus;
  fiscalEstornoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoCount?: number;
  statusConfig: StatusConfig;
  statusLabel: string;
}

export const OrderCardBadges: React.FC<OrderCardBadgesProps> = ({
  orderType,
  isAssistance,
  isReturn,
  pickup,
  isDraft,
  cancelled,
  isStockChecked,
  isRegisteredInBling,
  stockProcessed,
  stockReversed,
  returnOrderId,
  returnKind,
  isPaidTraffic,
  hasAssemblyOutside,
  hasAssemblyDepot,
  pendingScheduling,
  fiscalBadgeStatus,
  fiscalHmlBadgeStatus,
  fiscalEstornoStatus,
  fiscalDevolucaoStatus,
  fiscalDevolucaoCount,
  statusConfig,
  statusLabel,
}) => {
  return (
    <View style={styles.badgesContainer}>
      {/* 1. Selos de Montagem (Parafusadeira: Montagem no Local / Depósito ou Montagem Fora) - início / lado esquerdo */}
      {!cancelled && hasAssemblyDepot && (
        <View
          style={[styles.iconBadge, styles.badgeAmber]}
          accessibilityLabel="Montagem no Local/Depósito"
        >
          <MobileDrill size={11} color="#ffffff" />
        </View>
      )}

      {!cancelled && hasAssemblyOutside && (
        <View
          style={[styles.iconBadge, styles.badgeRed]}
          accessibilityLabel="Montagem Fora"
        >
          <MobileDrill size={11} color="#ffffff" />
        </View>
      )}

      {/* 2. Selo de Tipo de Pedido (Entrega / Retirada / Assistência / Devolução) */}
      <View
        style={[
          styles.iconBadge,
          isAssistance
            ? styles.badgeOrange
            : isReturn
              ? styles.badgeAmber
              : pickup
                ? styles.badgePurple
                : styles.badgeEmerald,
        ]}
      >
        {isAssistance ? (
          <Wrench size={11} color="#ffffff" />
        ) : isReturn ? (
          <RotateCcw size={11} color="#ffffff" />
        ) : pickup ? (
          <PickupIcon size={14} />
        ) : (
          <Truck size={11} color="#ffffff" />
        )}
      </View>

      {/* 3. Selo de Etiquetado (Stock Check - idêntico ao ERP) */}
      {!isReturn && !isAssistance && !cancelled && (
        <View
          style={[styles.iconBadge, isStockChecked ? styles.badgeSuccess : styles.badgeMuted]}
          accessibilityLabel={isStockChecked ? 'Etiquetado' : 'Não etiquetado'}
        >
          <Tag size={11} color="#ffffff" />
          {isStockChecked && (
            <View style={styles.checkIndicator}>
              <Check size={7} color="#ffffff" strokeWidth={3} />
            </View>
          )}
        </View>
      )}

      {/* 4. Selo do Bling (idêntico ao ERP) */}
      {!isReturn && !isAssistance && !isDraft && !cancelled && (
        <View
          style={[styles.blingBadge, isRegisteredInBling ? styles.badgeSuccess : styles.badgeMuted]}
          accessibilityLabel={isRegisteredInBling ? 'Lançado no Bling' : 'Falta lançar no Bling'}
        >
          <Text style={styles.blingText}>Bling</Text>
          {isRegisteredInBling && (
            <View style={styles.checkIndicator}>
              <Check size={7} color="#ffffff" strokeWidth={3} />
            </View>
          )}
        </View>
      )}

      {/* 5. Selo de Movimentação de Estoque (idêntico ao ERP) */}
      {(orderType === 'sale' || orderType === 'showroom' || orderType === 'return') && (
        <View
          style={[
            styles.iconBadge,
            stockReversed
              ? styles.badgeRed
              : stockProcessed
                ? styles.badgeSuccess
                : styles.badgeMuted,
          ]}
          accessibilityLabel={`Estoque: ${
            stockReversed ? 'Estornado' : stockProcessed ? 'Movimentado' : 'Pendente'
          }`}
        >
          <Package size={11} color="#ffffff" />
          {stockProcessed && !stockReversed && (
            <View style={styles.checkIndicator}>
              <Check size={7} color="#ffffff" strokeWidth={3} />
            </View>
          )}
        </View>
      )}

      {/* 6. Selo de Devolução Vinculada no pedido de origem */}
      {Boolean(returnOrderId) && (
        <View
          style={[styles.textBadge, styles.badgeAmber]}
          accessibilityLabel={`Possui devolução ${
            returnKind === 'complete' ? 'total' : 'parcial'
          } vinculada`}
        >
          <RotateCcw size={10} color="#ffffff" />
          <Text style={styles.textBadgeLabel}>
            {returnKind === 'complete' ? 'DEV. TOTAL' : 'DEV. PARCIAL'}
          </Text>
        </View>
      )}

      {/* 7. Selo de Tráfego Pago */}
      {isPaidTraffic && !isReturn && (
        <View style={[styles.iconBadge, styles.badgeOrange]}>
          <Megaphone size={11} color="#ffffff" />
        </View>
      )}

      {/* 8-11. Selos Fiscais (NF, NFH, NFE, NFD) */}
      <OrderCardFiscalBadges
        fiscalBadgeStatus={fiscalBadgeStatus}
        fiscalHmlBadgeStatus={fiscalHmlBadgeStatus}
        fiscalEstornoStatus={fiscalEstornoStatus}
        fiscalDevolucaoStatus={fiscalDevolucaoStatus}
        fiscalDevolucaoCount={fiscalDevolucaoCount}
      />

      {/* Pendência de Agendamento */}
      {pendingScheduling && (
        <View style={[styles.textBadge, styles.badgeOrange]}>
          <Clock size={10} color="#ffffff" />
          <Text style={styles.textBadgeLabel}>PENDENTE</Text>
        </View>
      )}

      {/* 13. Selo de Status (Quadrado 24x24 idêntico ao ERP) */}
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
        ]}
        accessibilityLabel={`Status: ${statusLabel}`}
      >
        {statusConfig.icon === 'fulfilled' ? (
          <CheckCircle2 size={11} color="#ffffff" />
        ) : statusConfig.icon === 'scheduled' ? (
          <Calendar size={11} color="#ffffff" />
        ) : statusConfig.icon === 'cancelled' ? (
          <XCircle size={11} color="#ffffff" />
        ) : (
          <Clock size={11} color="#ffffff" />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  blingBadge: {
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  blingText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  textBadge: {
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
  },
  textBadgeLabel: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSuccess: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  badgeMuted: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
  },
  badgeEmerald: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  badgePurple: {
    backgroundColor: '#9333ea',
    borderColor: '#7e22ce',
  },
  badgeOrange: {
    backgroundColor: '#ea580c',
    borderColor: '#c2410c',
  },
  badgeAmber: {
    backgroundColor: '#d97706',
    borderColor: '#b45309',
  },
  badgeRed: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  checkIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#065f46',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});
