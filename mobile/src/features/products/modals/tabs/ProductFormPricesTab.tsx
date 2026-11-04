import type React from 'react';
import { useCallback, useMemo } from 'react';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
} from '../../../../../../shared-utils/productDiscountFields';
import {
  getProductMinimumStockInputDisplayValue,
  parseProductMinimumStockInput,
} from '../../../../../../shared-utils/productMinimumStockInput';
import { resolveProductSupplierPricingDefaults } from '../../../../../../shared-utils/productSupplierPricingDefaults';
import { matchesProductSupplierSearch } from '../../../../../../shared-utils/productSupplierDisplayName';
import { normalizeProductSupplierIds } from '../../../../../../shared-utils/productSupplierIds';
import {
  getProductSupplierStockOrigin,
  supplierProvidesStockOrigin,
} from '../../../../../../shared-utils/productSupplierStockOrigin';
import { Text, TouchableOpacity, View } from 'react-native';
import { Truck, DollarSign } from 'lucide-react-native';
import { saveSupplier as persistSupplier } from '../../../../services/stockService';
import { SupplierFormModal } from '../../../stock/suppliers/SupplierFormModal';
import { parseLocalizedNumber as parsePrice } from '../../domain/productNumbers';
import { resolveMobileProductFinalPurchasePrice } from '../../domain/productPurchasePrice';
import {
  MAX_VISIBLE_SUPPLIER_SUGGESTIONS,
  MIN_SUPPLIER_SEARCH_LENGTH,
  ProductFormSupplierSection,
} from './ProductFormSupplierSection';
import { useProductFormSupplierSectionState } from '../../hooks/useProductFormSupplierSectionState';
import { styles } from './productFormPricesTab.styles';

import { FormTextInput } from '../../../../components/shared/FormTextInput';
interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  unitPriceError?: boolean;
  onUnitPriceValidationCleared?: () => void;
  showInboundCostPrice?: boolean;
  costPriceError?: boolean;
  onCostPriceValidationCleared?: () => void;
  supplierError?: boolean;
  onSupplierValidationCleared?: () => void;
}

const syncInheritedVariationPrices = (
  form: any,
  unitPrice: number,
  promoPrice: number | undefined
) => ({
  ...form,
  variations: (form.variations || []).map((variation: any) => ({
    ...variation,
    ...(variation.syncUnitPrice !== false ? { price: unitPrice } : {}),
    ...(variation.syncPromoPrice !== false ? { promoPrice: promoPrice ?? '' } : {}),
  })),
});

