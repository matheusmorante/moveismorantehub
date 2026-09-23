import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ArrowRight, PackageCheck, PackageOpen } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Stage {
    supplierName: string;
    total: number;
    counted: number;
    status: 'not_started' | 'in_progress' | 'completed';
}

interface Props {
    items: AuditItem[];
    isDarkMode: boolean;
    onSelectStage: (supplierName: string) => void;
}

export const InventoryStagesView: React.FC<Props> = ({ items, isDarkMode, onSelectStage }) => {
    const bg = isDarkMode ? '#0f172a' : '#f8fafc';
    const surface = isDarkMode ? '#1e293b' : '#ffffff';
    const border = isDarkMode ? '#334155' : '#e2e8f0';
    const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
    const muted = isDarkMode ? '#94a3b8' : '#64748b';

    const { stages, totalItems, totalCounted, progressPercent } = useMemo(() => {
        const stageMap = new Map<string, Stage>();
        
        for (const item of items) {
            const supplier = item.assignedSupplier || 'Sem fornecedor';
            if (!stageMap.has(supplier)) {
                stageMap.set(supplier, { supplierName: supplier, total: 0, counted: 0, status: 'not_started' });
            }
            const stage = stageMap.get(supplier)!;
            stage.total++;
            if (item.physicalCount !== null) {
                stage.counted++;
            }
        }
        
        let counted = 0;
        let total = items.length;
        
        const stagesArray = Array.from(stageMap.values()).map(stage => {
            counted += stage.counted;
            if (stage.counted === 0) stage.status = 'not_started';
            else if (stage.counted === stage.total) stage.status = 'completed';
            else stage.status = 'in_progress';
            return stage;
        });

        // Keep products without a supplier countable in their own stage.
        const filteredStagesArray = stagesArray;
        filteredStagesArray.sort((a, b) => {
            if (a.supplierName === 'Sem fornecedor') return 1;
            if (b.supplierName === 'Sem fornecedor') return -1;
            return a.supplierName.localeCompare(b.supplierName);
        });
        
        const progress = total > 0 ? Math.round((counted / total) * 100) : 0;
        
        return { stages: filteredStagesArray, totalItems: total, totalCounted: counted, progressPercent: progress };
    }, [items]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* General Progress Card */}
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: textPrimary }]}>Progresso Geral</Text>
                        <Text style={[styles.subtitle, { color: muted }]}>
                            <Text style={{ fontWeight: '800', color: textPrimary }}>{totalCounted}</Text> de {totalItems} itens contados
                        </Text>
                    </View>
                    <Text style={[styles.percent, { color: '#10b981' }]}>{progressPercent}%</Text>
                </View>
                <View style={[styles.barBg, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                    <View style={[styles.barFill, { width: `${progressPercent}%`, backgroundColor: '#10b981' }]} />
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Etapas por Fornecedor</Text>

            {/* Stages List */}
            <View style={styles.stagesList}>
                {stages.map(stage => {
                    const isCompleted = stage.status === 'completed';
                    const isInProgress = stage.status === 'in_progress';
                    const stageProgress = Math.round((stage.counted / stage.total) * 100);

                    return (
                        <TouchableOpacity
                            key={stage.supplierName}
                            style={[
                                styles.stageCard, 
                                { backgroundColor: surface, borderColor: isCompleted ? '#10b981' : isInProgress ? '#3b82f6' : border }
                            ]}
                            onPress={() => onSelectStage(stage.supplierName)}
                        >
                            <View style={styles.stageHeader}>
                                <View style={styles.stageInfo}>
                                    <View style={[
                                        styles.iconBox,
                                        { backgroundColor: isCompleted ? 'rgba(16,185,129,0.1)' : isInProgress ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.1)' }
                                    ]}>
                                        {isCompleted ? (
                                            <PackageCheck size={20} color="#10b981" />
                                        ) : (
                                            <PackageOpen size={20} color={isInProgress ? '#3b82f6' : muted} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.stageName, { color: textPrimary }]} numberOfLines={1}>
                                            {stage.supplierName}
                                        </Text>
                                        <Text style={[styles.stageDesc, { color: muted }]}>
                                            <Text style={{ fontWeight: '800', color: textPrimary }}>{stage.counted}</Text> / {stage.total} itens
                                            {stage.total - stage.counted > 0 ? `  •  ${stage.total - stage.counted} pendentes` : ''}
                                        </Text>
                                    </View>
                                </View>
                                <ArrowRight size={20} color={muted} />
                            </View>
                            
                            {/* Stage Progress */}
                            <View style={[styles.barBg, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', marginTop: 12, height: 6 }]}>
                                <View style={[styles.barFill, { width: `${stageProgress}%`, backgroundColor: isCompleted ? '#10b981' : '#3b82f6' }]} />
                            </View>

                            {/* Status Footer */}
                            <View style={styles.stageFooter}>
                                <Text style={[
                                    styles.statusBadge,
                                    { color: isCompleted ? '#10b981' : isInProgress ? '#f59e0b' : muted }
                                ]}>
                                    {isCompleted ? 'FINALIZADO' : isInProgress ? 'EM ANDAMENTO' : 'NÃO INICIADO'}
                                </Text>
                                <Text style={[styles.actionLabel, { color: isCompleted ? '#10b981' : '#3b82f6' }]}>
                                    {isCompleted ? 'Revisar →' : isInProgress ? 'Continuar →' : 'Iniciar →'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    card: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '800' },
    subtitle: { fontSize: 13, marginTop: 4 },
    percent: { fontSize: 24, fontWeight: '900' },
    barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },
    stagesList: { gap: 12 },
    stageCard: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 16,
    },
    stageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stageName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    stageDesc: { fontSize: 13 },
    stageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(100,116,139,0.15)',
    },
    statusBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    actionLabel: { fontSize: 13, fontWeight: '700' },
});
