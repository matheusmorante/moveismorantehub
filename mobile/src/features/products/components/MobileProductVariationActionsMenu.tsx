import { ArrowLeftRight, Edit3, GitMerge, QrCode, X } from 'lucide-react-native';
import type React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  dark: boolean;
  variationName: string;
  isMerged?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onPrintLabel?: () => void;
  onMoveToAnotherFamily?: () => void;
  onMergeWithAnotherVariation?: () => void;
  hasSupplier?: boolean;
  hasValidAttributes?: boolean;
}

export const MobileProductVariationActionsMenu: React.FC<Props> = ({
  visible,
  dark,
  variationName,
  isMerged = false,
  onClose,
  onEdit,
  onPrintLabel,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
  hasSupplier = true,
  hasValidAttributes = true,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.menu, dark && styles.menuDark]}>
            <View style={styles.menuHeader}>
              <Text style={[styles.title, dark && styles.textDark]} numberOfLines={1}>
                {variationName}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar ações da variação"
              >
                <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>
            {isMerged ? (
              <Text style={[styles.mergedNotice, dark && styles.mergedNoticeDark]}>
                Esta variação foi mesclada e é mantida apenas para histórico. Nenhuma ação está
                disponível.
              </Text>
            ) : null}
            {onPrintLabel ? (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onPrintLabel();
                }}
              >
                <QrCode size={16} color="#2563eb" />
                <Text style={[styles.itemText, dark && styles.textDark]}>
                  Imprimir Etiqueta de Identificação
                </Text>
              </TouchableOpacity>
            ) : null}
            {onEdit ? (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onEdit();
                }}
              >
                <Edit3 size={16} color="#2563eb" />
                <Text style={[styles.itemText, dark && styles.textDark]}>Editar Produto</Text>
              </TouchableOpacity>
            ) : null}
            {onMoveToAnotherFamily && !isMerged ? (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  if (!hasSupplier) {
                    Alert.alert(
                      'Fornecedor obrigatório',
                      'Selecione um fornecedor no produto antes de mover ou mesclar suas variações.'
                    );
                    return;
                  }
                  if (!hasValidAttributes) {
                    Alert.alert(
                      'Atributo obrigatório',
                      'Defina ao menos um atributo e valor para mover esta variação.'
                    );
                    return;
                  }
                  onMoveToAnotherFamily();
                }}
              >
                <ArrowLeftRight size={16} color="#4f46e5" />
                <Text style={[styles.itemText, styles.moveText]}>Mover para Outro Pai</Text>
              </TouchableOpacity>
            ) : null}
            {onMergeWithAnotherVariation && !isMerged ? (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  if (!hasSupplier) {
                    Alert.alert(
                      'Fornecedor obrigatório',
                      'Selecione um fornecedor no produto antes de mover ou mesclar suas variações.'
                    );
                    return;
                  }
                  onMergeWithAnotherVariation();
                }}
              >
                <GitMerge size={16} color="#7c3aed" />
                <Text style={[styles.itemText, styles.mergeText]}>Mesclar Variação</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  menu: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    padding: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 10,
  },
  menuDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, marginRight: 8, color: '#0f172a', fontSize: 13, fontWeight: '900' },
  item: {
    minHeight: 44,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  moveText: { color: '#4f46e5' },
  mergeText: { color: '#7c3aed' },
  mergedNotice: {
    margin: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  mergedNoticeDark: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
  },
  textDark: { color: '#f8fafc' },
});
