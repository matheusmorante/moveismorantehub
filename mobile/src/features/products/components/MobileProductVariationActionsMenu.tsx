import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Clock3, Edit3, QrCode, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  dark: boolean;
  variationName: string;
  onClose: () => void;
  onEdit: () => void;
  onHistory?: () => void;
  onStock?: () => void;
  onPrintLabel?: () => void;
}

export const MobileProductVariationActionsMenu: React.FC<Props> = ({
  visible,
  dark,
  variationName,
  onClose,
  onEdit,
  onHistory,
  onStock,
  onPrintLabel,
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
              <TouchableOpacity onPress={onClose}>
                <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>
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
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit3 size={16} color="#2563eb" />
              <Text style={[styles.itemText, dark && styles.textDark]}>Editar Variação</Text>
            </TouchableOpacity>
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
  textDark: { color: '#f8fafc' },
  stockIcon: { width: 16, color: '#059669', fontSize: 18, fontWeight: '900', textAlign: 'center' },
});
