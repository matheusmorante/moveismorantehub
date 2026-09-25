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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={14} color="#f59e0b" />
                                <Text style={{ color: diff > 0 ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 14 }}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={14} color="#10b981" />
                                <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>Ok</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text style={{ color: muted, fontSize: 12 }}>Não contado</Text>
                )}
            </View>
        );
    };

    return (
        <Modal visible={true} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <ArrowLeft size={24} color={textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: textPrimary }]}>
                            {session.name || `Inventário #${session.inventoryCode}`}
                        </Text>
                        <Text style={[styles.subtitle, { color: muted }]}>
                            {new Date(session.created_at).toLocaleDateString('pt-BR')} • {items.length} itens totais
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        {/* Summary Badges */}
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
                                <Text style={[styles.summaryVal, { color: '#10b981' }]}>{countedItems.length}</Text>
                                <Text style={[styles.summaryLbl, { color: muted }]}>Contados</Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
                                <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>{adjustments.length}</Text>
                                <Text style={[styles.summaryLbl, { color: muted }]}>Divergências</Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
                                <Text style={[styles.summaryVal, { color: textPrimary }]}>{items.length - countedItems.length}</Text>
                                <Text style={[styles.summaryLbl, { color: muted }]}>Pendentes</Text>
                            </View>
                        </View>

                        {/* List */}
                        <FlatList
                            data={items}
                            keyExtractor={(item, index) => item.id || String(index)}
                            renderItem={renderItem}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    <Text style={{ color: muted }}>Nenhum item registrado nesta sessão.</Text>
                                </View>
                            }
                        />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 54,
        paddingBottom: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    summaryRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    summaryVal: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    summaryLbl: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    itemCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        alignItems: 'center',
    },
});
