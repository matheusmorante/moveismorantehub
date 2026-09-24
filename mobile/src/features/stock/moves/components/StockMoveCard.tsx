import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
    PackagePlus, PackageMinus, Scale, CheckCircle2,
    RotateCcw, Check, MessageSquare, Calendar, Tag,
} from 'lucide-react-native';
import { StockMove } from '../../types/stock.types';
import { isOrderLinked as checkIsOrderLinked } from '../domain/inventoryTimelineBalance';

export const StockMoveCard = ({ move, isDarkMode, canManage, onReverse, onEdit }: { move: StockMove; isDarkMode: boolean; canManage?: boolean; onReverse?: (move: StockMove) => void; onEdit?: (move: StockMove) => void }) => {
    const [expandedObservation, setExpandedObservation] = React.useState(false);
    const isEntry      = move.type === 'in'  || move.type === 'entry';
    const isExit       = move.type === 'out' || move.type === 'exit' || move.type === 'withdrawal';
    const isReversed   = move.status === 'reversed';
    const isEffective  = move.status === 'effective' || move.status === 'active';
    const isOrderLinked = checkIsOrderLinked(move as any);

    let TypeIcon   = Scale;
    let typeText   = 'AJUSTE';
    let typeColor  = isDarkMode ? '#fdb95b' : '#d97706';
    let typeBg     = isDarkMode ? 'rgba(253,185,91,0.15)' : '#fef3c7';
    let typeBorder = isDarkMode ? '#a16207' : '#fde68a';
    if (isEntry) {
        TypeIcon = PackagePlus; typeText = 'ENTRADA';
        typeColor = isDarkMode ? '#4ade80' : '#16a34a';
        typeBg = isDarkMode ? 'rgba(74,222,128,0.15)' : '#dcfce7';
        typeBorder = isDarkMode ? '#166534' : '#bbf7d0';
    } else if (isExit) {
        TypeIcon = PackageMinus; typeText = 'SAÍDA';
        typeColor = isDarkMode ? '#f87171' : '#dc2626';
        typeBg = isDarkMode ? 'rgba(248,113,113,0.15)' : '#fee2e2';
        typeBorder = isDarkMode ? '#991b1b' : '#fecaca';
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const dateObj = new Date(move.created_at);
    const dateStr = dateObj.toLocaleDateString('pt-BR');
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let reversedLabel = '';
    if (isReversed && move.reversedAt) {
        const r = new Date(move.reversedAt);
        reversedLabel = `Estornado em ${r.toLocaleDateString('pt-BR')} as ${r.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    let obsText = move.observation || '';
    if (obsText.startsWith('{') || obsText.startsWith('[')) {
        try {
            const p = JSON.parse(obsText);
            if (typeof (p.note || p.observation || p.reason) === 'string') obsText = p.note || p.observation || p.reason;
        } catch { /* noop */ }
    }
    const reasonText = move.reversalReason ||
        (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{') ? move.observation : '');
    const finalObs = isReversed && reasonText
        ? (obsText && obsText !== reasonText ? `Original: ${obsText} | Estorno: ${reasonText}` : reasonText)
        : obsText;
    const obsLabel = (isReversed && reasonText) ? 'MOTIVO/OBS:' : 'OBSERVACAO:';

    const qtyPrefix = isEntry ? '+' : isExit ? '-' : '';
    const displayedQuantity = isEntry || isExit ? Math.abs(Number(move.quantity || 0)) : Number(move.quantity || 0);
    const qtyColor  = isEntry ? (isDarkMode ? '#4ade80' : '#16a34a')
        : isExit ? (isDarkMode ? '#f87171' : '#dc2626') : (isDarkMode ? '#fdb95b' : '#d97706');
    const dividerColor  = isDarkMode ? '#263245' : '#f1f5f9';
    const footerBg      = isDarkMode ? 'rgba(15,23,42,0.4)' : '#f8fafc';

    return (
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeBorder }]}>
                        <View style={{ position: 'relative' }}>
                            <TypeIcon size={13} color={typeColor} />
                            <View style={[styles.microBadge, { backgroundColor: isReversed ? '#f43f5e' : '#047857', borderColor: isDarkMode ? '#1e293b' : '#fff' }]}>
                                {isReversed ? <RotateCcw size={5} color="#fff" strokeWidth={3} /> : <Check size={5} color="#fff" strokeWidth={3} />}
                            </View>
                        </View>
                        <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeText}</Text>
                    </View>
                    {isReversed ? (
                        <View style={[styles.statusBadge, { borderColor: '#d97706', backgroundColor: isDarkMode ? 'rgba(217,119,6,0.12)' : '#fffbeb' }]}>
                            <RotateCcw size={11} color="#d97706" />
                            <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>ESTORNADA</Text>
                        </View>
                    ) : isEffective ? (
                        <View style={[styles.statusBadge, { borderColor: isDarkMode ? '#4ade80' : '#16a34a', backgroundColor: isDarkMode ? 'rgba(74,222,128,0.12)' : '#dcfce7' }]}>
                            <CheckCircle2 size={11} color={isDarkMode ? '#4ade80' : '#16a34a'} />
                            <Text style={[styles.statusBadgeText, { color: isDarkMode ? '#4ade80' : '#16a34a' }]}>EFETIVADA</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={[styles.quantity, { color: qtyColor }]}>
                    {qtyPrefix}{displayedQuantity} <Text style={styles.qtyUnit}>un</Text>
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Corpo */}
            <View style={styles.body}>
                {!!move.productDescription && (
                    <View>
                        <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>PRODUTO</Text>
                        <Text style={[styles.productText, isDarkMode && styles.textDark]} numberOfLines={2}>
                            {move.productDescription}
                        </Text>
                    </View>
                )}
                {!!move.label && (
                    <View style={styles.bodyRow}>
                        <Tag size={11} color={isDarkMode ? '#64748b' : '#94a3b8'} style={{ marginTop: 1 }} />
                        <Text style={[styles.labelText, isDarkMode && styles.textMutedDark]} numberOfLines={2}>{move.label}</Text>
                    </View>
                )}
            </View>

            {/* Observacao */}
            {!!finalObs && (
                <View style={[styles.obsBox, { borderTopColor: dividerColor },
                    isDarkMode ? styles.obsBoxDark : {},
                    isReversed && reasonText ? (isDarkMode ? styles.obsBoxAmberDark : styles.obsBoxAmber) : {}
                ]}>
                    <MessageSquare size={11} color={isReversed && reasonText ? (isDarkMode ? '#fbbf24' : '#d97706') : (isDarkMode ? '#94a3b8' : '#64748b')} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.obsLabel, { color: isReversed && reasonText ? (isDarkMode ? '#fbbf24' : '#b45309') : (isDarkMode ? '#94a3b8' : '#64748b') }]}>{obsLabel}</Text>
                        <Text style={[styles.obsContent, { color: isReversed && reasonText ? (isDarkMode ? '#fde68a' : '#92400e') : (isDarkMode ? '#e2e8f0' : '#334155') }]}>{expandedObservation || finalObs.length <= 120 ? finalObs : `${finalObs.slice(0, 120)}…`}</Text>
                        {finalObs.length > 120 && <TouchableOpacity onPress={() => setExpandedObservation(current => !current)}><Text style={styles.expandText}>{expandedObservation ? 'Mostrar menos' : 'Ler mais'}</Text></TouchableOpacity>}
                    </View>
                </View>
            )}

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Rodape */}
            <View style={[styles.footer, { backgroundColor: footerBg }]}>
                <View style={styles.footerCell}>
                    <View style={styles.footerCellHeader}>
                        <Calendar size={11} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                        <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>DATA</Text>
                    </View>
                    <Text style={[styles.footerValue, isDarkMode && styles.textDark]}>{dateStr}</Text>
                    <Text style={[styles.footerSub, isDarkMode && styles.textMutedDark]}>{timeStr}</Text>
                </View>
                {move.unitCost != null && move.unitCost > 0 && (
                    <View style={[styles.footerCell, { borderLeftWidth: 1, borderLeftColor: dividerColor }]}>
                        <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>CUSTO UNIT.</Text>
                        <Text style={[styles.footerValue, isDarkMode && styles.textDark]}>{formatCurrency(move.unitCost)}</Text>
                    </View>
                )}
            </View>

            {!!reversedLabel && (
                <Text style={[styles.reversedText, { backgroundColor: footerBg }, isDarkMode && { color: '#fbbf24' }]}>{reversedLabel}</Text>
            )}
            {canManage && isEffective && !isOrderLinked && (onReverse || onEdit) && (
                <View style={styles.actionsRow}>
                {onEdit && <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(move)}><Text style={styles.actionButtonText}>Editar</Text></TouchableOpacity>}
                {onReverse && (
                <TouchableOpacity style={styles.reverseButton} onPress={() => onReverse(move)} accessibilityLabel="Estornar movimentação">
                    <RotateCcw size={14} color={isDarkMode ? '#fbbf24' : '#b45309'} />
                    <Text style={[styles.reverseButtonText, isDarkMode && { color: '#fbbf24' }]}>Estornar movimentação</Text>
                </TouchableOpacity>
                )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, gap: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 5 },
    typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 4 },
    statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    microBadge: { position: 'absolute', top: -4, right: -4, width: 9, height: 9, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    quantity: { fontSize: 18, fontWeight: '900' },
    qtyUnit: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
    divider: { height: 1 },
    body: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
    bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 2 },
    fieldLabelDark: { color: '#64748b' },
    productText: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
    labelText: { fontSize: 13, color: '#64748b', flex: 1, lineHeight: 18 },
    textDark: { color: '#f1f5f9' },
    textMutedDark: { color: '#94a3b8' },
    obsBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 7 },
    obsBoxDark: { backgroundColor: 'rgba(15,23,42,0.4)' },
    obsBoxAmber: { backgroundColor: '#fffbeb', borderTopColor: '#fde68a' },
    obsBoxAmberDark: { backgroundColor: 'rgba(120,53,15,0.2)', borderTopColor: 'rgba(146,64,14,0.4)' },
    obsLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2, letterSpacing: 0.5 },
    obsContent: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
    footer: { flexDirection: 'row' },
    footerCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
    footerCellHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    footerValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
    footerSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
    reversedText: { fontSize: 11, color: '#d97706', fontWeight: '600', paddingHorizontal: 14, paddingBottom: 10 },
    reverseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#fde68a', backgroundColor: '#fffbeb' },
    reverseButtonText: { fontSize: 11, fontWeight: '800', color: '#b45309' },
    actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
    actionButtonText: { fontSize: 11, fontWeight: '800', color: '#2563eb' }, expandText: { fontSize: 11, fontWeight: '800', color: '#2563eb', marginTop: 4 },
});
