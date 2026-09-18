import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../services/supabaseClient';

interface Product {
    id: string;
    code: string;
    description: string;
    price: number;
    stock: number;
}

interface MobileCompositionSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (product: any, variation?: any) => void;
    isDarkMode?: boolean;
}

export const MobileCompositionSearchModal: React.FC<MobileCompositionSearchModalProps> = ({
    visible,
    onClose,
    onSelect,
    isDarkMode
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            searchProducts('');
        }
    }, [visible]);

    const searchProducts = async (query: string) => {
        setLoading(true);
        try {
            let q = supabase
                .from('products')
                .select('id, code, description, price, stock, active, deleted')
                .eq('deleted', false)
                .eq('active', true)
                .order('description', { ascending: true })
                .limit(20);

            if (query) {
                q = q.ilike('description', `%${query}%`);
            }

            const { data, error } = await q;
            if (!error && data) {
                setProducts(data);
            }
        } catch (error) {
            console.error('Erro na busca de produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // Simple debounce
        setTimeout(() => searchProducts(text), 500);
    };

    const themeColors = {
        bg: isDarkMode ? '#0f172a' : '#ffffff',
        surface: isDarkMode ? '#1e293b' : '#f8fafc',
        border: isDarkMode ? '#334155' : '#e2e8f0',
        text: isDarkMode ? '#f1f5f9' : '#1e293b',
        textMuted: isDarkMode ? '#94a3b8' : '#64748b',
        primary: '#3b82f6'
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>Adicionar Item</Text>
                    <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: themeColors.surface, borderRadius: 20 }}>
                        <Ionicons name="close" size={20} color={themeColors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surface, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: themeColors.border }}>
                        <Ionicons name="search" size={20} color={themeColors.textMuted} />
                        <TextInput
                            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: themeColors.text }}
                            placeholder="Buscar por nome..."
                            placeholderTextColor={themeColors.textMuted}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                </View>

                {/* List */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    // For now, no variations logic in mobile
                                    onSelect({
                                        ...item,
                                        sellPrice: item.price
                                    });
                                    onClose();
                                }}
                                style={{
                                    backgroundColor: themeColors.surface,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: themeColors.border
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text, marginBottom: 4 }}>{item.description}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 12, color: themeColors.textMuted }}>SKU: {item.code}</Text>
                                    <Text style={{ fontSize: 12, color: themeColors.primary, fontWeight: 'bold' }}>Estoque: {item.stock || 0}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="cube-outline" size={48} color={themeColors.textMuted} />
                                <Text style={{ color: themeColors.textMuted, marginTop: 16 }}>Nenhum produto encontrado</Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
};
