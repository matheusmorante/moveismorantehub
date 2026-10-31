import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { InventoryFocusItemCard } from '../components/InventoryFocusItemCard';

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isNarrow = windowWidth < 360;
  const isShort = windowHeight < 700;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  );
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  // Ao abrir, posiciona o carrossel no item escolhido. Ao redimensionar,
  // mantém o item atual alinhado à largura nova da página.
  useEffect(() => {
    if (!visible || items.length === 0) return;
    setCurrentIndex(Math.min(Math.max(initialItemIndex, 0), items.length - 1));
  }, [visible, initialItemIndex, items.length]);

  useEffect(() => {
    if (!visible || items.length === 0 || windowWidth <= 0) return;
    const index = Math.min(Math.max(currentIndex, 0), items.length - 1);
    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: index * windowWidth, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, currentIndex, items.length, windowWidth]);

  const handleScroll = (e: any) => {
    if (windowWidth <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / windowWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < items.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (!visible || items.length === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: bg, paddingTop: topInset, paddingBottom: bottomInset },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={topInset}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: border,
              backgroundColor: surface,
              paddingHorizontal: isNarrow ? 16 : 24,
              paddingTop: isShort ? 8 : 16,
              paddingBottom: isShort ? 12 : 20,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.progressTitle, { color: textPrimary, fontSize: isNarrow ? 20 : 24 }]}
            >
              Modo Foco
            </Text>
            <Text style={[styles.progressSubtitle, { color: muted, fontSize: isNarrow ? 13 : 16 }]}>
              Contados:{' '}
              <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedItemsCount}</Text> de{' '}
              {totalItemsCount}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Fechar modo foco"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={24} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Swipable List */}
        <FlatList
          ref={flatListRef}
          style={styles.carouselList}
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <InventoryFocusItemCard
              item={item}
              width={windowWidth}
              height={windowHeight}
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
          getItemLayout={(data, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          initialScrollIndex={
            initialItemIndex >= 0 && initialItemIndex < items.length ? initialItemIndex : 0
          }
        />

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: isNarrow ? 12 : 24,
              paddingTop: isShort ? 8 : 12,
              paddingBottom: isShort ? 8 : 12,
            },
          ]}
        >
          {items.length > 1 && (
            <View style={styles.navigationHintRow}>
              <ChevronLeft size={20} color={muted} opacity={currentIndex > 0 ? 1 : 0} />
              <Text style={[styles.navigationHintText, { color: muted }]}>Deslize</Text>
              <ChevronRight
                size={20}
                color={muted}
                opacity={currentIndex < items.length - 1 ? 1 : 0}
              />
            </View>
          )}
          <Text style={[styles.footerCounter, { color: muted }]}>
            Item {currentIndex + 1} de {items.length}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  progressTitle: { fontSize: 24, fontWeight: '900' },
  progressSubtitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(100,116,139,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselList: { flex: 1 },
  footer: {
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
