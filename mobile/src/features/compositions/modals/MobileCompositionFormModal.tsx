import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Layers, X, Check } from 'lucide-react-native';
import type { Composition } from '../types/composition.type';
import { useCompositionForm } from '../hooks/useCompositionForm';
import { useCompositionProductSearch } from '../hooks/useCompositionProductSearch';
import { CompositionTabsHeader } from '../components/CompositionTabsHeader';
import { CompositionInfoTab } from '../components/CompositionInfoTab';
import { CompositionItemsTab } from '../components/CompositionItemsTab';
import { CompositionConstructionTab } from '../components/CompositionConstructionTab';

interface MobileCompositionFormModalProps {
  visible: boolean;
  onClose: () => void;
  composition?: Composition | null;
  onSuccess?: () => void;
  isDarkMode?: boolean;
}

/**
 * Modal principal de cadastro e edição de composições no aplicativo móvel.
 * Coesão alta e arquitetura modular delegando estado para hooks dedicados e sub-abas.
 */
export const MobileCompositionFormModal: React.FC<MobileCompositionFormModalProps> = ({
  visible,
  onClose,
  composition,
  onSuccess,
  isDarkMode,
}) => {
  const themeColors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    surface: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f1f5f9' : '#1e293b',
    textMuted: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#3b82f6',
    danger: '#ef4444',
  };

  const {
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    items,
    manualPriceInput,
    setManualPriceInput,
    isSaving,
    handleAddItem,
    removeItem,
    updateItemQuantity,
    handleSave,
  } = useCompositionForm({
    visible,
    composition,
    onSuccess,
    onClose,
  });

  const {
    searchTerm,
    setSearchTerm,
    results,
    searching,
    searchError,
  } = useCompositionProductSearch(visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: themeColors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabeçalho do Modal */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: `${themeColors.primary}20`,
                padding: 8,
                borderRadius: 8,
                marginRight: 12,
              }}
            >
              <Layers size={20} color={themeColors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>
              {composition ? 'Editar Composição' : 'Nova Composição'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={24} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Abas Superiores */}
        <CompositionTabsHeader
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          themeColors={themeColors}
        />

        {/* Conteúdo Dinâmico por Aba */}
        <View style={{ flex: 1 }}>
          {activeTab === 'info' && (
            <CompositionInfoTab
              formData={formData}
              setFormData={setFormData}
              manualPriceInput={manualPriceInput}
              setManualPriceInput={setManualPriceInput}
              themeColors={themeColors}
            />
          )}
          {activeTab === 'items' && (
            <CompositionItemsTab
              items={items}
              onAddItem={handleAddItem}
              onRemoveItem={removeItem}
              onUpdateQuantity={updateItemQuantity}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              results={results}
              searching={searching}
              searchError={searchError}
              themeColors={themeColors}
            />
          )}
          {activeTab === 'variations' && (
            <CompositionConstructionTab name="Variações" themeColors={themeColors} />
          )}
          {activeTab === 'images' && (
            <CompositionConstructionTab name="Fotos" themeColors={themeColors} />
          )}
        </View>

        {/* Rodapé com Ações */}
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
            backgroundColor: themeColors.bg,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: themeColors.surface,
            }}
            disabled={isSaving}
          >
            <Text style={{ color: themeColors.textMuted, fontWeight: 'bold' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: themeColors.primary,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Check size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
