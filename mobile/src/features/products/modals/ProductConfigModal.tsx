import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, Layers, Sliders, ChevronRight } from 'lucide-react-native';
import { CategoriesManagerModal } from './CategoriesManagerModal';
import { AttributesManagerModal } from './AttributesManagerModal';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

export const ProductConfigModal: React.FC<Props> = ({
  visible,
  dark,
  onClose,
  onCategoriesUpdated,
}) => {
  const [showCategories, setShowCategories] = useState(false);
  const [showAttributes, setShowAttributes] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.content, dark && styles.darkContent]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, dark && styles.light]}>Configurações de Produto</Text>
              <Text style={styles.subtitle}>Gerencie categorias, atributos e variações</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, dark && styles.darkBtn]}>
              <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={[styles.cardOption, dark && styles.darkCard]}
              onPress={() => setShowCategories(true)}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
                <Layers size={22} color="#2563eb" />
              </View>
              <View style={styles.cardTexts}>
                <Text style={[styles.cardTitle, dark && styles.light]}>Categorias</Text>
                <Text style={styles.cardDesc}>Adicionar, editar e organizar categorias do catálogo</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardOption, dark && styles.darkCard]}
              onPress={() => setShowAttributes(true)}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#f5f3ff' }]}>
                <Sliders size={22} color="#7c3aed" />
              </View>
              <View style={styles.cardTexts}>
                <Text style={[styles.cardTitle, dark && styles.light]}>Atributos e Variações</Text>
                <Text style={styles.cardDesc}>Criar atributos globais (Cor, Tamanho, etc.) e opções</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CategoriesManagerModal
        visible={showCategories}
        dark={dark}
        onClose={() => {
          setShowCategories(false);
          onCategoriesUpdated?.();
        }}
      />

      <AttributesManagerModal
        visible={showAttributes}
        dark={dark}
        onClose={() => setShowAttributes(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  darkContent: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  light: {
    color: '#f8fafc',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtn: {
    backgroundColor: '#1e293b',
  },
  optionsList: {
    gap: 12,
    marginTop: 6,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
