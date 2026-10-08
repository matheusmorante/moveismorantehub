import { ChevronDown, FileText } from 'lucide-react-native';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  fetchMobileNcmCatalogEntry,
  searchMobileNcms,
} from '../../services/mobileProductFiscalService';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  canConfigureProductTaxes: boolean;
}

const CFOP_OPTIONS = [
  { value: '5102', label: '5102 - Venda de mercadoria de terceiros' },
  { value: '5405', label: '5405 - Venda mercadoria sujeita a ST' },
  { value: '5101', label: '5101 - Venda de produção própria' },
];

const SERVICE_CFOP_OPTIONS = [
  { value: '5933', label: '5933 - Prestação de serviço dentro do Estado' },
  { value: '6933', label: '6933 - Prestação de serviço para fora do Estado' },
];

const CSOSN_OPTIONS = [
  { value: '102', label: '102 - Simples Nacional - Sem permissão de crédito (Venda padrão)' },
  { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
  {
    value: '500',
    label: '500 - Simples Nacional - ICMS Cobrado Anteriormente por ST (Substituído)',
  },
  { value: '101', label: '101 - Simples Nacional - Com permissão de crédito' },
  { value: '201', label: '201 - Simples Nacional - Com permissão de crédito e ST' },
  { value: '202', label: '202 - Simples Nacional - Sem permissão de crédito e ST' },
  { value: '300', label: '300 - Simples Nacional - Imune' },
  { value: '400', label: '400 - Simples Nacional - Não tributada' },
  { value: '900', label: '900 - Simples Nacional - Outros' },
];

const PIS_COFINS_OPTIONS = [
  { value: '49', label: '49 - Outras Operações de Saída' },
  { value: '07', label: '07 - Operação Isenta da Contribuição' },
  { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
  { value: '04', label: '04 - Operação Tributável Monofásica (Alíquota Zero)' },
  { value: '06', label: '06 - Operação Tributável com Alíquota Zero' },
  { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
  { value: '99', label: '99 - Outras Operações' },
];

const CEST_OPTIONS = [
  { value: '', label: 'Sem Substituição Tributária (Nenhum / Nulo)' },
  { value: '2806100', label: '28.061.00 - Colchões e box-springs (ST)' },
  { value: '2806200', label: '28.062.00 - Suportes para camas (Estrados)' },
];

const ORIGEM_OPTIONS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira - Importação Direta' },
  { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
  { value: '3', label: '3 - Nacional, conteúdo de importação > 40%' },
  { value: '4', label: '4 - Nacional, PPB' },
  { value: '5', label: '5 - Nacional, conteúdo de importação <= 40%' },
  { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' },
  { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
  { value: '8', label: '8 - Nacional, conteúdo de importação > 70%' },
];

export const ProductFormFiscalTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  canConfigureProductTaxes,
}) => {
  const [showCfopPicker, setShowCfopPicker] = useState(false);
  const [showCestPicker, setShowCestPicker] = useState(false);
  const [showCsosnPicker, setShowCsosnPicker] = useState(false);
  const [showOrigemPicker, setShowOrigemPicker] = useState(false);
  const [showPisPicker, setShowPisPicker] = useState(false);
  const [showCofinsPicker, setShowCofinsPicker] = useState(false);
  const [ncmSearch, setNcmSearch] = useState(String(formData.fiscal?.ncm || ''));
  const [ncmResults, setNcmResults] = useState<any[]>([]);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [ncmCatalog, setNcmCatalog] = useState<any>(null);

  useEffect(() => {
    if (!canConfigureProductTaxes) {
      setShowCfopPicker(false);
      setShowCestPicker(false);
      setShowCsosnPicker(false);
      setShowOrigemPicker(false);
      setShowPisPicker(false);
      setShowCofinsPicker(false);
    }
    if (formData.itemType !== 'service') setShowCfopPicker(false);
    if (formData.itemType === 'service') {
      setShowCestPicker(false);
      setShowOrigemPicker(false);
    }
  }, [canConfigureProductTaxes, formData.itemType]);

  useEffect(() => setNcmSearch(String(formData.fiscal?.ncm || '')), [formData.fiscal?.ncm]);

  useEffect(() => {
    const query = ncmSearch.trim();
    if (formData.itemType === 'service') {
      setNcmResults([]);
      setNcmLoading(false);
      return;
    }
    if (query.length < 2 || /^\d{8}$/.test(query)) {
      setNcmResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setNcmLoading(true);
      try {
        const results = await searchMobileNcms(query);
        if (!cancelled) setNcmResults(results);
      } catch (error) {
        console.warn('[ProductFormFiscalTab] Falha ao pesquisar NCM:', error);
        if (!cancelled) setNcmResults([]);
      } finally {
        if (!cancelled) setNcmLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ncmSearch, formData.itemType]);

  useEffect(() => {
    const code = String(formData.fiscal?.ncm || '').replace(/\D/g, '');
    if (formData.itemType === 'service' || code.length !== 8) {
      setNcmCatalog(null);
      return;
    }
    let cancelled = false;
    fetchMobileNcmCatalogEntry(code).then((entry) => {
      if (!cancelled) setNcmCatalog(entry);
    });
    return () => {
      cancelled = true;
    };
  }, [formData.fiscal?.ncm, formData.itemType]);

  const fiscal = formData.fiscal || {};

  const setFiscalField = (field: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      fiscal: {
        ...(prev.fiscal || {}),
        [field]: val,
      },
    }));
  };

  const updateFiscalCst = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      fiscal: {
        ...(prev.fiscal || {}),
        cst: value,
        csosn: value,
        cest: ['201', '202', '500'].includes(value) ? prev.fiscal?.cest || '' : '',
      },
    }));
  };

  const availableCfopOptions =
    formData.itemType === 'service' ? SERVICE_CFOP_OPTIONS : CFOP_OPTIONS;
  const currentCsosn = fiscal.cst || '103';
  const selectedCfop = availableCfopOptions.find(
    (c) => c.value === (fiscal.cfop || (formData.itemType === 'service' ? '5933' : '5102'))
  );
  const selectedCsosn = CSOSN_OPTIONS.find((c) => c.value === currentCsosn);
  const selectedOrigem = ORIGEM_OPTIONS.find((o) => o.value === String(fiscal.origem ?? '0'));
  const selectedCest = CEST_OPTIONS.find((option) => option.value === String(fiscal.cest || ''));

  return (
    <View style={styles.container}>
      {/* NCM Card */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.cardHeader}>
          <FileText size={16} color="#2563eb" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>
            Classificação Fiscal (NCM)
          </Text>
        </View>

        <View style={styles.field}>
          {formData.itemType === 'service' && (
            <>
              <Text style={[styles.label, dark && styles.dimText]}>
                Código Municipal / Serviço (LC 116/03) <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={fiscal.codigoServico || ''}
                onChangeText={(value) =>
                  setFiscalField('codigoServico', value.replace(/\D/g, '').slice(0, 8))
                }
                keyboardType="numeric"
                placeholder="Ex: 0101"
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
              />
            </>
          )}
          {formData.itemType !== 'service' && (
            <>
              <Text style={[styles.label, dark && styles.dimText]}>
                Código NCM (8 dígitos) <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                value={ncmSearch}
                onChangeText={(v) => {
                  setNcmSearch(v);
                  if (/^\d{8}$/.test(v.trim())) setFiscalField('ncm', v.trim());
                  else if (!v.trim()) setFiscalField('ncm', '');
                }}
                placeholder="Digite o código ou descrição do NCM"
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
              />
              {ncmLoading && <Text style={styles.ncmDesc}>Pesquisando catálogo oficial...</Text>}
              {ncmResults.length > 0 && ncmSearch.trim().length >= 2 && (
                <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                    {ncmResults.map((result: any) => (
                      <TouchableOpacity
                        key={result.code}
                        onPress={() => {
                          setFiscalField('ncm', result.code);
                          setFiscalField('ncmDescription', result.official_description);
                          setNcmSearch(result.code);
                          setNcmResults([]);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text style={[styles.ncmCode, dark && styles.lightText]}>
                          {result.code}
                        </Text>
                        <Text style={styles.ncmDesc}>{result.official_description}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {ncmCatalog && (
                <Text
                  style={[styles.ncmDesc, { color: ncmCatalog.active ? '#15803d' : '#b45309' }]}
                >
                  {ncmCatalog.active
                    ? 'Código ativo no catálogo oficial'
                    : 'Atenção: código inativo no catálogo oficial'}
                </Text>
              )}
            </>
          )}
        </View>

        {formData.itemType !== 'service' && ['201', '202', '500'].includes(fiscal.cst || '') && (
          <View style={styles.field}>
            <Text style={[styles.label, dark && styles.dimText]}>
              Código CEST (Substituição Tributária)
            </Text>
            <TouchableOpacity
              onPress={() => setShowCestPicker((visible) => !visible)}
              style={[styles.selectBtn, dark && styles.darkInput]}
              accessibilityRole="button"
              accessibilityLabel="Selecionar código CEST"
            >
              <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
                {selectedCest?.label || 'Sem Substituição Tributária (Nenhum / Nulo)'}
              </Text>
              <ChevronDown size={14} color="#94a3b8" />
            </TouchableOpacity>
            {showCestPicker && (
              <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                {CEST_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value || 'none'}
                    onPress={() => {
                      setFiscalField('cest', option.value);
                      setShowCestPicker(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={[styles.dropdownItemText, dark && styles.lightText]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              value={fiscal.cest || ''}
              onChangeText={(v) => setFiscalField('cest', v.replace(/\D/g, '').slice(0, 7))}
              keyboardType="numeric"
              placeholder="Ou digite outro CEST (7 dígitos)..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        )}
      </View>

      {/* CFOP & CSOSN Card */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>
          Regime Tributário & Tributos
        </Text>
        {!canConfigureProductTaxes && (
          <Text style={[styles.permissionNote, dark && styles.dimText]}>
            Seu perfil pode consultar os dados fiscais, mas não alterar configurações de impostos.
          </Text>
        )}
        <View
          pointerEvents={canConfigureProductTaxes ? 'auto' : 'none'}
          accessibilityElementsHidden={!canConfigureProductTaxes}
          importantForAccessibility={canConfigureProductTaxes ? 'auto' : 'no-hide-descendants'}
          style={[styles.taxFields, !canConfigureProductTaxes && styles.disabledTaxFields]}
        >
          {formData.itemType === 'service' && (
            <View style={styles.field}>
              <Text style={[styles.label, dark && styles.dimText]}>CFOP Padrão (Municipal)</Text>
              <TouchableOpacity
                onPress={() => setShowCfopPicker(!showCfopPicker)}
                style={[styles.selectBtn, dark && styles.darkInput]}
              >
                <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
                  {selectedCfop?.label || SERVICE_CFOP_OPTIONS[0].label}
                </Text>
                <ChevronDown size={14} color="#94a3b8" />
              </TouchableOpacity>
              {showCfopPicker && (
                <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                  {SERVICE_CFOP_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setFiscalField('cfop', opt.value);
                        setShowCfopPicker(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={[styles.dropdownItemText, dark && styles.lightText]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* CSOSN / CST */}
          <View style={styles.field}>
            <Text style={[styles.label, dark && styles.dimText]}>
              {formData.itemType === 'service'
                ? 'CST / CSOSN ISSQN'
                : 'CST / CSOSN ICMS (Simples Nacional)'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowCsosnPicker(!showCsosnPicker)}
              style={[styles.selectBtn, dark && styles.darkInput]}
            >
              <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
                {selectedCsosn?.label || CSOSN_OPTIONS[1].label}
              </Text>
              <ChevronDown size={14} color="#94a3b8" />
            </TouchableOpacity>
            {showCsosnPicker && (
              <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                {CSOSN_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setShowCsosnPicker(false);
                      if (opt.value === currentCsosn) return;
                      if (formData.itemType === 'service') {
                        updateFiscalCst(opt.value);
                        return;
                      }
                      Alert.alert(
                        'Confirmar alteração de CSOSN?',
                        `Tem certeza de que deseja alterar o CSOSN de ${currentCsosn} para ${opt.value}? Essa classificação pode mudar a tributação da operação.`,
                        [
                          { text: 'Não, manter atual', style: 'cancel' },
                          {
                            text: 'Sim, alterar',
                            onPress: () => updateFiscalCst(opt.value),
                          },
                        ]
                      );
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={[styles.dropdownItemText, dark && styles.lightText]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Origem */}
          {formData.itemType !== 'service' && (
            <View style={styles.field}>
              <Text style={[styles.label, dark && styles.dimText]}>Origem da Mercadoria</Text>
              <TouchableOpacity
                onPress={() => setShowOrigemPicker(!showOrigemPicker)}
                style={[styles.selectBtn, dark && styles.darkInput]}
              >
                <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
                  {selectedOrigem?.label || '0 - Nacional'}
                </Text>
                <ChevronDown size={14} color="#94a3b8" />
              </TouchableOpacity>
              {showOrigemPicker && (
                <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                  {ORIGEM_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setFiscalField('origem', opt.value);
                        setShowOrigemPicker(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={[styles.dropdownItemText, dark && styles.lightText]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ICMS % */}
          <View style={styles.field}>
            <Text style={[styles.label, dark && styles.dimText]}>
              {formData.itemType === 'service' ? 'Alíquota ISS (%)' : 'Alíquota ICMS (%)'}
            </Text>
            <TextInput
              value={
                formData.itemType === 'service'
                  ? String(fiscal.issPercent ?? 0)
                  : String(fiscal.icmsPercent ?? 0)
              }
              onChangeText={(v) =>
                setFiscalField(formData.itemType === 'service' ? 'issPercent' : 'icmsPercent', v)
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>

          {(['pisCst', 'cofinsCst'] as const).map((field) => {
            const isPis = field === 'pisCst';
            const visible = isPis ? showPisPicker : showCofinsPicker;
            const setVisible = isPis ? setShowPisPicker : setShowCofinsPicker;
            const value = fiscal[field] || '99';
            const selected = PIS_COFINS_OPTIONS.find((option) => option.value === value);
            return (
              <View key={field} style={styles.field}>
                <Text style={[styles.label, dark && styles.dimText]}>
                  {isPis ? 'PIS CST' : 'COFINS CST'}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(!visible)}
                  style={[styles.selectBtn, dark && styles.darkInput]}
                >
                  <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
                    {selected?.label || value}
                  </Text>
                  <ChevronDown size={14} color="#94a3b8" />
                </TouchableOpacity>
                {visible && (
                  <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                      {PIS_COFINS_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setFiscalField(field, option.value);
                            setVisible(false);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text style={[styles.dropdownItemText, dark && styles.lightText]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  taxFields: { gap: 12 },
  disabledTaxFields: { opacity: 0.5 },
  permissionNote: { fontSize: 11, lineHeight: 16, color: '#64748b' },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
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
  selectBtn: {
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a', flex: 1 },
  dropdownBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  ncmCode: { fontSize: 12, fontWeight: '900', color: '#2563eb' },
  ncmDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
