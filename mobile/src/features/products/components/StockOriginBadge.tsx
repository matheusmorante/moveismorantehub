import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { resolveStockOrigin, type StockOrigin } from '../domain/stockOriginRules';

export { resolveStockOrigin, type StockOrigin };

export interface StockOriginBadgeProps {
  product?: any;
  singleVariation?: any;
  oppName?: string | null;
  dark?: boolean;
  size?: 'sm' | 'xs';
}

/**
 * Rótulo de Origem do Estoque:
 * - Sem ícones (sem chama de fogo, visual limpo)
 * - Convencional: azul suave
 * - Salvados: avermelhado quente
 * - Usados: âmbar/dourado
 */
export const StockOriginBadge: React.FC<StockOriginBadgeProps> = ({
  product,
  singleVariation,
  oppName,
  dark = false,
  size = 'sm',
}) => {
  const origin = resolveStockOrigin(product, singleVariation, oppName);

  return (
    <View
      testID="stock-origin-badge"
      style={[
        styles.badge,
        size === 'xs' ? styles.badgeXs : styles.badgeSm,
        origin === 'Convencional' && (dark ? styles.convencionalDark : styles.convencional),
        origin === 'Salvados' && (dark ? styles.salvadosDark : styles.salvados),
        origin === 'Usados' && (dark ? styles.usadosDark : styles.usados),
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'xs' ? styles.textXs : styles.textSm,
          origin === 'Convencional' &&
            (dark ? styles.textConvencionalDark : styles.textConvencional),
          origin === 'Salvados' && (dark ? styles.textSalvadosDark : styles.textSalvados),
          origin === 'Usados' && (dark ? styles.textUsadosDark : styles.textUsados),
        ]}
      >
        {origin}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeXs: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textSm: {
    fontSize: 9,
  },
  textXs: {
    fontSize: 8,
  },
  // Convencional
  convencional: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  convencionalDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.4)',
    borderColor: 'rgba(30, 58, 138, 0.6)',
  },
  textConvencional: {
    color: '#1e3a8a',
  },
  textConvencionalDark: {
    color: '#93c5fd',
  },
  // Salvados
  salvados: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  salvadosDark: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderColor: 'rgba(127, 29, 29, 0.6)',
  },
  textSalvados: {
    color: '#991b1b',
  },
  textSalvadosDark: {
    color: '#fca5a5',
  },
  // Usados
  usados: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  usadosDark: {
    backgroundColor: 'rgba(120, 53, 15, 0.4)',
    borderColor: 'rgba(120, 53, 15, 0.6)',
  },
  textUsados: {
    color: '#92400e',
  },
  textUsadosDark: {
    color: '#fcd34d',
  },
});

export default StockOriginBadge;
