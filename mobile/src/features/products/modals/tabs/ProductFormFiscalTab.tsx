import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, FileText } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

const COMMON_NCMS = [
  { code: '94036000', description: 'Outros móveis de madeira (Rack, Painel, Aparador)' },
  { code: '94016100', description: 'Assentos com armação de madeira, estofados (Sofá, Poltrona)' },
  { code: '94035000', description: 'Móveis de madeira para dormitórios (Guarda-roupa, Cama)' },
  { code: '94033000', description: 'Móveis de madeira para escritórios (Escrivaninha, Mesa)' },
  { code: '94034000', description: 'Móveis de madeira para cozinhas (Armário, Balcão)' },
  { code: '94042100', description: 'Colchões de espuma (borracha ou plástico)' },
  { code: '94042900', description: 'Colchões de molas ou outros materiais' },
  { code: '94032000', description: 'Outros móveis de metal (Mesa com base de aço)' },
];

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
  { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
];

const ORIGEM_OPTIONS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira - Importação Direta' },
  { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
];

export const ProductFormFiscalTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [showNcmList, setShowNcmList] = useState(false);
  const [showCfopPicker, setShowCfopPicker] = useState(false);
  const [showCsosnPicker, setShowCsosnPicker] = useState(false);
  const [showOrigemPicker, setShowOrigemPicker] = useState(false);

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
            value={fiscal.ncm || ''}
            onChangeText={v => setFiscalField('ncm', v.replace(/\D/g, '').slice(0, 8))}
            keyboardType="numeric"
            placeholder="Ex: 94036000"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowNcmList(!showNcmList)}
          style={[styles.selectBtn, dark && styles.darkInput]}
        >
          <Text style={[styles.selectBtnText, dark && styles.lightText]}>
            {showNcmList ? 'Ocultar NCMs Frequentes' : 'Ver NCMs Sugeridos (Móveis)'}
          </Text>
          <ChevronDown size={14} color="#94a3b8" />
        </TouchableOpacity>

        {showNcmList && (
          <View style={[styles.dropdownBox, dark && styles.darkCard]}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
              {COMMON_NCMS.map(ncm => (
                <TouchableOpacity
                  key={ncm.code}
                  onPress={() => {
                    setFiscalField('ncm', ncm.code);
                    setFiscalField('ncmDescription', ncm.description);
                    setShowNcmList(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={[styles.ncmCode, dark && styles.lightText]}>{ncm.code}</Text>
                  <Text style={styles.ncmDesc}>{ncm.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.dimText]}>CEST (Opcional)</Text>
          <TextInput
            value={fiscal.cest || ''}
            onChangeText={v => setFiscalField('cest', v)}
            keyboardType="numeric"
            placeholder="Ex: 2806100"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
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
