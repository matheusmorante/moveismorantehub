import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions, TextInput, SafeAreaView } from 'react-native';
import { X, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

const { width, height } = Dimensions.get('window');

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

export const InventoryFocusMode: React.FC<Props> = ({
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

    const renderItem = ({ item, index }: { item: AuditItem, index: number }) => {
        const isCounted = item.physicalCount !== null;
        
        return (
            <View style={{ width, flex: 1, padding: 24, justifyContent: 'center' }}>
                <Text style={[styles.itemName, { color: textPrimary }]} numberOfLines={3} adjustsFontSizeToFit>
                    {item.name}
                </Text>
                <Text style={[styles.itemSupplier, { color: muted }]}>
                    {item.supplierNames || 'Sem fornecedor'}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: muted }]}>Sistema</Text>
                        <Text style={[styles.statValue, { color: textPrimary }]}>{item.systemStock}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: muted }]}>Unidade</Text>
                        <Text style={[styles.statValue, { color: textPrimary }]}>{item.unit || 'UN'}</Text>
                    </View>
                </View>

                <View style={styles.counterContainer}>
                    <TouchableOpacity 
                        style={[styles.bigBtn, { backgroundColor: '#10b981', borderColor: '#059669' }]}
                        onPress={() => onUpdateCount(item.id, (item.physicalCount || 0) + 1)}
                    >
                        <Plus size={48} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.bigInput, { color: textPrimary, borderColor: border, backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : bg }]}
                            keyboardType="numeric"
                            value={item.physicalCount === null ? '' : String(item.physicalCount)}
                            onChangeText={val => {
                                if (val === '') onUpdateCount(item.id, null);
                                else onUpdateCount(item.id, Math.max(0, parseInt(val, 10) || 0));
                            }}
                            placeholder="0"
                            placeholderTextColor={muted}
                        />
                        <Text style={[styles.inputLabel, { color: muted }]}>CONTADO</Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.bigBtn, { backgroundColor: '#ef4444', borderColor: '#dc2626' }]}
                        onPress={() => onUpdateCount(item.id, Math.max(0, (item.physicalCount || 0) - 1))}
                        disabled={item.physicalCount === 0}
                    >
                        <Minus size={48} color="#ffffff" opacity={item.physicalCount === 0 ? 0.3 : 1} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: border }]}>
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
                    keyExtractor={(i) => i.id}
                    renderItem={renderItem}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <ChevronLeft size={20} color={muted} opacity={currentIndex > 0 ? 1 : 0} />
                            <Text style={{ color: muted, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Deslize
                            </Text>
                            <ChevronRight size={20} color={muted} opacity={currentIndex < items.length - 1 ? 1 : 0} />
                        </View>
                    )}
                    <Text style={{ color: muted, fontWeight: '600', fontSize: 14 }}>
                        Item {currentIndex + 1} de {items.length}
                    </Text>
                </View>
            </SafeAreaView>
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
    itemName: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    itemSupplier: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 32,
        marginBottom: 32,
        justifyContent: 'center',
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    counterContainer: {
        alignItems: 'center',
        width: '100%',
        gap: 24,
    },
    bigBtn: {
        width: '100%',
        height: 100,
        borderRadius: 24,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    bigInput: {
        width: '100%',
        height: 100,
        borderRadius: 24,
        borderWidth: 2,
        fontSize: 48,
        fontWeight: '900',
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '900',
        marginTop: 8,
        letterSpacing: 2,
    },
    footer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
