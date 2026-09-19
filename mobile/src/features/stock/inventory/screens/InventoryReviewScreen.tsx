import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle2, ArrowLeft, ArrowRight, Save } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Props {
    isDarkMode: boolean;
    items: AuditItem[];
    startDate: string;
    onCancel: () => void;
    onConfirm: (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => void;
}

export const InventoryReviewScreen: React.FC<Props> = ({
    isDarkMode,
    items,
    startDate,
    onCancel,
    onConfirm
}) => {
    const bg = isDarkMode ? '#0f172a' : '#f8fafc';
    const surface = isDarkMode ? '#1e293b' : '#ffffff';
    const border = isDarkMode ? '#334155' : '#e2e8f0';
    const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';

    const countedItems = items.filter(i => i.physicalCount !== null);
    
    // Simplificação da reconciliação para a UI: No ERP a lógica é mais avançada consultando moves.
    // Aqui vamos usar o systemStock que foi capturado no início do Snapshot.
    const reconciledItems = items
        .filter(i => i.physicalCount !== null)
        .map(i => {
            const expected = i.systemStock;
            return {
                ...i,
                reconciledExpected: expected,
                difference: i.physicalCount! - expected
            };
        });

    const itemsWithDifferences = reconciledItems.filter(i => i.difference !== 0);
    const adjustmentsCount = itemsWithDifferences.length;

    const handleConfirm = () => {
        if (countedItems.length === 0) return;
        onConfirm(reconciledItems);
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
                <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
                    <ArrowLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>Revisão Final</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
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
                            <Text style={{ color: muted, fontWeight: '700' }}>Itens Ignorados</Text>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>{items.length - countedItems.length}</Text>
                        </View>
                    </View>
                </View>

                {itemsWithDifferences.length > 0 && (
                    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Ajustes que serão lançados:</Text>
                        {itemsWithDifferences.map(item => (
                            <View key={item.id} style={[styles.diffItem, { borderBottomColor: border }]}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={{ color: textPrimary, fontWeight: '700', marginBottom: 4 }}>{item.name}</Text>
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
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
                {countedItems.length === 0 && (
                    <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
                        Você precisa contar pelo menos 1 item para finalizar o inventário.
                    </Text>
                )}
                <TouchableOpacity 
                    style={[styles.confirmBtn, countedItems.length === 0 && { backgroundColor: muted }]} 
                    onPress={handleConfirm}
                    disabled={countedItems.length === 0}
                >
                    <Text style={styles.confirmBtnText}>Confirmar e Atualizar Estoque</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50, borderBottomWidth: 1 },
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
});
