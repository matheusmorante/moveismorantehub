import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock3, X } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';

interface Props { visible: boolean; dark: boolean; product: any | null; onClose: () => void; }

export const ProductPriceHistoryModal: React.FC<Props> = ({ visible, dark, product, onClose }) => {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!visible || !product?.id) return;
    let alive = true;
    setLoading(true); setError(false);
    supabase.from('product_price_history').select('*').eq('product_id', product.id).order('changed_at', { ascending: false }).then(({ data, error: queryError }) => {
      if (!alive) return;
      setRows(data || []); setError(Boolean(queryError)); setLoading(false);
    });
    return () => { alive = false; };
  }, [visible, product?.id]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}><View style={[styles.content, dark && styles.darkContent]}><View style={styles.header}><View style={styles.titleRow}><Clock3 size={20} color="#2563eb" /><View><Text style={[styles.title, dark && styles.light]}>Histórico de Preços</Text><Text style={styles.subtitle}>{product?.name || 'Produto'}</Text></View></View><TouchableOpacity onPress={onClose}><X size={20} color={dark ? '#cbd5e1' : '#64748b'} /></TouchableOpacity></View>{loading ? <ActivityIndicator color="#2563eb" style={styles.state} /> : error ? <Text style={styles.state}>Não foi possível carregar o histórico.</Text> : rows.length === 0 ? <Text style={styles.state}>Nenhuma alteração de preço registrada.</Text> : <ScrollView>{rows.map((row, index) => <View key={row.id || index} style={[styles.row, dark && styles.darkRow]}><View style={styles.flex}><Text style={[styles.date, dark && styles.light]}>{row.changed_at ? new Date(row.changed_at).toLocaleString('pt-BR') : 'Data não informada'}</Text><Text style={styles.meta}>{row.reason || row.change_reason || 'Alteração de preço'}</Text></View><Text style={styles.price}>R$ {Number(row.new_price ?? row.price ?? 0).toFixed(2).replace('.', ',')}</Text></View>)}</ScrollView>}</View></View></Modal>;
};

const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }, content: { maxHeight: '80%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 }, darkContent: { backgroundColor: '#0f172a' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 18, fontWeight: '900', color: '#0f172a' }, subtitle: { color: '#64748b', fontSize: 11, marginTop: 2 }, light: { color: '#f8fafc' }, state: { textAlign: 'center', color: '#64748b', padding: 30 }, row: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, backgroundColor: '#f8fafc', marginBottom: 8 }, darkRow: { backgroundColor: '#1e293b' }, flex: { flex: 1 }, date: { fontWeight: '800', color: '#0f172a', fontSize: 12 }, meta: { color: '#64748b', fontSize: 11, marginTop: 3 }, price: { color: '#059669', fontWeight: '900' } });
