import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronDown, Link2, X } from 'lucide-react-native';
import { fetchMobileCategories, MobileCategory } from '../../services/mobileCategoryService';
import { fetchMobileOpportunities, MobileOpportunity } from '../../services/mobileOpportunityService';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

const FIXED_ENVIRONMENTS = [
  'SALA DE JANTAR',
  'SALA DE ESTAR',
  'COZINHA',
  'QUARTO',
  'LAVANDERIA',
  'BANHEIRO',
  'LAVANDEIRA',
  'ESCRITORIO',
  'ESCRITÓRIO',
  'VARANDA',
  'ÁREA GOURMET',
  'GARAGEM',
];

export const ProductFormBasicTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [categories, setCategories] = useState<MobileCategory[]>([]);
  const [opportunities, setOpportunities] = useState<MobileOpportunity[]>([]);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);

  const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(
    Boolean(formData.title && formData.title !== formData.name) ||
    Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
  );

  useEffect(() => {
    fetchMobileCategories().then(setCategories);
    fetchMobileOpportunities().then(setOpportunities);
  }, []);

  const set = (field: string, val: any) => setFormData(prev => ({ ...prev, [field]: val }));

  // Cálculo dinâmico do slug amigável
  const computedSlug = useMemo(() => {
    const raw = formData.title || formData.name || '';
    const clean = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return clean || 'slug-do-produto';
  }, [formData.name, formData.title]);

  // Atualiza slug no formData caso não esteja preenchido
  useEffect(() => {
    set('slug', computedSlug);
  }, [computedSlug]);

  // Filtra categorias para remover ambientes puros, idêntico ao ERP
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const name = cat.name?.trim().toUpperCase() || '';
      const isFixed = FIXED_ENVIRONMENTS.includes(name);
      const hasChildren = categories.some(other => other.parents?.includes(cat.id));
      const isEnvironment = isFixed || (hasChildren && (!cat.parents || cat.parents.length === 0)) || (!cat.parents || cat.parents.length === 0);
      return !isEnvironment;
    });
  }, [categories]);

  // Toggle de seleção de categoria (múltipla)
  const handleToggleCategory = (cat: MobileCategory) => {
    const currentIds: string[] = formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
    const isChecked = currentIds.includes(cat.id);
    let nextIds: string[];

    if (isChecked) {
      nextIds = currentIds.filter(id => id !== cat.id);
    } else {
      nextIds = [...currentIds, cat.id];
    }

    const firstSelected = categories.find(c => nextIds.includes(c.id));

    setFormData(prev => ({
      ...prev,
      categoryIds: nextIds,
      categoryId: nextIds[0] || '',
      category: firstSelected?.name || '',
    }));
  };

  const selectedOpportunity = opportunities.find(o => o.id === formData.opportunityId);

  return (
    <View style={styles.container}>
      {/* ── NOME DO PRODUTO (com Diferenciar Título no Catálogo) ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, dark && styles.lightLabel]}>
            NOME <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => {
              const nextVal = !diferenciarTitulo;
              setDiferenciarTitulo(nextVal);
              if (!nextVal) {
                setFormData(prev => ({
                  ...prev,
                  title: prev.name || '',
                  marketplaceTitle: prev.name || '',
                }));
              }
            }}
            style={[
              styles.diferenciarBtn,
              diferenciarTitulo ? styles.diferenciarBtnActive : (dark ? styles.darkDiferenciarBtn : styles.lightDiferenciarBtn)
            ]}
          >
            <Text style={[
              styles.diferenciarBtnText,
              diferenciarTitulo ? styles.diferenciarBtnTextActive : (dark ? styles.lightText : styles.dimText)
            ]}>
              {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={formData.name || ''}
          onChangeText={val => {
            setFormData(prev => ({
              ...prev,
              name: val,
              ...(!diferenciarTitulo ? { title: val, marketplaceTitle: val } : {}),
            }));
          }}
          placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      {/* ── TÍTULO NO CATÁLOGO (Condicional) ── */}
      {diferenciarTitulo && (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadgeRow}>
              <Text style={[styles.label, dark && styles.lightLabel]}>TÍTULO NO CATÁLOGO</Text>
              <View style={styles.catalogBadge}>
                <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
              </View>
            </View>
          </View>
          <TextInput
            value={formData.title || formData.marketplaceTitle || ''}
            onChangeText={val => {
              setFormData(prev => ({
                ...prev,
                title: val,
                marketplaceTitle: val,
              }));
            }}
            placeholder="Digite o título no catálogo..."
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      )}

      {/* ── SLUG (URL DO PRODUTO) ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadgeRow}>
            <Link2 size={13} color="#3b82f6" />
            <Text style={[styles.label, dark && styles.lightLabel]}>SLUG (URL DO PRODUTO)</Text>
          </View>
        </View>
        <View style={[styles.slugBox, dark && styles.darkSlugBox]}>
          <Text style={styles.slugPrefix}>/produto/</Text>
          <Text style={styles.slugText} numberOfLines={1}>
            {computedSlug}
          </Text>
        </View>
      </View>

      {/* ── CATEGORIA(S) * com Badge Catálogo ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadgeRow}>
            <Text style={[styles.label, dark && styles.lightLabel]}>
              CATEGORIA(S) <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.catalogBadge}>
              <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
            </View>
          </View>
        </View>

        <View style={[styles.categoriesContainer, dark && styles.darkCategoriesContainer]}>
          <ScrollView nestedScrollEnabled style={styles.categoriesScroll}>
            {filteredCategories.map(cat => {
              const selectedIds: string[] = formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
              const isChecked = selectedIds.includes(cat.id);

              const parentNames = (cat.parents || [])
                .map(pid => categories.find(item => item.id === pid)?.name)
                .filter(Boolean)
                .join(', ');

              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleToggleCategory(cat)}
                  style={[styles.categoryItem, dark && styles.darkCategoryItem]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked, dark && !isChecked && styles.darkCheckbox]}>
                    {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, isChecked && styles.categoryNameActive, dark && styles.lightText]}>
                      {cat.name}
                    </Text>
                    {parentNames ? (
                      <Text style={styles.categoryParents} numberOfLines={1}>
                        Ambientes: {parentNames}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filteredCategories.length === 0 && (
              <Text style={styles.emptyCategoriesText}>Carregando categorias...</Text>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ── OPORTUNIDADE com Badge Catálogo ── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadgeRow}>
            <Text style={[styles.label, dark && styles.lightLabel]}>OPORTUNIDADE</Text>
            <View style={styles.catalogBadge}>
              <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowOpportunityModal(true)}
          style={[styles.selectBox, dark && styles.darkInput]}
        >
          <Text style={[styles.selectBoxText, dark && styles.lightText]} numberOfLines={1}>
            {selectedOpportunity ? selectedOpportunity.name : 'Nenhuma (Produto Normal)'}
          </Text>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ── OBSERVAÇÕES INTERNAS ── */}
      <View style={styles.field}>
        <Text style={[styles.label, dark && styles.lightLabel]}>OBSERVAÇÕES INTERNAS</Text>
        <TextInput
          value={formData.observations || ''}
          onChangeText={val => set('observations', val)}
          placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[styles.textarea, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      {/* Modal de Seleção de Oportunidade */}
      <Modal visible={showOpportunityModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOpportunityModal(false)}
        >
          <View style={[styles.modalContent, dark && styles.darkModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dark && styles.lightText]}>Selecionar Oportunidade</Text>
              <TouchableOpacity onPress={() => setShowOpportunityModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color={dark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                onPress={() => {
                  set('opportunityId', null);
                  setShowOpportunityModal(false);
                }}
                style={[
                  styles.modalItem,
                  !formData.opportunityId && styles.modalItemActive,
                  dark && styles.darkModalItem,
                ]}
              >
                <Text style={[styles.modalItemText, !formData.opportunityId && styles.modalItemTextActive, dark && styles.lightText]}>
                  Nenhuma (Produto Normal)
                </Text>
                {!formData.opportunityId && <Check size={16} color="#2563eb" strokeWidth={2.5} />}
              </TouchableOpacity>

              {opportunities.map(opp => {
                const isSelected = formData.opportunityId === opp.id;
                return (
                  <TouchableOpacity
                    key={opp.id}
                    onPress={() => {
                      set('opportunityId', opp.id);
                      setShowOpportunityModal(false);
                    }}
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                      dark && styles.darkModalItem,
                    ]}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive, dark && styles.lightText]}>
                      {opp.name}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  lightLabel: {
    color: '#94a3b8',
  },
  required: {
    color: '#ef4444',
  },
  catalogBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  catalogBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  diferenciarBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lightDiferenciarBtn: {
    backgroundColor: '#f1f5f9',
  },
  darkDiferenciarBtn: {
    backgroundColor: '#1e293b',
  },
  diferenciarBtnActive: {
    backgroundColor: '#f3e8ff',
  },
  diferenciarBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  diferenciarBtnTextActive: {
    color: '#7e22ce',
  },
  dimText: {
    color: '#64748b',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  darkInput: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  lightText: {
    color: '#f8fafc',
  },
  slugBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  darkSlugBox: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  slugPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slugText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  categoriesContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    maxHeight: 220,
    overflow: 'hidden',
  },
  darkCategoriesContainer: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  categoriesScroll: {
    padding: 6,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  darkCategoryItem: {
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  darkCheckbox: {
    borderColor: '#475569',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryInfo: {
    flex: 1,
    gap: 1,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  categoryNameActive: {
    color: '#2563eb',
  },
  categoryParents: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  emptyCategoriesText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  selectBox: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  selectBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  darkModalContent: {
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalList: {
    maxHeight: 280,
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  darkModalItem: {},
  modalItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalItemTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
