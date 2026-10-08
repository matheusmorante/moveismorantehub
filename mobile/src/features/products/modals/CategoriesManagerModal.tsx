import { X } from 'lucide-react-native';
import type React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeCategoriesScreen } from '../categories/screens/NativeCategoriesScreen';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

export const CategoriesManagerModal: React.FC<Props> = ({
  visible,
  dark,
  onClose,
  onCategoriesUpdated,
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={[styles.safeArea, dark && styles.safeAreaDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, dark && styles.textLight]}>Ambientes e Categorias</Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, dark && styles.closeButtonDark]}
          accessibilityRole="button"
          accessibilityLabel="Fechar gestão de ambientes e categorias"
        >
          <X size={20} color={dark ? '#cbd5e1' : '#64748b'} />
        </TouchableOpacity>
      </View>
      <NativeCategoriesScreen dark={dark} onCategoriesUpdated={onCategoriesUpdated} />
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeAreaDark: {
    backgroundColor: '#020617',
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  textLight: {
    color: '#f8fafc',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  closeButtonDark: {
    backgroundColor: '#1e293b',
  },
});
