import { Text, TouchableOpacity, View } from 'react-native';
import { parseLocalizedNumber as parseLocalizedPrice } from '../../domain/productNumbers';
import { CurrencyInput } from '../../../../components/shared/CurrencyInput';
import { PercentInput } from '../../../../components/shared/PercentInput';
import type { EffectiveProductVariationPricing } from '../../../../../../shared-utils/productVariationPricing';
import { styles } from './productFormVariationsTab.styles';

interface ProductVariationPricingPanelProps {
  variation: { syncUnitPrice?: boolean | null; syncPromoPrice?: boolean | null };
  effectivePricing: EffectiveProductVariationPricing;
  discountPercent: number | null;
  discountFixed: number | null;
  dark: boolean;
  isSingleVariation: boolean;
  onToggleInheritance: () => void;
  onChangePricing: (
    field: 'price' | 'discountPercent' | 'discountFixed' | 'promoPrice',
    value: number | null
  ) => void;
}

export const ProductVariationPricingPanel = ({
  variation,
  effectivePricing,
  discountPercent,
  discountFixed,
  dark,
  isSingleVariation,
  onToggleInheritance,
  onChangePricing,
}: ProductVariationPricingPanelProps) => (
  <View style={styles.tabContent}>
    <View style={styles.cardHeader}>
      <Text style={[styles.sectionTitle, dark && styles.lightText]}>Precificação de Venda</Text>
      <TouchableOpacity
        onPress={onToggleInheritance}
        disabled={isSingleVariation}
        style={[
          styles.inheritButton,
          isSingleVariation && { opacity: 0.7 },
          effectivePricing.hasMixedInheritance
            ? styles.inheritButtonPartial
            : effectivePricing.inheritsUnitPrice && styles.inheritButtonActive,
        ]}
        accessibilityRole="switch"
        accessibilityHint={isSingleVariation ? 'A única variação herda os dados do produto.' : undefined}
        accessibilityLabel={
          effectivePricing.hasMixedInheritance
            ? effectivePricing.inheritsUnitPrice
              ? 'Herança parcial: preço regular herdado e promoção própria. Toque para tornar ambos próprios, preservando os valores.'
              : 'Herança parcial: preço regular próprio e promoção herdada. Toque para herdar ambos do pai.'
            : effectivePricing.inheritsUnitPrice
              ? 'Preço herdado do pai'
              : 'Preço personalizado'
        }
        accessibilityState={{
          disabled: isSingleVariation,
          checked: effectivePricing.hasMixedInheritance
            ? 'mixed'
            : effectivePricing.inheritsUnitPrice,
        }}
      >
        <Text
          style={[
            styles.inheritButtonText,
            effectivePricing.hasMixedInheritance
              ? styles.inheritButtonTextPartial
              : effectivePricing.inheritsUnitPrice && styles.inheritButtonTextActive,
          ]}
        >
          {effectivePricing.hasMixedInheritance
            ? 'Herança Parcial'
            : effectivePricing.inheritsUnitPrice
              ? 'Preço Herdado do Pai'
              : 'Preço Personalizado'}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={styles.pricingGrid}>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>Preço de Venda</Text>
        <CurrencyInput
          value={parseLocalizedPrice(effectivePricing.unitPrice)}
          onChangeValue={(value) => onChangePricing('price', value)}
          editable={variation.syncUnitPrice === false}
          placeholder="Herdado do pai"
          style={[
            styles.input,
            dark && styles.darkInput,
            dark && styles.lightText,
            effectivePricing.inheritsUnitPrice && styles.inheritedInput,
          ]}
          accessibilityLabel="Preço de venda da variação"
        />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>Desconto (%)</Text>
        <PercentInput
          value={discountPercent}
          onChangeValue={(value) => onChangePricing('discountPercent', value)}
          editable={variation.syncPromoPrice === false}
          min={0}
          max={100}
          placeholder="0"
          style={[
            styles.input,
            dark && styles.darkInput,
            dark && styles.lightText,
            effectivePricing.inheritsPromoPrice && styles.inheritedInput,
          ]}
          accessibilityLabel="Desconto em percentual da variação"
        />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>Desconto (R$)</Text>
        <CurrencyInput
          value={discountFixed}
          onChangeValue={(value) => onChangePricing('discountFixed', value)}
          editable={variation.syncPromoPrice === false}
          placeholder="0,00"
          style={[
            styles.input,
            dark && styles.darkInput,
            dark && styles.lightText,
            effectivePricing.inheritsPromoPrice && styles.inheritedInput,
          ]}
          accessibilityLabel="Desconto fixo em reais da variação"
        />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.label, dark && styles.dimText]}>Preço Promocional</Text>
        <CurrencyInput
          value={effectivePricing.promoPrice == null
            ? null
            : parseLocalizedPrice(effectivePricing.promoPrice)}
          onChangeValue={(value) => onChangePricing('promoPrice', value)}
          editable={variation.syncPromoPrice === false}
          placeholder="Sem desconto"
          style={[
            styles.input,
            dark && styles.darkInput,
            dark && styles.lightText,
            effectivePricing.inheritsPromoPrice && styles.inheritedInput,
          ]}
          accessibilityLabel="Preço promocional da variação"
        />
      </View>
    </View>
  </View>
);