export const ProductFormPricesTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  unitPriceError = false,
  onUnitPriceValidationCleared,
  showInboundCostPrice = false,
  costPriceError = false,
  onCostPriceValidationCleared,
  supplierError = false,
  onSupplierValidationCleared,
}) => {
  const {
    suppliers,
    supplierSearch,
    setSupplierSearch,
    showSupplierForm,
    setShowSupplierForm,
    supplierLoadState,
    setSupplierLoadAttempt,
    supplierLoadErrorMessage,
  } = useProductFormSupplierSectionState();

  const selectedStockOrigin = getProductSupplierStockOrigin(formData.productKind);
  const selectedSupplierIds = useMemo(
    () =>
      normalizeProductSupplierIds(
        formData.supplierIds,
        formData.mainSupplierId,
        formData.supplierId
      ),
    [formData.supplierIds, formData.mainSupplierId, formData.supplierId]
  );
  const isOwnProduction =
    formData.merchandiseOrigin === 'own_production' ||
    formData.isOwnProduction === true ||
    formData.fiscal?.merchandiseOrigin === 'own_production';

  const set = useCallback(
    (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    },
    [setFormData]
  );

  // Sugestões locais seguem o mínimo e o limite do autocomplete do ERP.
  const visibleSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (q.length < MIN_SUPPLIER_SEARCH_LENGTH) return [];
    return suppliers.filter((sup) => {
      if (selectedSupplierIds.includes(sup.id)) return false;
      return (
        supplierProvidesStockOrigin(sup.stock_origins, selectedStockOrigin) &&
        matchesProductSupplierSearch(sup, q)
      );
    }).slice(0, MAX_VISIBLE_SUPPLIER_SUGGESTIONS);
  }, [
    suppliers,
    supplierSearch,
    selectedSupplierIds,
    selectedStockOrigin,
  ]);

  // Calcula desconto ao mudar preço promo
  const handlePromoChange = useCallback(
    (promoStr: string) => {
      setFormData((prev) => {
        const promo = parsePrice(promoStr);
        const orig = parsePrice(prev.unitPrice);
        const discount = calculateProductDiscountFromPromoPrice(orig, promo);
        const next: any = {
          ...prev,
          promoPrice: discount.promoPrice === undefined ? '' : String(discount.promoPrice),
          discountFixed: discount.discountFixed,
          discountPercent: discount.discountPercent,
        };
        return syncInheritedVariationPrices(next, orig, promo > 0 ? promo : undefined);
      });
    },
    [setFormData]
  );

  const handleUnitPriceChange = useCallback(
    (priceStr: string) => {
      setFormData((prev) => {
        const orig = parsePrice(priceStr);
        const next: any = { ...prev, unitPrice: priceStr };
        if (orig <= 0) {
          next.promoPrice = '';
          next.discountFixed = '';
          next.discountPercent = '';
        } else if (String(prev.discountPercent || '').trim()) {
          const percent = Number(String(prev.discountPercent).replace(',', '.'));
          const discount = calculateProductDiscountFromPercent(orig, percent);
          next.discountFixed = discount.discountFixed;
          next.promoPrice = discount.promoPrice === undefined ? '' : String(discount.promoPrice);
        } else {
          const previousPromo = parsePrice(prev.promoPrice);
          const discount = calculateProductDiscountFromPromoPrice(orig, previousPromo);
          next.promoPrice = discount.promoPrice === undefined ? '' : String(discount.promoPrice);
          next.discountFixed = discount.discountFixed;
          next.discountPercent = discount.discountPercent;
        }
        return syncInheritedVariationPrices(
          next,
          orig,
          parsePrice(next.promoPrice) > 0 ? parsePrice(next.promoPrice) : undefined
        );
      });
    },
    [setFormData]
  );

  const handleUnitPriceBlur = useCallback(() => {
    if (parsePrice(formData.unitPrice) > 0) onUnitPriceValidationCleared?.();
  }, [formData.unitPrice, onUnitPriceValidationCleared]);

  const handleInboundCostPriceChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        costPrice: value,
        finalPurchasePrice: resolveMobileProductFinalPurchasePrice({ costPrice: value }),
      }));
      onCostPriceValidationCleared?.();
    },
    [onCostPriceValidationCleared, setFormData]
  );

  const handleDiscountPercentChange = useCallback(
    (pctStr: string) => {
      setFormData((prev) => {
        const orig = parsePrice(prev.unitPrice);
        const pct = pctStr.trim() ? Number(pctStr.replace(',', '.')) : 0;
        const discount = calculateProductDiscountFromPercent(orig, pct);
        const next: any = {
          ...prev,
          discountPercent: pctStr,
          discountFixed: discount.discountFixed,
          promoPrice: discount.promoPrice === undefined ? '' : String(discount.promoPrice),
        };
        return syncInheritedVariationPrices(
          next,
          orig,
          parsePrice(next.promoPrice) > 0 ? parsePrice(next.promoPrice) : undefined
        );
      });
    },
    [setFormData]
  );

  const handleDiscountFixedChange = useCallback(
    (fixedStr: string) => {
      setFormData((prev) => {
        const orig = parsePrice(prev.unitPrice);
        const fixed = parsePrice(fixedStr);
        const discount = calculateProductDiscountFromFixed(orig, fixed);
        const next: any = {
          ...prev,
          discountFixed: fixedStr,
          discountPercent: discount.discountPercent,
          promoPrice: discount.promoPrice === undefined ? '' : String(discount.promoPrice),
        };
        return syncInheritedVariationPrices(
          next,
          orig,
          parsePrice(next.promoPrice) > 0 ? parsePrice(next.promoPrice) : undefined
        );
      });
    },
    [setFormData]
  );

  const f = (v: any) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const addSupplier = (supplier: any) => {
    if (
      !supplier?.id ||
      selectedSupplierIds.includes(supplier.id) ||
      selectedSupplierIds.length >= 3
    )
      return;
    if (!supplierProvidesStockOrigin(supplier.stock_origins, selectedStockOrigin)) return;
    const nextIds = [...selectedSupplierIds, supplier.id];
    onSupplierValidationCleared?.();
    setFormData((prev) => {
      const next = {
        ...prev,
        supplierIds: nextIds,
        mainSupplierId: nextIds[0],
        supplierId: nextIds[0],
        ...resolveProductSupplierPricingDefaults(prev, {
          defaultIpiPercent: supplier.default_ipi_percent,
          defaultFreightCost: supplier.default_freight_cost,
          defaultFreightType: supplier.default_freight_type || 'none',
        }),
      };
      next.finalPurchasePrice = resolveMobileProductFinalPurchasePrice(next);
      return next;
    });
  };
  const removeSupplier = (supplierId: string) => {
    const nextIds = selectedSupplierIds.filter((id) => id !== supplierId);
    setFormData((prev) => ({
      ...prev,
      supplierIds: nextIds,
      mainSupplierId: nextIds[0] || '',
      supplierId: nextIds[0] || '',
    }));
  };
  const handleToggleOrigin = (ownProduction: boolean) => {
    const newOrigin = ownProduction ? 'own_production' : 'third_party';
    if (ownProduction) onSupplierValidationCleared?.();
    setFormData((previous) => ({
      ...previous,
      merchandiseOrigin: newOrigin,
      isOwnProduction: ownProduction,
      fiscal: {
        ...previous.fiscal,
        merchandiseOrigin: newOrigin,
        cfop: ownProduction
          ? previous.fiscal?.cfop === '5102'
            ? '5101'
            : previous.fiscal?.cfop
          : previous.fiscal?.cfop === '5101'
            ? '5102'
            : previous.fiscal?.cfop,
      },
    }));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.label, dark && styles.dimText]}>Origem Comercial do Produto</Text>
        <Text style={[styles.originDescription, dark && styles.dimText]}>
          {isOwnProduction
            ? 'Produção própria da empresa — seleção de fornecedor externo dispensada (CFOP base 5.101).'
            : 'Mercadoria adquirida/recebida de parceiros — exige fornecedor externo (CFOP base 5.102).'}
        </Text>
        <View style={[styles.originToggle, dark && styles.darkOriginToggle]}>
          <TouchableOpacity
            onPress={() => handleToggleOrigin(false)}
            accessibilityRole="button"
            accessibilityState={{ selected: !isOwnProduction }}
            style={[
              styles.originOption,
              !isOwnProduction && styles.originThirdPartySelected,
              dark && !isOwnProduction && styles.darkOriginThirdPartySelected,
            ]}
          >
            <Text
              style={[
                styles.originOptionText,
                !isOwnProduction && styles.originThirdPartyTextSelected,
                dark && styles.lightText,
                dark && !isOwnProduction && styles.darkOriginThirdPartyTextSelected,
              ]}
            >
              Adquirido de Terceiros
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleToggleOrigin(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: isOwnProduction }}
            style={[
              styles.originOption,
              isOwnProduction && styles.originOwnProductionSelected,
              dark && isOwnProduction && styles.darkOriginOwnProductionSelected,
            ]}
          >
            <Text
              style={[
                styles.originOptionText,
                isOwnProduction && styles.originOwnProductionTextSelected,
                dark && isOwnProduction && styles.originOwnProductionTextSelected,
              ]}
            >
              Fabricação Própria
            </Text>
          </TouchableOpacity>
        </View>
        {isOwnProduction && (
          <Text style={[styles.ownProductionNotice, dark && styles.darkOwnProductionNotice]}>
            Fabricação Própria (Móveis Morante). A seleção de fornecedor externo é dispensada.
          </Text>
        )}
      </View>

      <ProductFormSupplierSection
        dark={dark}
        isOwnProduction={isOwnProduction}
        supplierError={supplierError}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        selectedSupplierIds={selectedSupplierIds}
        setShowSupplierForm={setShowSupplierForm}
        supplierLoadState={supplierLoadState}
        supplierLoadErrorMessage={supplierLoadErrorMessage}
        setSupplierLoadAttempt={setSupplierLoadAttempt}
        suppliers={suppliers}
        visibleSuppliers={visibleSuppliers}
        addSupplier={addSupplier}
        removeSupplier={removeSupplier}
      />
      {showInboundCostPrice && (
        <View style={[styles.card, dark && styles.darkCard]}>
          <View style={styles.cardHeader}>
            <Truck size={16} color="#f59e0b" />
            <Text style={[styles.cardTitle, dark && styles.lightText]}>Custo de aquisição da NF-e</Text>
          </View>
          <Text style={[styles.inboundCostHelper, dark && styles.darkInboundCostHelper]}>
            O valor inicial vem do custo calculado para o item da nota. Confira e ajuste antes de salvar o produto.
          </Text>
          <Text style={[styles.label, dark && styles.dimText, costPriceError && styles.invalidLabel]}>
            Custo de aquisição (R$) <Text style={{ color: '#ef4444' }}>*</Text>
          </Text>
          <FormTextInput
            value={f(formData.costPrice)}
            onChangeText={handleInboundCostPriceChange}
            keyboardType="decimal-pad"
            accessibilityLabel="Custo de aquisição do produto"
            accessibilityHint={costPriceError ? 'Informe um custo de aquisição válido, maior ou igual a zero.' : 'Valor calculado a partir dos custos do item da NF-e.'}
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText, costPriceError && styles.invalidInput]}
          />
          {costPriceError && (
            <Text style={styles.costPriceErrorText} accessibilityRole="alert">
              Informe um custo de aquisição válido.
            </Text>
          )}
        </View>
      )}

      {/* ─── Seção 2: Preços de Venda & Descontos ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.cardHeader}>
          <DollarSign size={16} color="#16a34a" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>
            Precificação e Descontos{formData.hasVariations ? ' (Produto Pai)' : ''}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText, unitPriceError && styles.invalidLabel]}>
              Preço de Venda (R$) {!formData.hasVariations && (
                <Text style={{ color: '#ef4444' }}>*</Text>
              )}
            </Text>
            <FormTextInput
              value={f(formData.unitPrice)}
              onChangeText={handleUnitPriceChange}
              onBlur={handleUnitPriceBlur}
              keyboardType="numeric"
              accessibilityLabel="Preço de venda do produto"
              accessibilityHint={unitPriceError ? 'Informe o Preço de Venda do produto na aba Estoque e Precificação.' : undefined}
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
            <FormTextInput
              value={f(formData.discountPercent)}
              onChangeText={handleDiscountPercentChange}
              keyboardType="numeric"
              accessibilityLabel="Percentual de desconto"
              placeholder="0,0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>R$ Desconto</Text>
            <FormTextInput
              value={f(formData.discountFixed)}
              onChangeText={handleDiscountFixedChange}
              keyboardType="numeric"
              accessibilityLabel="Valor fixo de desconto em reais"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Preço Promo (R$)</Text>
            <FormTextInput
              value={f(formData.promoPrice)}
              onChangeText={handlePromoChange}
              keyboardType="numeric"
              accessibilityLabel="Preço promocional com desconto aplicado"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, styles.promoInput]}
            />
          </View>
        </View>
      </View>

      {!formData.hasVariations && (
        <View style={[styles.card, dark && styles.darkCard]}>
          <Text style={[styles.label, dark && styles.dimText]}>Estoque Mínimo</Text>
          <FormTextInput
            value={getProductMinimumStockInputDisplayValue(formData.minStock)}
            onChangeText={(value) => set('minStock', parseProductMinimumStockInput(value))}
            accessibilityLabel="Estoque mínimo do produto"
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      )}
      <SupplierFormModal
        visible={showSupplierForm}
        onClose={() => setShowSupplierForm(false)}
        isDarkMode={dark}
        showStockOriginOptions
        onSave={async (data) => {
          const supplier = await persistSupplier(data);
          setSuppliers((previous) => [
            ...previous.filter((item) => item.id !== supplier.id),
            supplier,
          ]);
          setSupplierLoadState('loaded');
          setSupplierLoadErrorMessage('');
          addSupplier(supplier);
        }}
      />
    </View>
  );
};
