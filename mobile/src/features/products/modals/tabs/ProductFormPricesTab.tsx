import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

const parsePrice = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export const ProductFormPricesTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const set = useCallback((field: string, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  }, [setFormData]);

  // Recalcula preço final de compra ao mudar custo, IPI ou frete
  const updateFinalCost = useCallback((fields: Record<string, any>) => {
    setFormData(prev => {
      const next = { ...prev, ...fields };
      const cost = parsePrice(next.costPrice);
      const ipi = parseFloat(next.ipiPercent || 0);
      const freight = parsePrice(next.freightCost);
      const freightType = next.freightType || 'fixed';
      let final = cost + cost * (ipi / 100);
      if (freightType === 'fixed') final += freight;
      else final += cost * (freight / 100);
      next.finalPurchasePrice = Number(final.toFixed(2));
      return next;
    });
  }, [setFormData]);

  // Calcula desconto ao mudar preço promo
  const handlePromoChange = useCallback((promoStr: string) => {
    setFormData(prev => {
      const promo = parsePrice(promoStr);
      const orig = parsePrice(prev.unitPrice);
      const next: any = { ...prev, promoPrice: promoStr };
      if (orig > 0 && promo > 0 && promo < orig) {
        const fixed = orig - promo;
        next.discountFixed = fixed.toFixed(2);
        next.discountPercent = ((fixed / orig) * 100).toFixed(1);
      } else {
        next.discountFixed = '';
        next.discountPercent = '';
      }
      return next;
    });
  }, [setFormData]);

  const handleDiscountPercentChange = useCallback((pctStr: string) => {
    setFormData(prev => {
      const orig = parsePrice(prev.unitPrice);
      const pct = parseFloat(pctStr);
      const next: any = { ...prev, discountPercent: pctStr };
      if (orig > 0 && !isNaN(pct) && pct > 0) {
        const fixed = orig * (pct / 100);
        next.discountFixed = fixed.toFixed(2);
        next.promoPrice = String(Number((orig - fixed).toFixed(2)));
      } else {
        next.discountFixed = '';
        next.promoPrice = '';
      }
      return next;
    });
  }, [setFormData]);

  const handleDiscountFixedChange = useCallback((fixedStr: string) => {
    setFormData(prev => {
      const orig = parsePrice(prev.unitPrice);
      const fixed = parsePrice(fixedStr);
      const next: any = { ...prev, discountFixed: fixedStr };
      if (orig > 0 && fixed > 0) {
        next.discountPercent = ((fixed / orig) * 100).toFixed(1);
        next.promoPrice = String(Number((orig - fixed).toFixed(2)));
      } else {
        next.discountPercent = '';
        next.promoPrice = '';
      }
      return next;
    });
  }, [setFormData]);

  const f = (v: any) => (v !== null && v !== undefined && v !== '' ? String(v) : '');

  return (
    <View style={styles.container}>
      {/* ─── Preços de Venda ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>💰 Preços de Venda</Text>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Preço de Venda (R$) *</Text>
            <TextInput
              value={f(formData.unitPrice)}
              onChangeText={v => set('unitPrice', v)}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <View style={styles.separator} />
        <Text style={[styles.subLabel, dark && styles.dimText]}>Desconto</Text>
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

      {/* ─── Preço de Custo / Composição ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>🏭 Composição de Custo</Text>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Custo (R$)</Text>
            <TextInput
              value={f(formData.costPrice)}
              onChangeText={v => updateFinalCost({ costPrice: v })}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={[styles.flex1, { maxWidth: 90 }]}>
            <Text style={[styles.label, dark && styles.dimText]}>IPI %</Text>
            <TextInput
              value={f(formData.ipiPercent)}
              onChangeText={v => updateFinalCost({ ipiPercent: v })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1.2 }}>
            <Text style={[styles.label, dark && styles.dimText]}>Tipo de Frete</Text>
            <View style={styles.segRow}>
              {[{ l: 'Fixo', v: 'fixed' }, { l: '%', v: 'percent' }, { l: 'Grátis', v: 'none' }].map(opt => (
                <TouchableOpacity
                  key={opt.v}
                  onPress={() => updateFinalCost({ freightType: opt.v })}
                  style={[styles.seg, (formData.freightType || 'fixed') === opt.v && styles.segActive]}
                >
                  <Text style={[styles.segText, (formData.freightType || 'fixed') === opt.v && styles.segTextActive]}>
                    {opt.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {(formData.freightType || 'fixed') !== 'none' && (
            <View style={styles.flex1}>
              <Text style={[styles.label, dark && styles.dimText]}>
                Frete {(formData.freightType || 'fixed') === 'percent' ? '(%)' : '(R$)'}
              </Text>
              <TextInput
                value={f(formData.freightCost)}
                onChangeText={v => updateFinalCost({ freightCost: v })}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
              />
            </View>
          )}
        </View>

        <View style={[styles.finalPriceBox, dark && styles.darkFinalPrice]}>
          <Text style={[styles.finalPriceLabel, dark && styles.dimText]}>Preço Final de Compra</Text>
          <Text style={styles.finalPriceValue}>
            R$ {(parsePrice(formData.finalPurchasePrice) || 0).toFixed(2).replace('.', ',')}
          </Text>
        </View>
      </View>

      {/* ─── Estoque ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>📦 Estoque</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Estoque Inicial</Text>
            <TextInput
              value={f(formData.stock)}
              onChangeText={v => set('stock', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Estoque Mínimo</Text>
            <TextInput
              value={f(formData.minStock)}
              onChangeText={v => set('minStock', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  flex1: { flex: 1 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 44, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  promoInput: { color: '#16a34a', fontWeight: '900' },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  subLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  segRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  segActive: { backgroundColor: '#2563eb' },
  segText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  segTextActive: { color: '#ffffff' },
  finalPriceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 },
  darkFinalPrice: { backgroundColor: '#1e3a8a20' },
  finalPriceLabel: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  finalPriceValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
});
