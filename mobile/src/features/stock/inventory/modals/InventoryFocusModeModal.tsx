import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { InventoryFocusItemCard } from '../components/InventoryFocusItemCard';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  items: AuditItem[];
  initialItemIndex: number;
  totalItemsCount: number;
  countedItemsCount: number;
  isDarkMode: boolean;
  onClose: () => void;
  onUpdateCount: (id: string, count: number | null) => void;
}

export const InventoryFocusModeModal: React.FC<Props> = ({
  visible,
  items,
  initialItemIndex,
  totalItemsCount,
  countedItemsCount,
  isDarkMode,
  onClose,
  onUpdateCount,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialItemIndex);
  const insets = useSafeAreaInsets();

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  // Ao abrir, deve scrollar para o item inicial
  useEffect(() => {
    if (visible && flatListRef.current && initialItemIndex >= 0 && initialItemIndex < items.length) {
      setCurrentIndex(initialItemIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialItemIndex, animated: false });
      }, 100);
    }
  }, [visible, initialItemIndex, items.length]);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < items.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (!visible || items.length === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border, backgroundColor: surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.progressTitle, { color: textPrimary }]}>Modo Foco</Text>
            <Text style={[styles.progressSubtitle, { color: muted }]}>
              Contados: <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedItemsCount}</Text> de {totalItemsCount}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={28} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Swipable List */}
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <InventoryFocusItemCard
              item={item}
              width={width}
              isDarkMode={isDarkMode}
              textPrimary={textPrimary}
              muted={muted}
              border={border}
              bg={bg}
              onUpdateCount={onUpdateCount}
            />
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
          initialScrollIndex={initialItemIndex >= 0 && initialItemIndex < items.length ? initialItemIndex : 0}
        />

        {/* Footer */}
        <View style={styles.footer}>
          {items.length > 1 && (
            <View style={styles.navigationHintRow}>
              <ChevronLeft size={20} color={muted} opacity={currentIndex > 0 ? 1 : 0} />
              <Text style={[styles.navigationHintText, { color: muted }]}>Deslize</Text>
              <ChevronRight size={20} color={muted} opacity={currentIndex < items.length - 1 ? 1 : 0} />
            </View>
          )}
          <Text style={[styles.footerCounter, { color: muted }]}>
            Item {currentIndex + 1} de {items.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  progressTitle: { fontSize: 24, fontWeight: '900' },
  progressSubtitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(100,116,139,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  navigationHintText: {
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerCounter: {
    fontWeight: '600',
    fontSize: 14,
  },
});
