import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ArrowLeft, AlertTriangle } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { supabase } from '../../../../services/supabaseClient';

interface Props {
    isDarkMode: boolean;
    items: AuditItem[];
    startDate: string;
    hasStages?: boolean;
    onCancel: () => void;
    onConfirm: (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => void;
}

export const InventoryReviewScreen: React.FC<Props> = ({
    isDarkMode,
    items,
    startDate,
    hasStages,
    onCancel,
    onConfirm
}) => {
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
    const bottomInset = Math.max(insets.bottom, 16);
    const [reconciledItems, setReconciledItems] = useState<Array<AuditItem & { reconciledExpected: number; difference: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [reconcileError, setReconcileError] = useState(false);

    useEffect(() => {
        let active = true;
        const reconcile = async () => {
            setLoading(true);
            setReconcileError(false);
            try {
                const { data, error } = await supabase
                    .from('inventory_moves')
                    .select('product_id, variation_id, type, quantity, observation')
                    .gte('date', startDate);
                if (error) throw error;

                const result = items.map(item => {
                    const relevantMoves = (data || []).filter(move =>
                        String(move.product_id) === String(item.productId) &&
                        (item.variationId
                            ? String(move.variation_id) === String(item.variationId)
                            : !move.variation_id)
                    ).filter(move => {
                        let observation: any = move.observation;
                        if (typeof observation === 'string') {
                            try { observation = JSON.parse(observation); } catch { observation = {}; }
                        }
                        if (observation?.status === 'reversed' || observation?.status === 'cancelled') return false;
                        return !observation?.inventoryAudit && move.type !== 'adjustment';
                    });

                    const delta = relevantMoves.reduce((sum, move) => {
                        const quantity = Number(move.quantity || 0);
                        if (move.type === 'entry') return sum + quantity;
                        if (move.type === 'exit') return sum - quantity;
                        return sum;
                    }, 0);
                    const reconciledExpected = Number(item.systemStock || 0) + delta;
                    return {
                        ...item,
                        reconciledExpected,
                        difference: item.physicalCount === null ? 0 : item.physicalCount - reconciledExpected,
                    };
                });
                if (active) setReconciledItems(result);
            } catch (error) {
                console.error('Falha ao reconciliar movimentos do inventário:', error);
                if (active) setReconcileError(true);
            } finally {
                if (active) setLoading(false);
            }
        };
        void reconcile();
        return () => { active = false; };
    }, [items, startDate]);

    const bg = isDarkMode ? '#0f172a' : '#f8fafc';
    const surface = isDarkMode ? '#1e293b' : '#ffffff';
    const border = isDarkMode ? '#334155' : '#e2e8f0';
    const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';

    const countedItems = items.filter(i => i.physicalCount !== null);
    const uncountedCount = items.length - countedItems.length;
    
    const itemsWithDifferences = reconciledItems.filter(i => i.physicalCount !== null && i.difference !== 0);
    const adjustmentsCount = itemsWithDifferences.length;
    const isBlocked = countedItems.length === 0 || loading || reconcileError || (hasStages && uncountedCount > 0);

    const handleConfirm = () => {
        console.log('UI LOG: handleConfirm called! countedItems:', countedItems.length);
        if (isBlocked) return;
        onConfirm(reconciledItems.filter(item => item.physicalCount !== null && item.difference !== 0));
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: topInset + 8 }]}>
                <TouchableOpacity testID="review-back-btn" onPress={onCancel} style={styles.backBtn}>
                    <ArrowLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Revisão Final</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={{ color: muted }}>Reconciliando movimentações desde o início da contagem...</Text>
              </View>
            ) : reconcileError ? (
              <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
                <Text style={{ color: '#ef4444', textAlign: 'center', fontWeight: '700' }}>Não foi possível reconciliar o estoque. Volte à contagem e tente revisar novamente.</Text>
              </View>
            ) : <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
                <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <CheckCircle2 size={32} color="#10b981" />
                        </View>
                        <Text style={[styles.title, { color: textPrimary }]}>Pronto para finalizar!</Text>
                        <Text style={[styles.subtitle, { color: muted, textAlign: 'center' }]}>
                            Você contou {countedItems.length} de {items.length} itens do escopo.
                        </Text>
                    </View>

                    <View style={[styles.summaryBox, { backgroundColor: bg, borderColor: border }]}>
                        <View style={styles.summaryRow}>
                            <Text style={{ color: muted, fontWeight: '700' }}>Divergências Encontradas</Text>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>{adjustmentsCount}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={{ color: muted, fontWeight: '700' }}>Itens não contados</Text>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>{items.length - countedItems.length}</Text>
                        </View>
                    </View>
                </View>

                {items.length - countedItems.length > 0 && (
                    <View style={[styles.warningCard, { backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb', borderColor: '#f59e0b' }]}>
                        <AlertTriangle size={20} color="#d97706" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.warningTitle, { color: isDarkMode ? '#fbbf24' : '#92400e' }]}>Itens não contados ({items.length - countedItems.length})</Text>
                            <Text style={[styles.warningDesc, { color: isDarkMode ? '#fde68a' : '#b45309' }]}>
                                As variações que não receberam contagem permanecerão com o saldo intacto no sistema.
                            </Text>
                        </View>
                    </View>
                )}

                {itemsWithDifferences.length === 0 ? (
                    <View style={[styles.card, { backgroundColor: surface, borderColor: border, alignItems: 'center', padding: 24 }]}>
                        <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
                        <Text style={[styles.title, { color: textPrimary, fontSize: 16 }]}>Nenhuma divergência encontrada!</Text>
                        <Text style={[styles.subtitle, { color: muted, textAlign: 'center', marginTop: 4 }]}>
                            Todos os itens contados batem exatamente com o estoque reconciliado.
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Ajustes que serão lançados ({itemsWithDifferences.length}):</Text>
                        {itemsWithDifferences.map(item => (
                            <View key={item.id} style={[styles.diffItem, { borderBottomColor: border }]}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={{ color: textPrimary, fontWeight: '700', marginBottom: 2 }}>{item.name}</Text>
                                    {!!item.supplierNames && item.supplierNames !== 'Fábrica não informada' && (
                                        <Text numberOfLines={1} style={{ color: muted, fontSize: 11, marginBottom: 4 }}>{item.supplierNames}</Text>
                                    )}
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <Text style={{ color: muted, fontSize: 12 }}>Esperado: <Text style={{ fontWeight: '700', color: textPrimary }}>{item.reconciledExpected}</Text></Text>
                                        <Text style={{ color: muted, fontSize: 12 }}>Contado: <Text style={{ fontWeight: '700', color: textPrimary }}>{item.physicalCount}</Text></Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: item.difference > 0 ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: 16 }}>
                                        {item.difference > 0 ? '+' : ''}{item.difference}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>}

            <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, paddingBottom: bottomInset + 12 }]}>
                {isBlocked && (
                    <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
                        {countedItems.length === 0
                            ? 'Você precisa contar pelo menos 1 item para finalizar o inventário.'
                            : hasStages && uncountedCount > 0
                                ? 'Finalize todas as etapas para concluir o inventário.'
                                : 'A revisão precisa concluir a reconciliação antes de finalizar.'}
                    </Text>
                )}
                <TouchableOpacity 
                    testID="confirm-review-btn"
                    style={[styles.confirmBtn, isBlocked && { backgroundColor: muted }]}
                    onPress={handleConfirm}
                    disabled={isBlocked}
                >
                    <Text style={styles.confirmBtnText}>Confirmar e Atualizar Estoque</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    card: { padding: 20, borderRadius: 16, borderWidth: 1 },
    title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    subtitle: { fontSize: 14, lineHeight: 20 },
    summaryBox: { padding: 16, borderRadius: 12, gap: 12, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
    diffItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
    footer: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
    confirmBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    confirmBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
    },
    warningTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    warningDesc: { fontSize: 12, lineHeight: 18 },
});
