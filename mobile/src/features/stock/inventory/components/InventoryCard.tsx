import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InventorySession } from '../../types/stock.types';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';

export const InventoryCard = ({ session, isDarkMode }: { session: InventorySession; isDarkMode: boolean }) => {
    const isCompleted = session.status === 'completed';
    const StatusIcon = isCompleted ? CheckCircle2 : (session.status === 'in_progress' ? Clock : AlertCircle);
    const statusColor = isCompleted ? '#059669' : '#d97706';

    return (
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={[styles.sessionName, isDarkMode && styles.textDark]}>{session.name || 'Inventário Geral'}</Text>
                    <Text style={styles.date}>{new Date(session.created_at).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isCompleted ? '#d1fae5' : '#fef3c7' }, isDarkMode && { backgroundColor: isCompleted ? '#064e3b' : '#451a03' }]}>
                    <StatusIcon size={12} color={statusColor} />
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                        {isCompleted ? 'Concluído' : 'Em andamento'}
                    </Text>
                </View>
            </View>
            <View style={styles.footer}>
                <Text style={styles.itemsCount}>{session.items_count || 0} itens contados</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
    cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    sessionName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    date: { fontSize: 13, color: '#64748b' },
    textDark: { color: '#f8fafc' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    itemsCount: { fontSize: 13, color: '#64748b' },
});
