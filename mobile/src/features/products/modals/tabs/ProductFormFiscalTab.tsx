import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, FileText } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

const CFOP_OPTIONS = [
  { value: '5102', label: '5102 - Venda de mercadoria de terceiros' },
  { value: '5405', label: '5405 - Venda mercadoria sujeita a ST' },
  { value: '5101', label: '5101 - Venda de produção própria' },
  { value: '5933', label: '5933 - Prestação de Serviço' },
];

const CSOSN_OPTIONS = [
  { value: '102', label: '102 - Tributada pelo Simples sem permissão de crédito' },
  { value: '500', label: '500 - ICMS cobrado anteriormente por ST' },
  { value: '101', label: '101 - Com permissão de crédito' },
  { value: '201', label: '201 - Com permissão de crédito e ST' },
  { value: '202', label: '202 - Sem permissão de crédito e ST' },
  { value: '300', label: '300 - Imune' },
  { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
  { value: '900', label: '900 - Outros' },
];

const PIS_COFINS_OPTIONS = [
  { value: '49', label: '49 - Outras Operações de Saída' },
  { value: '07', label: '07 - Operação Isenta da Contribuição' },
  { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
  { value: '04', label: '04 - Tributável Monofásica (Alíquota Zero)' },
  { value: '06', label: '06 - Tributável com Alíquota Zero' },
  { value: '01', label: '01 - Tributável com Alíquota Básica' },
  { value: '99', label: '99 - Outras Operações' },
];

const ORIGEM_OPTIONS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira - Importação Direta' },
  { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
  { value: '3', label: '3 - Nacional, conteúdo de importação superior a 40%' },
  { value: '4', label: '4 - Nacional, PPB' },
  { value: '5', label: '5 - Nacional, conteúdo de importação até 40%' },
  { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' },
  { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
  { value: '8', label: '8 - Nacional, conteúdo de importação superior a 70%' },
];

export const ProductFormFiscalTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [showCfopPicker, setShowCfopPicker] = useState(false);
  const [showCsosnPicker, setShowCsosnPicker] = useState(false);
  const [showOrigemPicker, setShowOrigemPicker] = useState(false);
  const [showPisPicker, setShowPisPicker] = useState(false);
  const [showCofinsPicker, setShowCofinsPicker] = useState(false);
  const [ncmSearch, setNcmSearch] = useState(String(formData.fiscal?.ncm || ''));
  const [ncmResults, setNcmResults] = useState<any[]>([]);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [ncmCatalog, setNcmCatalog] = useState<any>(null);

  useEffect(() => setNcmSearch(String(formData.fiscal?.ncm || '')), [formData.fiscal?.ncm]);

  useEffect(() => {
    const query = ncmSearch.trim();
    if (query.length < 2 || /^\d{8}$/.test(query)) { setNcmResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setNcmLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_ncms', { search_term: query, max_results: 10 });
        if (error) throw error;
        if (!cancelled) setNcmResults(data || []);
      } catch (error) {
        console.warn('[ProductFormFiscalTab] Falha ao pesquisar NCM:', error);
        if (!cancelled) setNcmResults([]);
      } finally { if (!cancelled) setNcmLoading(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ncmSearch]);

  useEffect(() => {
    const code = String(formData.fiscal?.ncm || '').replace(/\D/g, '');
    if (code.length !== 8) { setNcmCatalog(null); return; }
    let cancelled = false;
    supabase.from('ncms').select('code, official_description, active, start_date, end_date')
      .eq('code', code).maybeSingle().then(({ data, error }) => {
        if (!cancelled && !error) setNcmCatalog(data);
      });
    return () => { cancelled = true; };
  }, [formData.fiscal?.ncm]);

  const fiscal = formData.fiscal || {};

  const setFiscalField = (field: string, val: any) => {
    setFormData(prev => ({
      ...prev,
      fiscal: {
        ...(prev.fiscal || {}),
        [field]: val,
      },
    }));
  };

  const selectedCfop = CFOP_OPTIONS.find(c => c.value === (fiscal.cfop || '5102'));
  const selectedCsosn = CSOSN_OPTIONS.find(c => c.value === (fiscal.cst || fiscal.csosn || '102'));
  const selectedOrigem = ORIGEM_OPTIONS.find(o => o.value === String(fiscal.origem ?? '0'));

  return (
    <View style={styles.container}>
      {/* NCM Card */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.cardHeader}>
          <FileText size={16} color="#2563eb" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>Classificação Fiscal (NCM)</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.dimText]}>Código NCM (8 dígitos)</Text>
          <TextInput
            value={ncmSearch}
            onChangeText={v => {
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
                  <TouchableOpacity key={result.code} onPress={() => {
                    setFiscalField('ncm', result.code);
                    setFiscalField('ncmDescription', result.official_description);
                    setNcmSearch(result.code);
                    setNcmResults([]);
                  }} style={styles.dropdownItem}>
                    <Text style={[styles.ncmCode, dark && styles.lightText]}>{result.code}</Text>
                    <Text style={styles.ncmDesc}>{result.official_description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {ncmCatalog && <Text style={[styles.ncmDesc, { color: ncmCatalog.active ? '#15803d' : '#b45309' }]}>
            {ncmCatalog.active ? 'Código ativo no catálogo oficial' : 'Atenção: código inativo no catálogo oficial'}
          </Text>}
        </View>

        {(['201', '202', '500'].includes(fiscal.cst || fiscal.csosn || '') || Boolean(fiscal.cest)) && (
          <View style={styles.field}>
            <Text style={[styles.label, dark && styles.dimText]}>CEST (Substituição Tributária)</Text>
            <TextInput
              value={fiscal.cest || ''}
              onChangeText={v => setFiscalField('cest', v.replace(/\D/g, '').slice(0, 7))}
              keyboardType="numeric"
              placeholder="Ex: 2806100"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        )}
      </View>

      {/* CFOP & CSOSN Card */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>Regime Tributário & Tributos</Text>

        {/* CFOP */}
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.dimText]}>CFOP Padrão</Text>
          <TouchableOpacity
            onPress={() => setShowCfopPicker(!showCfopPicker)}
            style={[styles.selectBtn, dark && styles.darkInput]}
          >
            <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
              {selectedCfop?.label || '5102 - Venda de mercadoria'}
            </Text>
            <ChevronDown size={14} color="#94a3b8" />
          </TouchableOpacity>
          {showCfopPicker && (
            <View style={[styles.dropdownBox, dark && styles.darkCard]}>
              {CFOP_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setFiscalField('cfop', opt.value);
                    setShowCfopPicker(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={[styles.dropdownItemText, dark && styles.lightText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* CSOSN / CST */}
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.dimText]}>CSOSN / Situação Tributária (ICMS)</Text>
          <TouchableOpacity
            onPress={() => setShowCsosnPicker(!showCsosnPicker)}
            style={[styles.selectBtn, dark && styles.darkInput]}
          >
            <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>
              {selectedCsosn?.label || '102 - Simples Nacional'}
            </Text>
            <ChevronDown size={14} color="#94a3b8" />
          </TouchableOpacity>
          {showCsosnPicker && (
            <View style={[styles.dropdownBox, dark && styles.darkCard]}>
              {CSOSN_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setFiscalField('cst', opt.value);
                    setFiscalField('csosn', opt.value);
                    setShowCsosnPicker(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={[styles.dropdownItemText, dark && styles.lightText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Origem */}
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
              {ORIGEM_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setFiscalField('origem', opt.value);
                    setShowOrigemPicker(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={[styles.dropdownItemText, dark && styles.lightText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ICMS % */}
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.dimText]}>Alíquota ICMS (%)</Text>
          <TextInput
            value={fiscal.icmsPercent !== undefined ? String(fiscal.icmsPercent) : ''}
            onChangeText={v => setFiscalField('icmsPercent', v)}
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
          const value = fiscal[field] || '49';
          const selected = PIS_COFINS_OPTIONS.find(option => option.value === value);
          return (
            <View key={field} style={styles.field}>
              <Text style={[styles.label, dark && styles.dimText]}>{isPis ? 'PIS CST' : 'COFINS CST'}</Text>
              <TouchableOpacity onPress={() => setVisible(!visible)} style={[styles.selectBtn, dark && styles.darkInput]}>
                <Text style={[styles.selectBtnText, dark && styles.lightText]} numberOfLines={1}>{selected?.label || value}</Text>
                <ChevronDown size={14} color="#94a3b8" />
              </TouchableOpacity>
              {visible && <View style={[styles.dropdownBox, dark && styles.darkCard]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  {PIS_COFINS_OPTIONS.map(option => <TouchableOpacity key={option.value} onPress={() => {
                    setFiscalField(field, option.value);
                    setVisible(false);
                  }} style={styles.dropdownItem}>
                    <Text style={[styles.dropdownItemText, dark && styles.lightText]}>{option.label}</Text>
                  </TouchableOpacity>)}
                </ScrollView>
              </View>}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  input: { height: 44, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  selectBtn: { height: 44, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a', flex: 1 },
  dropdownBox: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  ncmCode: { fontSize: 12, fontWeight: '900', color: '#2563eb' },
  ncmDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
});
