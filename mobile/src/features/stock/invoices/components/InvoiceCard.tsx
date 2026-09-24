import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { Invoice } from '../../types/stock.types';

interface Props {
    item: Invoice;
    isDarkMode: boolean;
    onMenuPress: (item: Invoice) => void;
    onPress: (item: Invoice) => void;
}

export const InvoiceCard: React.FC<Props> = ({ item, isDarkMode, onMenuPress, onPress }) => {
    const isReceived = item.status === 'received';
    const hasCompleteBindings = item.itemsCount > 0 && !item.hasPendingBindings;
    const statusLabel = isReceived ? 'RECEBIDA' : 'DISPONÍVEL';
    const statusColor = isReceived ? (isDarkMode ? '#064e3b' : '#d1fae5') : (isDarkMode ? '#1e3a8a' : '#dbeafe');
    const statusTextColor = isReceived ? (isDarkMode ? '#6ee7b7' : '#047857') : (isDarkMode ? '#93c5fd' : '#1d4ed8');
    const formattedDate = item.issueDate && !Number.isNaN(new Date(item.issueDate).getTime())
        ? new Date(item.issueDate).toLocaleDateString('pt-BR')
        : 'Data não informada';

    return (
        <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} activeOpacity={0.9} onPress={() => onPress(item)}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.invoiceNumber, isDarkMode && styles.textDark]}>
                        NF-e #{item.number}
                    </Text>
                    <Text style={[styles.invoiceSeries, isDarkMode && styles.textMutedDark]}>
                        série {item.series}
                    </Text>
                    
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                        <Text style={[styles.badgeText, { color: statusTextColor }]}>
                            {statusLabel}
                        </Text>
                    </View>

                    {!hasCompleteBindings && (
                        <View style={[styles.badge, { backgroundColor: isDarkMode ? '#451a03' : '#fef3c7' }]}>
                            <Text style={[styles.badgeText, { color: isDarkMode ? '#fcd34d' : '#b45309' }]}>
                                VINCULAÇÕES PENDENTES
                            </Text>
                        </View>
                    )}
                    {hasCompleteBindings && (
                        <View style={[styles.badge, { backgroundColor: isDarkMode ? '#064e3b' : '#d1fae5' }]}>
                            <Text style={[styles.badgeText, { color: isDarkMode ? '#6ee7b7' : '#047857' }]}>
                                VINCULAÇÃO COMPLETA
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity onPress={(event) => { event.stopPropagation(); onMenuPress(item); }} style={styles.menuBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <MoreVertical size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
            </View>

            <View style={styles.supplierContainer}>
                <Text style={[styles.supplierName, isDarkMode && styles.textDark]} numberOfLines={1}>
                    {item.supplierName}
                </Text>
                {item.supplierCnpj ? (
                    <Text style={[styles.cnpj, isDarkMode && styles.textMutedDark]}>
                        CNPJ: {item.supplierCnpj}
                    </Text>
                ) : null}
                <Text style={[styles.issueDate, isDarkMode && styles.textMutedDark]}>{formattedDate}</Text>
            </View>
            
            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

            <View style={styles.cardFooter}>
                <Text style={[styles.itemsText, isDarkMode && styles.textMutedDark]}>
                    {item.itemsCount} {item.itemsCount === 1 ? 'item' : 'itens'}
                </Text>
                <Text style={[styles.valueText, isDarkMode && { color: '#34d399' }]}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue)}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
    },
    cardDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        flex: 1,
        paddingRight: 8,
    },
    invoiceNumber: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    invoiceSeries: {
        fontSize: 13,
        color: '#64748b',
        marginRight: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    menuBtn: {
        padding: 4,
        marginRight: -4,
        marginTop: -4,
    },
    supplierContainer: {
        marginBottom: 16,
    },
    supplierName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    issueDate: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 4,
    },
    cnpj: {
        fontSize: 12,
        color: '#64748b',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 12,
    },
    dividerDark: {
        backgroundColor: '#334155',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemsText: {
        fontSize: 13,
        color: '#64748b',
    },
    valueText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#059669',
    },
    textDark: { color: '#f8fafc' },
    textMutedDark: { color: '#94a3b8' },
});
