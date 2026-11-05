import type React from 'react';
import { DollarSign } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { CurrencyInput } from '../../../../components/shared/CurrencyInput';
import { PercentInput } from '../../../../components/shared/PercentInput';
import { styles } from './productFormPricesTab.styles';

interface Props {
  dark: boolean;
  hasVariations: boolean;
  unitPriceError: boolean;
  unitPrice: number | null;
  discountPercent: number | null;
  discountFixed: number | null;
  promoPrice: number | null;
  onUnitPriceChange: (value: number | null) => void;
  onUnitPriceBlur: () => void;
  onDiscountPercentChange: (value: number | null) => void;
  onDiscountFixedChange: (value: number | null) => void;
  onPromoPriceChange: (value: number | null) => void;
}

export const ProductFormSalePricingSection: React.FC<Props> = ({
  dark,
  hasVariations,
  unitPriceError,
  unitPrice,
  discountPercent,
  discountFixed,
  promoPrice,
  onUnitPriceChange,
  onUnitPriceBlur,
  onDiscountPercentChange,
  onDiscountFixedChange,
  onPromoPriceChange,
}) => (
  <View style={[styles.card, dark && styles.darkCard]}>
    <View style={styles.cardHeader}>
      <DollarSign size={16} color="#16a34a" />
      <Text style={[styles.cardTitle, dark && styles.lightText]}>
        Precificação e Descontos{hasVariations ? ' (Produto Pai)' : ''}
      </Text>
    </View>

    <View style={styles.row}>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText, unitPriceError && styles.invalidLabel]}>
          Preço de Venda (R$) {!hasVariations && <Text style={{ color: '#ef4444' }}>*</Text>}
        </Text>
        <CurrencyInput
          value={unitPrice}
          onChangeValue={onUnitPriceChange}
          onBlur={onUnitPriceBlur}
          prefix=""
          accessibilityLabel="Preço de venda do produto"
          accessibilityHint={
            unitPriceError ? 'Informe o Preço de Venda do produto na aba Estoque e Precificação.' : undefined
          }
          placeholder="0,00"
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText, unitPriceError && styles.invalidInput]}
        />
      </View>
    </View>

    <View style={styles.separator} />
    <Text style={[styles.subLabel, dark && styles.dimText]}>Desconto Promocional</Text>
    <View style={styles.row}>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>% Desconto</Text>
        <PercentInput
          value={discountPercent}
          onChangeValue={onDiscountPercentChange}
          accessibilityLabel="Percentual de desconto"
          placeholder="0,00"
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>R$ Desconto</Text>
        <CurrencyInput
          value={discountFixed}
          onChangeValue={onDiscountFixedChange}
          prefix=""
          accessibilityLabel="Valor fixo de desconto em reais"
          placeholder="0,00"
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>Preço Promo (R$)</Text>
        <CurrencyInput
          value={promoPrice}
          onChangeValue={onPromoPriceChange}
          prefix=""
          accessibilityLabel="Preço promocional com desconto aplicado"
          placeholder="0,00"
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, styles.promoInput]}
        />
      </View>
    </View>
  </View>
);
