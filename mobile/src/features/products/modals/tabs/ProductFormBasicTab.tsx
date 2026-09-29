import React, { useState, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Settings } from 'lucide-react-native';
import { fetchMobileCategories, MobileCategory } from '../../services/mobileCategoryService';
import {
  fetchMobileOpportunities,
  MobileOpportunity,
} from '../../services/mobileOpportunityService';
import { OpportunitySelectModal } from '../components/OpportunitySelectModal';
import { CategoryMultiSelectList } from '../components/CategoryMultiSelectList';
import { CategoriesManagerModal } from '../CategoriesManagerModal';

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
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);

  const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(
    Boolean(formData.title && formData.title !== formData.name) ||
      Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
  );

  useEffect(() => {
    setDiferenciarTitulo(
      Boolean(formData.title && formData.title !== formData.name) ||
        Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
    );
  }, [formData.name, formData.title, formData.marketplaceTitle]);

  useEffect(() => {
    fetchMobileCategories().then(setCategories);
    fetchMobileOpportunities().then(setOpportunities);
  }, []);

  const set = (field: string, val: any) => setFormData((prev) => ({ ...prev, [field]: val }));

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const name = cat.name?.trim().toUpperCase() || '';
      const isFixed = FIXED_ENVIRONMENTS.includes(name);
      const hasChildren = categories.some((other) => other.parents?.includes(cat.id));
      const isEnvironment =
        isFixed ||
        (hasChildren && (!cat.parents || cat.parents.length === 0)) ||
        !cat.parents ||
        cat.parents.length === 0;
      return !isEnvironment;
    });
  }, [categories]);

  const handleToggleCategory = (cat: MobileCategory) => {
    const currentIds: string[] =
      formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);
    const isChecked = currentIds.includes(cat.id);
    let nextIds: string[];

    if (isChecked) {
      nextIds = currentIds.filter((id) => id !== cat.id);
    } else {
      nextIds = [...currentIds, cat.id];
    }

    const firstSelected = categories.find((c) => c.id === nextIds[0]);

    setFormData((prev) => ({
      ...prev,
      categoryIds: nextIds,
      categoryId: nextIds[0] || '',
      category: firstSelected?.name || '',
    }));
  };

  const selectedOpportunity = opportunities.find((o) => o.id === formData.opportunityId);
  const selectedCategoryIds: string[] =
    formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);

  const currentOrigin =
    formData.productKind === 'salvado' || formData.condition === 'salvado'
      ? 'salvado'
      : formData.productKind === 'usado' || formData.condition === 'usado'
        ? 'usado'
        : 'normal';

  const isNormal = currentOrigin === 'normal';
  const isSalvado = currentOrigin === 'salvado';
  const isUsado = currentOrigin === 'usado';

  const handleSelectOrigin = (origin: 'normal' | 'salvado' | 'usado') => {
    const salvadoOpp = opportunities.find((o) => o.name?.toLowerCase().includes('salvado'));
    setFormData((prev: any) => {
      const next = {
        ...prev,
        productKind: origin,
        condition: origin === 'salvado' ? 'salvado' : origin === 'usado' ? 'usado' : 'novo',
      };
      if (origin === 'salvado') {
        next.active = false;
        if (salvadoOpp) {
          next.opportunityId = salvadoOpp.id;
        }
      } else {
        if (salvadoOpp && prev.opportunityId === salvadoOpp.id) {
          next.opportunityId = null;
        }
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* ORIGEM DO ESTOQUE */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <Text style={[styles.label, dark && styles.lightLabel]}>ORIGEM DO ESTOQUE</Text>
          <View style={styles.originRow}>
            <TouchableOpacity
              onPress={() => handleSelectOrigin('normal')}
              style={[
                styles.originBtn,
                isNormal
                  ? styles.originBtnActive
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Normal"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isNormal ? styles.originBtnTextActive : dark ? styles.lightText : styles.dimText,
                ]}
              >
                Normal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectOrigin('salvado')}
              style={[
                styles.originBtn,
                isSalvado
                  ? styles.originBtnActiveSalvado
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Salvados"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isSalvado
                    ? styles.originBtnTextActiveSalvado
                    : dark
                      ? styles.lightText
                      : styles.dimText,
                ]}
              >
                Salvados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectOrigin('usado')}
              style={[
                styles.originBtn,
                isUsado
                  ? styles.originBtnActiveUsado
                  : dark
                    ? styles.darkInput
                    : styles.lightDiferenciarBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Origem do estoque Usados"
            >
              <Text
                style={[
                  styles.originBtnText,
                  isUsado
                    ? styles.originBtnTextActiveUsado
                    : dark
                      ? styles.lightText
                      : styles.dimText,
                ]}
              >
                Usados
              </Text>
            </TouchableOpacity>
          </View>
          {isSalvado && (
            <Text style={styles.salvadoWarning}>
              O produto e suas variações serão desativados no ERP.
            </Text>
          )}
        </View>
      )}

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
                setFormData((prev) => ({
                  ...prev,
                  title: prev.name || '',
                  marketplaceTitle: prev.name || '',
                }));
              }
            }}
            style={[
              styles.diferenciarBtn,
              diferenciarTitulo
                ? styles.diferenciarBtnActive
                : dark
                  ? styles.darkDiferenciarBtn
                  : styles.lightDiferenciarBtn,
            ]}
          >
            <Text
              style={[
                styles.diferenciarBtnText,
                diferenciarTitulo
                  ? styles.diferenciarBtnTextActive
                  : dark
                    ? styles.lightText
                    : styles.dimText,
              ]}
            >
              {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={formData.name || ''}
          onChangeText={(val) => {
            setFormData((prev) => ({
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
            onChangeText={(val) => {
              setFormData((prev) => ({
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

      {/* CATEGORIA(S) */}
      {formData.itemType !== 'service' && (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadgeRow}>
              <Text style={[styles.label, dark && styles.lightLabel]}>
                CATEGORIA(S) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.catalogBadge}>
                <Text style={styles.catalogBadgeText}>CATÁLOGO</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategoriesManager(true)}
                style={styles.manageCategoriesButton}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar categorias de produtos"
              >
                <Text style={styles.manageCategoriesText}>GERENCIAR</Text>
                <Settings size={12} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedCategoryIds.length > 0 && (
              <Text style={styles.selectedCategoryCount}>
                {selectedCategoryIds.length} selecionada{selectedCategoryIds.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <CategoryMultiSelectList
            categories={categories}
            filteredCategories={filteredCategories}
            selectedCategoryIds={selectedCategoryIds}
            onToggleCategory={handleToggleCategory}
            dark={dark}
          />
        </View>
      )}

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
          onPress={() => {
            if (isSalvado) return;
            setShowOpportunityModal(true);
          }}
          disabled={isSalvado}
          style={[styles.selectBox, dark && styles.darkInput, isSalvado && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Selecionar Oportunidade"
        >
          <Text style={[styles.selectBoxText, dark && styles.lightText]} numberOfLines={1}>
            {selectedOpportunity ? selectedOpportunity.name : 'Nenhuma (Produto Normal)'}
          </Text>
          {!isSalvado && <ChevronDown size={16} color="#94a3b8" />}
        </TouchableOpacity>
      </View>

      {/* OBSERVAÇÕES INTERNAS */}
      <View style={styles.field}>
        <Text style={[styles.label, dark && styles.lightLabel]}>OBSERVAÇÕES INTERNAS</Text>
        <TextInput
          value={formData.observations || ''}
          onChangeText={(val) => set('observations', val)}
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
        opportunities={
          isSalvado
            ? opportunities
            : opportunities.filter((o) => !o.name?.toLowerCase().includes('salvado'))
        }
        selectedOpportunityId={formData.opportunityId}
        onSelect={(id) => set('opportunityId', id)}
        onClose={() => setShowOpportunityModal(false)}
        dark={dark}
      />
      <CategoriesManagerModal
        visible={showCategoriesManager}
        dark={dark}
        onClose={() => {
          setShowCategoriesManager(false);
          fetchMobileCategories().then(setCategories);
        }}
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
  selectedCategoryCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  manageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  manageCategoriesText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#64748b',
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
  originRow: {
    flexDirection: 'row',
    gap: 8,
  },
  originBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  originBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  originBtnActiveSalvado: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  originBtnActiveUsado: {
    backgroundColor: '#faf5ff',
    borderColor: '#a855f7',
  },
  originBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  originBtnTextActive: {
    color: '#1d4ed8',
  },
  originBtnTextActiveSalvado: {
    color: '#ea580c',
  },
  originBtnTextActiveUsado: {
    color: '#9333ea',
  },
  salvadoWarning: {
    fontSize: 11,
    color: '#ea580c',
    marginTop: 4,
    fontWeight: '600',
  },
});
