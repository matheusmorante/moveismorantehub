import React, { useState, useEffect, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, Link2 } from 'lucide-react-native';
import { fetchMobileCategories, MobileCategory } from '../../services/mobileCategoryService';
import { fetchMobileOpportunities, MobileOpportunity } from '../../services/mobileOpportunityService';
import { OpportunitySelectModal } from '../components/OpportunitySelectModal';
import { CategoryMultiSelectList } from '../components/CategoryMultiSelectList';

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

  useEffect(() => {
    set('slug', computedSlug);
  }, [computedSlug]);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const name = cat.name?.trim().toUpperCase() || '';
      const isFixed = FIXED_ENVIRONMENTS.includes(name);
      const hasChildren = categories.some(other => other.parents?.includes(cat.id));
      const isEnvironment = isFixed || (hasChildren && (!cat.parents || cat.parents.length === 0)) || (!cat.parents || cat.parents.length === 0);
      return !isEnvironment;
    });
  }, [categories]);

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
  const selectedCategoryIds: string[] = formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);

  return (
    <View style={styles.container}>
      {/* NOME DO PRODUTO */}
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

      {/* TÍTULO NO CATÁLOGO */}
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

      {/* SLUG */}
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

      {/* CATEGORIA(S) */}
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

        <CategoryMultiSelectList
          categories={categories}
          filteredCategories={filteredCategories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={handleToggleCategory}
          dark={dark}
        />
      </View>

      {/* OPORTUNIDADE */}
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

      {/* OBSERVAÇÕES INTERNAS */}
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

      {/* Modal Modular de Oportunidade */}
      <OpportunitySelectModal
        visible={showOpportunityModal}
        opportunities={opportunities}
        selectedOpportunityId={formData.opportunityId}
        onSelect={id => set('opportunityId', id)}
        onClose={() => setShowOpportunityModal(false)}
        dark={dark}
      />
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
});
