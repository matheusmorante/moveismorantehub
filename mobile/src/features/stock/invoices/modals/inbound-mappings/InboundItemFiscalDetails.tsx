import React from 'react';
import { View, Text } from 'react-native';
import type { MappingItem } from './types';
import { amount, formatMoney, landedUnitCost } from './inboundCostUtils';
import { styles } from './inboundMappings.styles';

interface Props {
  item: MappingItem;
  quantity: number;
  totalLandedCost: number;
  isDarkMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const InboundItemFiscalDetails: React.FC<Props> = ({
  item,
  quantity,
  isDarkMode,
  isExpanded,
}) => {
  if (!isExpanded) return null;

  return (
    <View style={[styles.detailsPanel, isDarkMode && styles.detailsPanelDark]}>
      <Text style={[styles.detailsTitle, isDarkMode && styles.textDark]}>
        Dados fiscais e financeiros
      </Text>
      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>
        Valores do item
      </Text>
      {[
        ['Mercadoria', amount(item.unitCost), amount(item.totalCost)],
        [
          'Desconto',
          amount(item.discountValue) / quantity,
          amount(item.discountValue),
        ],
        ['Frete', amount(item.freightValue) / quantity, amount(item.freightValue)],
        ['IPI', amount(item.ipiValue) / quantity, amount(item.ipiValue)],
        [
          'Seguro',
          amount(item.insuranceValue) / quantity,
          amount(item.insuranceValue),
        ],
        [
          'Outras despesas acessórias',
          amount(item.otherExpensesValue) / quantity,
          amount(item.otherExpensesValue),
        ],
        [
          'Valor final',
          (amount(item.totalCost) +
            amount(item.ipiValue) +
            amount(item.freightValue) +
            amount(item.insuranceValue) +
            amount(item.otherExpensesValue) -
            amount(item.discountValue)) /
            quantity,
          amount(item.totalCost) +
            amount(item.ipiValue) +
            amount(item.freightValue) +
            amount(item.insuranceValue) +
            amount(item.otherExpensesValue) -
            amount(item.discountValue),
        ],
      ].map(([label, unitValue, totalValue]) => (
        <View key={String(label)} style={styles.detailLine}>
          <Text
            style={[
              styles.muted,
              String(label) === 'Valor final' && styles.detailEmphasis,
            ]}
          >
            {String(label)}
          </Text>
          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
            {String(label) === 'Desconto'
              ? `− ${formatMoney(Number(unitValue))} / − ${formatMoney(Number(totalValue))}`
              : `${formatMoney(Number(unitValue))} / ${formatMoney(Number(totalValue))}`}
          </Text>
        </View>
      ))}
      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>
        Classificação fiscal
      </Text>
      {[
        ['EAN', item.ean || item.eanTrib],
        ['NCM', item.ncm],
        ['CEST', item.cest],
        ['CFOP', item.cfop],
      ].map(([label, value]) => (
        <View key={String(label)} style={styles.detailLine}>
          <Text style={styles.muted}>{label}</Text>
          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
            {String(value || '—')}
          </Text>
        </View>
      ))}
      <Text style={[styles.detailsSubtitle, isDarkMode && styles.muted]}>
        Tributos extraídos da NF-e
      </Text>
      {[
        ['ICMS', item.icmsCst, item.icmsPercent, item.icmsValue],
        ['ICMS ST', null, item.icmsStPercent, item.icmsStValue],
        ['IPI', item.ipiCst, item.ipiPercent, item.ipiValue],
        ['PIS', item.pisCst, item.pisPercent, item.pisValue],
        ['COFINS', item.cofinsCst, item.cofinsPercent, item.cofinsValue],
        ['IBS', item.ibsCst, null, item.ibsValue],
        ['CBS', item.cbsCst, null, item.cbsValue],
        ['FCP', null, null, item.fcpValue],
        ['FCP ST', null, null, item.fcpStValue],
      ].map(([label, cst, percent, value]) => (
        <View key={String(label)} style={styles.detailLine}>
          <Text style={styles.muted}>{label}</Text>
          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
            {[
              cst,
              percent !== undefined ? `${Number(percent || 0).toFixed(2)}%` : null,
              formatMoney(amount(value)),
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>
        </View>
      ))}
      <View style={styles.detailLine}>
        <Text style={styles.muted}>Origem ICMS · base ICMS / ST</Text>
        <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
          {[
            item.icmsOrigem || '—',
            formatMoney(amount(item.icmsBaseValue)),
            formatMoney(amount(item.icmsStBaseValue)),
          ].join(' · ')}
        </Text>
      </View>
      <View style={styles.detailLine}>
        <Text style={styles.muted}>Total de tributos</Text>
        <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
          {formatMoney(amount(item.totalTaxes))}
        </Text>
      </View>
      <View style={styles.detailLine}>
        <Text style={styles.muted}>Custos adicionais rateados</Text>
        <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>
          {formatMoney(
            amount(item.totalAdditionalCosts ?? item.allocatedAdditionalCosts)
          )}
        </Text>
      </View>
    </View>
  );
};
