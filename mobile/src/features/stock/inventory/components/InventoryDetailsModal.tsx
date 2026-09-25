import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { InventorySession } from '../../types/stock.types';
import { fetchInventorySessionDetails } from '../../../../services/stockService';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface Props {
    session: InventorySession;
    isDarkMode: boolean;
    onClose: () => void;
}

export const InventoryDetailsModal: React.FC<Props> = ({ session, isDarkMode, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchInventorySessionDetails(session.id);
                setDetails(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [session.id]);

    const items = details?.items || [];
    const countedItems = items.filter((i: any) => i.physicalCount !== null && i.physicalCount !== undefined);
    const adjustments = countedItems.filter((i: any) => i.physicalCount !== i.systemStock);

    const bg = isDarkMode ? '#0f172a' : '#f8fafc';
    const surface = isDarkMode ? '#1e293b' : '#ffffff';
    const border = isDarkMode ? '#334155' : '#e2e8f0';
    const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';

    const renderItem = ({ item }: { item: any }) => {
        const expected = item.systemStock || 0;
        const counted = item.physicalCount;
        const hasDiff = counted !== null && counted !== undefined && counted !== expected;
        const diff = counted !== null && counted !== undefined ? counted - expected : 0;

        return (
            <View style={[styles.itemCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: textPrimary, fontWeight: '700', marginBottom: 2 }}>{item.name}</Text>
                    {!!item.assignedSupplier && item.assignedSupplier !== 'Sem fornecedor' && (
                        <Text style={{ color: muted, fontSize: 11, marginBottom: 4 }}>{item.assignedSupplier}</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Text style={{ color: muted, fontSize: 12 }}>Esperado: <Text style={{ fontWeight: '700', color: textPrimary }}>{expected}</Text></Text>
                        <Text style={{ color: muted, fontSize: 12 }}>Contado: <Text style={{ fontWeight: '700', color: textPrimary }}>{counted !== null && counted !== undefined ? counted : '-'}</Text></Text>
                    </View>
                </View>
                {counted !== null && counted !== undefined ? (
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        {hasDiff ? (
                            <View style={[styles.diffBadge, { backgroundColor: diff > 0 ? '#d1fae5' : '#fee2e2' }]}>
                                <AlertCircle size={14} color={diff > 0 ? '#059669' : '#dc2626'} />
                                <Text style={{ color: diff > 0 ? '#059669' : '#dc2626', fontWeight: '800', marginLeft: 4 }}>
                                    {diff > 0 ? '+' : ''}{diff}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.diffBadge, { backgroundColor: isDarkMode ? '#064e3b' : '#d1fae5' }]}>
                                <CheckCircle2 size={14} color="#059669" />
                                <Text style={{ color: '#059669', fontWeight: '800', marginLeft: 4 }}>OK</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <View style={[styles.diffBadge, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                            <Text style={{ color: muted, fontWeight: '700', fontSize: 11 }}>Não contado</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: bg }]}>
                <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                        <ArrowLeft size={24} color={textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: textPrimary }]}>Detalhes do Inventário</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item: any, index: number) => item.id || `${item.productId}-${item.variationId || index}`}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        ListHeaderComponent={
                            <View style={[styles.summaryBox, { backgroundColor: surface, borderColor: border }]}>
                                <View style={styles.summaryRow}>
                                    <Text style={{ color: muted, fontWeight: '700' }}>Itens no Escopo</Text>
                                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>{items.length}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={{ color: muted, fontWeight: '700' }}>Itens Contados</Text>
                                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>{countedItems.length}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={{ color: muted, fontWeight: '700' }}>Divergências</Text>
                                    <Text style={{ color: adjustments.length > 0 ? '#ef4444' : textPrimary, fontWeight: '800', fontSize: 16 }}>{adjustments.length}</Text>
                                </View>
                            </View>
                        }
                        ListEmptyComponent={
                            <Text style={{ color: muted, textAlign: 'center', marginTop: 40 }}>Nenhum detalhe encontrado para este inventário.</Text>
                        }
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryBox: { padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, marginBottom: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    diffBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
