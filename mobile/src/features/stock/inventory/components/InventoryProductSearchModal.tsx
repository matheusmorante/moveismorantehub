import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal } from 'react-native';
import { X, Search } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';

export interface SearchableProduct {
    id: string;
    name: string;
    description?: string;
    stock: number;
    unit?: string;
    main_supplier_id?: string;
}

interface Props {
    isDarkMode: boolean;
    visible: boolean;
    onClose: () => void;
    onSelect: (product: SearchableProduct) => void;
}

export const InventoryProductSearchModal: React.FC<Props> = ({ isDarkMode, visible, onClose, onSelect }) => {
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<SearchableProduct[]>([]);
    const [loading, setLoading] = useState(true);

    const bg = isDarkMode ? '#0f172a' : '#f8fafc';
    const surface = isDarkMode ? '#1e293b' : '#ffffff';
    const border = isDarkMode ? '#334155' : '#e2e8f0';
    const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        supabase
            .from('products')
            .select('id, name, description, stock, unit, main_supplier_id')
            .eq('deleted', false)
            .eq('active', true)
            .order('name')
            .then(({ data }) => {
                if (data) setProducts(data as SearchableProduct[]);
                setLoading(false);
            });
    }, [visible]);

    const filtered = search.length < 2
        ? products.slice(0, 30)
        : products.filter(p =>
            (p.name || p.description || '').toLowerCase().includes(search.toLowerCase())
          ).slice(0, 30);

    const handleSelect = (product: SearchableProduct) => {
        onSelect(product);
        setSearch('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: '#7c3aed', paddingTop: 50 }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Buscar Produto</Text>
                        <Text style={styles.headerSubtitle}>Selecione para adicionar à contagem</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Search bar */}
                <View style={[styles.searchBar, { backgroundColor: surface, borderBottomColor: border }]}>
                    <View style={[styles.searchBox, { backgroundColor: bg, borderColor: border }]}>
                        <Search size={18} color={muted} />
                        <TextInput
                            style={[styles.searchInput, { color: textPrimary }]}
                            autoFocus
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Nome, código..."
                            placeholderTextColor={muted}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <X size={16} color={muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Results */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.centered}>
                                <Text style={{ color: muted, textAlign: 'center' }}>
                                    {search.length > 0 ? 'Nenhum produto encontrado' : 'Digite para buscar produtos'}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.productItem, { backgroundColor: surface, borderColor: border }]}
                                onPress={() => handleSelect(item)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                                        {item.name || item.description || 'Produto'}
                                    </Text>
                                    <Text style={[styles.productStock, { color: muted }]}>
                                        Estoque: {item.stock ?? 0} {item.unit || 'UN'}
                                    </Text>
                                </View>
                                <View style={styles.addBtn}>
                                    <Text style={styles.addBtnText}>+ Add</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    closeBtn: { padding: 4 },
    searchBar: { padding: 16, borderBottomWidth: 1 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15 },
    listContent: { padding: 16, gap: 10 },
    centered: { flex: 1, padding: 48, alignItems: 'center', justifyContent: 'center' },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    productName: { fontSize: 15, fontWeight: '700' },
    productStock: { fontSize: 12, marginTop: 2 },
    addBtn: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
