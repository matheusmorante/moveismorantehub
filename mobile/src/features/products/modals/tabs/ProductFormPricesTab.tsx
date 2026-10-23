import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
} from '../../../../../../shared-utils/productDiscountFields';
import { parseProductMinimumStockInput } from '../../../../../../shared-utils/productMinimumStockInput';
import { calculateProductFinalPurchasePrice } from '../../../../../../shared-utils/productPurchasePricing';
import { resolveProductSupplierPricingDefaults } from '../../../../../../shared-utils/productSupplierPricingDefaults';
import {
  getProductSupplierDisplayName,
  matchesProductSupplierSearch,
} from '../../../../../../shared-utils/productSupplierDisplayName';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Truck, DollarSign, Search, X, Plus } from 'lucide-react-native';
import { saveSupplier as persistSupplier } from '../../../../services/stockService';
import { SupplierFormModal } from '../../../stock/suppliers/SupplierFormModal';
import { parseLocalizedNumber as parsePrice } from '../../domain/productNumbers';
import {
  fetchActiveMobileProductSuppliers,
  type MobileProductSupplier,
} from '../../services/mobileSupplierService';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
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

export const ProductFormPricesTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [suppliers, setSuppliers] = useState<MobileProductSupplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  // Carrega fornecedores ativos do banco
  useEffect(() => {
    void fetchActiveMobileProductSuppliers().then(setSuppliers);
  }, []);

  const selectedStockOrigin =
    formData.productKind === 'salvado' || formData.condition === 'salvado'
      ? 'salvados'
      : formData.productKind === 'usado' || formData.condition === 'usado'
        ? 'usados'
        : 'normal';
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

  // Regra: exige 2 ou mais caracteres para pesquisar fornecedores
  const visibleSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const selectedIds: string[] = formData.supplierIds?.length
      ? formData.supplierIds
      : [formData.mainSupplierId || formData.supplierId].filter(Boolean);
    if (q.length < 2) return [];
    return suppliers.filter((sup) => {
      if (selectedIds.includes(sup.id)) return false;
      const stockOrigins = Array.isArray(sup.stock_origins) ? sup.stock_origins : ['normal'];
      return (
        stockOrigins.includes(selectedStockOrigin) && matchesProductSupplierSearch(sup, q)
      );
    });
  }, [
    suppliers,
    supplierSearch,
    formData.mainSupplierId,
    formData.supplierId,
    formData.supplierIds,
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

  const handleCostFieldChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => {
        const next: any = { ...prev, [field]: value };
        const costPrice = parsePrice(field === 'costPrice' ? value : next.costPrice);
        const ipiPercent = parsePrice(field === 'ipiPercent' ? value : next.ipiPercent);
        const freightCost = parsePrice(field === 'freightCost' ? value : next.freightCost);
        const freightType = field === 'freightType' ? value : next.freightType || 'fixed';
        next.finalPurchasePrice = calculateProductFinalPurchasePrice(
          costPrice,
          ipiPercent,
          freightCost,
          freightType
        );
        next.variations = (next.variations || []).map((variation: any) =>
          variation.syncCostPrice !== false ? { ...variation, costPrice: costPrice } : variation
        );
        return next;
      });
    },
    [setFormData]
  );

  const f = (v: any) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const selectedSupplierIds: string[] = formData.supplierIds?.length
    ? formData.supplierIds
    : [formData.mainSupplierId || formData.supplierId].filter(Boolean);
  const addSupplier = (supplier: any) => {
    if (
      !supplier?.id ||
      selectedSupplierIds.includes(supplier.id) ||
      selectedSupplierIds.length >= 3
    )
      return;
    const stockOrigins = Array.isArray(supplier.stock_origins)
      ? supplier.stock_origins
      : ['normal'];
    if (!stockOrigins.includes(selectedStockOrigin)) return;
    const nextIds = [...selectedSupplierIds, supplier.id];
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
      next.finalPurchasePrice = calculateProductFinalPurchasePrice(
        parsePrice(next.costPrice),
        parsePrice(next.ipiPercent),
        parsePrice(next.freightCost),
        next.freightType || 'fixed'
      );
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

      {/* ─── Fornecedores ─── */}
      {!isOwnProduction && <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.supplierHeading}>
          <View style={styles.cardHeader}>
            <Truck size={16} color="#2563eb" />
            <Text style={[styles.cardTitle, dark && styles.lightText]}>
              Fornecedores <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSupplierForm(true)}
            disabled={selectedSupplierIds.length >= 3}
            style={[
              styles.newSupplierButton,
              selectedSupplierIds.length >= 3 && styles.disabledButton,
            ]}
          >
            <Plus size={13} color="#2563eb" />
            <Text style={styles.newSupplierText}>Novo</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, dark && styles.dimText]}>
          Buscar fornecedor · {selectedSupplierIds.length}/3
        </Text>
        <View style={[styles.searchInputWrapper, dark && styles.darkSearchInputWrapper]}>
          <Search size={14} color={dark ? '#94a3b8' : '#64748b'} />
          <TextInput
            style={[styles.searchInput, dark && styles.darkSearchInput, dark && styles.lightText]}
            placeholder="Digite 2 ou mais letras para buscar..."
            placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
            value={supplierSearch}
            onChangeText={setSupplierSearch}
            autoCapitalize="none"
          />
          {supplierSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setSupplierSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={dark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>

        {supplierSearch.trim().length > 0 && supplierSearch.trim().length < 2 && (
          <Text style={[styles.helperText, dark && styles.dimText]}>
            Digite pelo menos 2 caracteres para exibir as sugestões.
          </Text>
        )}

        <View style={styles.supplierGrid}>
          {suppliers.length === 0 ? (
            <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
              Nenhum fornecedor cadastrado
            </Text>
          ) : supplierSearch.trim().length < 2 ? (
            <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
              Digite 2 ou mais caracteres para buscar fornecedores.
            </Text>
          ) : visibleSuppliers.length === 0 ? (
            <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
              Nenhum fornecedor encontrado com este termo.
            </Text>
          ) : (
            visibleSuppliers.map((sup) => {
              return (
                <TouchableOpacity
                  key={sup.id}
                  activeOpacity={0.8}
                  onPress={() => addSupplier(sup)}
                  disabled={selectedSupplierIds.length >= 3}
                  style={[
                    styles.supplierChip,
                    dark && styles.darkSupplierChip,
                    selectedSupplierIds.length >= 3 && styles.disabledButton,
                  ]}
                >
                  <Text
                    style={[styles.supplierChipText, dark && styles.lightText]}
                    numberOfLines={1}
                  >
                    {sup.nickname || sup.full_name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        {selectedSupplierIds.length > 0 && (
          <View style={styles.selectedSuppliers}>
            {selectedSupplierIds.map((id) => {
              const supplier = suppliers.find((item) => item.id === id);
              const name = getProductSupplierDisplayName(supplier) || 'Fornecedor';
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => removeSupplier(id)}
                  style={styles.selectedSupplierChip}
                  accessibilityLabel={`Remover fornecedor ${name}`}
                >
                  <Text style={styles.selectedSupplierName} numberOfLines={1}>
                    {name}
                  </Text>
                  <X size={12} color="#1d4ed8" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>}

      {/* ─── Seção 2: Preços de Venda & Descontos ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.cardHeader}>
          <DollarSign size={16} color="#16a34a" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>
            Preços de Venda & Desconto
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>
              Preço de Venda (R$) {!formData.hasVariations && (
                <Text style={{ color: '#ef4444' }}>*</Text>
              )}
            </Text>
            <TextInput
              value={f(formData.unitPrice)}
              onChangeText={handleUnitPriceChange}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <View style={styles.separator} />
        <Text style={[styles.subLabel, dark && styles.dimText]}>Desconto Promocional</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>% Desconto</Text>
            <TextInput
              value={f(formData.discountPercent)}
              onChangeText={handleDiscountPercentChange}
              keyboardType="numeric"
              placeholder="0,0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>R$ Desconto</Text>
            <TextInput
              value={f(formData.discountFixed)}
              onChangeText={handleDiscountFixedChange}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Preço Promo (R$)</Text>
            <TextInput
              value={f(formData.promoPrice)}
              onChangeText={handlePromoChange}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, styles.promoInput]}
            />
          </View>
        </View>
      </View>

      {/* ─── Custo de Compra ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.cardHeader}>
          <Truck size={16} color="#f59e0b" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>Custo de Compra</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Preço de Custo</Text>
            <TextInput
              value={f(formData.costPrice)}
              onChangeText={(value) => handleCostFieldChange('costPrice', value)}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>IPI (%)</Text>
            <TextInput
              value={f(formData.ipiPercent)}
              onChangeText={(value) => handleCostFieldChange('ipiPercent', value)}
              keyboardType="numeric"
              placeholder="0,0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>
        <Text style={[styles.label, dark && styles.dimText]}>Tipo de Frete</Text>
        <View style={styles.segRow}>
          {(
            [
              ['fixed', 'Fixo'],
              ['percentage', 'Percentual'],
              ['none', 'Sem frete'],
            ] as const
          ).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => handleCostFieldChange('freightType', value)}
              style={[
                styles.seg,
                dark && styles.darkSegment,
                formData.freightType === value && styles.segActive,
              ]}
            >
              <Text
                style={[styles.segText, formData.freightType === value && styles.segTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {formData.freightType !== 'none' && (
          <View>
            <Text style={[styles.label, dark && styles.dimText]}>
              {formData.freightType === 'percentage' ? 'Frete (%)' : 'Frete (R$)'}
            </Text>
            <TextInput
              value={f(formData.freightCost)}
              onChangeText={(value) => handleCostFieldChange('freightCost', value)}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        )}
        <View style={[styles.finalPriceBox, dark && styles.darkFinalPrice]}>
          <Text style={[styles.finalPriceLabel, dark && styles.dimText]}>
            Custo final de compra
          </Text>
          <Text style={styles.finalPriceValue}>
            R${' '}
            {Number(formData.finalPurchasePrice || 0)
              .toFixed(2)
              .replace('.', ',')}
          </Text>
        </View>
      </View>

      {!formData.hasVariations && (
        <View style={[styles.card, dark && styles.darkCard]}>
          <Text style={[styles.label, dark && styles.dimText]}>Estoque Mínimo</Text>
          <TextInput
            value={f(formData.minStock)}
            onChangeText={(value) => set('minStock', parseProductMinimumStockInput(value))}
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
        onSave={async (data) => {
          const supplier = await persistSupplier(data);
          setSuppliers((previous) => [
            ...previous.filter((item) => item.id !== supplier.id),
            supplier,
          ]);
          addSupplier(supplier);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  originToggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  darkOriginToggle: { backgroundColor: '#0f172a' },
  originOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  originThirdPartySelected: { backgroundColor: '#ffffff' },
  darkOriginThirdPartySelected: { backgroundColor: '#1e293b' },
  originOwnProductionSelected: { backgroundColor: '#ecfdf5' },
  darkOriginOwnProductionSelected: { backgroundColor: '#052e16' },
  originOptionText: { textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#64748b' },
  originThirdPartyTextSelected: { color: '#2563eb' },
  darkOriginThirdPartyTextSelected: { color: '#60a5fa' },
  originOwnProductionTextSelected: { color: '#047857' },
  originDescription: { color: '#64748b', fontSize: 11, fontWeight: '500' },
  ownProductionNotice: {
    borderRadius: 10,
    padding: 10,
    color: '#065f46',
    backgroundColor: '#ecfdf5',
    fontSize: 11,
    fontWeight: '700',
  },
  darkOwnProductionNotice: { color: '#a7f3d0', backgroundColor: '#052e16' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  supplierHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  newSupplierButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  newSupplierText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  flex1: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  darkSegment: { backgroundColor: '#0f172a' },
  promoInput: { color: '#16a34a', fontWeight: '900' },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  subLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  segRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  seg: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { backgroundColor: '#2563eb' },
  segText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  segTextActive: { color: '#ffffff' },
  finalPriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
  },
  darkFinalPrice: { backgroundColor: '#1e3a8a20' },
  finalPriceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  finalPriceValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 44,
    gap: 8,
  },
  darkSearchInputWrapper: { backgroundColor: '#0f172a', borderColor: '#334155' },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', padding: 0 },
  darkSearchInput: { color: '#f1f5f9' },
  helperText: { fontSize: 10, fontWeight: '700', color: '#f59e0b', marginTop: -4 },
  supplierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  selectedSuppliers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  selectedSupplierChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  selectedSupplierName: {
    maxWidth: 220,
    flexShrink: 1,
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
  },
  supplierChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkSupplierChip: { backgroundColor: '#0f172a', borderColor: '#334155' },
  supplierChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  supplierChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  supplierChipTextSelected: { color: '#ffffff', fontWeight: '900' },
  emptySupplierText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  toggleSubtitle: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
});
