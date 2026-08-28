import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, MoreVertical, Search, ShieldCheck, UserCog } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';

type Profile = { id: string; email: string; full_name?: string; role: string };
const ROLES = [['administrator', 'Administrador'], ['manager', 'Gestor'], ['seller', 'Vendedor'], ['deliverer', 'Entregador / Montador'], ['pending', 'Sem acesso']];
const AREAS = [['manualStockMovement', 'Estoque'], ['productConfig', 'Produtos'], ['viewFinancials', 'Financeiro'], ['deleteOrders', 'Excluir pedidos'], ['startDelivery', 'Iniciar entrega']];

export function NativeSettingsScreen({ isDarkMode, setIsDarkMode, isAdmin, onBack }: { isDarkMode: boolean; setIsDarkMode: (value: boolean) => void; isAdmin: boolean; onBack: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(isAdmin);
  const [openId, setOpenId] = useState<string | null>(null); const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const load = async () => {
    setLoading(isAdmin);
    const [users, config] = await Promise.all([isAdmin ? supabase.from('profiles').select('id,email,full_name,role').order('email') : Promise.resolve({ data: null }), supabase.from('settings').select('id,data').eq('id', 'app').maybeSingle()]);
    if (users.data) setProfiles(users.data as Profile[]);
    const loadedPermissions = config.data?.data?.rolePermissions || {};
    setPermissions({ startDelivery: ['administrator', 'deliverer'], ...loadedPermissions });
    const savedTheme = config.data?.data?.mobileSettings?.darkMode;
    if (typeof savedTheme === 'boolean') setIsDarkMode(savedTheme);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [isAdmin]);
  const filtered = useMemo(() => profiles.filter(p => `${p.full_name || ''} ${p.email}`.toLowerCase().includes(search.toLowerCase())), [profiles, search]);
  const updateRole = async (profile: Profile, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.id);
    if (error) {
      Alert.alert('Não foi possível atualizar o cargo', error.message);
      return;
    }
    setProfiles(items => items.map(item => item.id === profile.id ? { ...item, role } : item));
    setOpenId(null);
  };
  const togglePermission = async (area: string, role: string) => {
    if (role === 'administrator') return;
    const current = permissions[area] || []; const next = current.includes(role) ? current.filter(item => item !== role) : [...current, role];
    const updated = { ...permissions, [area]: next }; setPermissions(updated);
    const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
    const { error } = await supabase.from('settings').upsert({ id: 'app', data: { ...(data?.data || {}), rolePermissions: updated } });
    if (error) Alert.alert('Não foi possível salvar as permissões', error.message);
  };
  const updateTheme = async (darkMode: boolean) => {
    setIsDarkMode(darkMode);
    const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
    const { error } = await supabase.from('settings').upsert({ id: 'app', data: { ...(data?.data || {}), mobileSettings: { ...(data?.data?.mobileSettings || {}), darkMode } } });
    if (error) Alert.alert('Não foi possível salvar a aparência', error.message);
  };
  return <View style={[styles.page, isDarkMode && styles.dark]}><View style={[styles.header, isDarkMode && styles.darkBorder]}><TouchableOpacity onPress={onBack} style={styles.back}><ChevronLeft size={24} color={isDarkMode ? '#e2e8f0' : '#0f172a'} /></TouchableOpacity><View><Text style={[styles.title, isDarkMode && styles.light]}>Configurações</Text><Text style={styles.subtitle}>Preferências do aplicativo</Text></View></View><ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.card, isDarkMode && styles.cardDark]}><Text style={[styles.sectionTitle, isDarkMode && styles.light]}>Aparência</Text><View style={styles.row}><View><Text style={[styles.label, isDarkMode && styles.light]}>Modo escuro</Text><Text style={styles.hint}>Usar o tema escuro no aplicativo</Text></View><Switch value={isDarkMode} onValueChange={value => void updateTheme(value)} trackColor={{ false: '#cbd5e1', true: '#2563eb' }} /></View></View>
    {isAdmin && <View style={[styles.card, isDarkMode && styles.cardDark]}><View style={styles.adminHead}><View><Text style={[styles.sectionTitle, isDarkMode && styles.light]}>Gestão de acessos</Text><Text style={styles.hint}>Contas, cargos e permissões</Text></View><ShieldCheck size={22} color="#2563eb" /></View><View style={[styles.search, isDarkMode && styles.searchDark]}><Search size={17} color="#64748b" /><TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar nome ou e-mail" placeholderTextColor="#94a3b8" style={[styles.input, isDarkMode && styles.light]} /></View>{loading ? <ActivityIndicator color="#2563eb" style={{ margin: 20 }} /> : filtered.map(profile => <View key={profile.id} style={[styles.user, isDarkMode && styles.darkBorder]}><View style={styles.userIcon}><UserCog size={17} color="#2563eb" /></View><View style={{ flex: 1 }}><Text style={[styles.label, isDarkMode && styles.light]}>{profile.full_name || 'Usuário sem nome'}</Text><Text style={styles.hint}>{profile.email}</Text><Text style={styles.role}>{ROLES.find(([value]) => value === profile.role)?.[1] || profile.role}</Text></View><TouchableOpacity onPress={() => setOpenId(openId === profile.id ? null : profile.id)} style={styles.menu}><MoreVertical size={20} color="#64748b" /></TouchableOpacity>{openId === profile.id && <View style={[styles.menuBox, isDarkMode && styles.cardDark]}>{ROLES.map(([value, label]) => <TouchableOpacity key={value} onPress={() => void updateRole(profile, value)} style={styles.menuItem}><Text style={[styles.menuText, value === 'pending' && styles.danger]}>{value === 'pending' ? 'Remover acesso' : label}</Text></TouchableOpacity>)}</View>}</View>)}</View>}
    {isAdmin && <View style={[styles.card, isDarkMode && styles.cardDark]}><Text style={[styles.sectionTitle, isDarkMode && styles.light]}>Áreas permitidas por cargo</Text><Text style={[styles.hint, { marginBottom: 10 }]}>Administrador tem acesso total e não pode ser desmarcado.</Text>{AREAS.map(([area, label]) => <View key={area} style={[styles.permission, isDarkMode && styles.darkBorder]}><Text style={[styles.label, isDarkMode && styles.light]}>{label}</Text><View style={styles.permissionRoles}>{ROLES.slice(0, 4).map(([role, name]) => { const granted = role === 'administrator' || (permissions[area] || []).includes(role); return <TouchableOpacity key={role} disabled={role === 'administrator'} onPress={() => void togglePermission(area, role)} style={[styles.chip, granted && styles.chipOn]}><Text style={[styles.chipText, granted && styles.chipTextOn]}>{name}</Text></TouchableOpacity>; })}</View></View>)}</View>}
  </ScrollView></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#f8fafc' }, dark: { backgroundColor: '#0f172a' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' }, darkBorder: { borderColor: '#334155' }, back: { padding: 4 }, title: { fontSize: 20, fontWeight: '900', color: '#0f172a' }, subtitle: { fontSize: 11, color: '#64748b' }, content: { padding: 16, gap: 14, paddingBottom: 36 }, card: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0' }, cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' }, light: { color: '#f8fafc' }, sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }, label: { fontSize: 13, fontWeight: '800', color: '#334155' }, hint: { fontSize: 11, color: '#64748b', marginTop: 2 }, adminHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12 }, searchDark: { backgroundColor: '#0f172a' }, input: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#0f172a' }, user: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9', position: 'relative' }, userIcon: { backgroundColor: '#eff6ff', padding: 9, borderRadius: 10, marginRight: 10 }, role: { fontSize: 10, color: '#2563eb', fontWeight: '900', marginTop: 4, textTransform: 'uppercase' }, menu: { padding: 6 }, menuBox: { position: 'absolute', right: 4, top: 46, zIndex: 5, width: 190, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 6, elevation: 5 }, menuItem: { padding: 10 }, menuText: { fontSize: 12, fontWeight: '700', color: '#334155' }, danger: { color: '#e11d48' }, permission: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e2e8f0' }, permissionRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }, chip: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#e2e8f0', borderRadius: 20 }, chipOn: { backgroundColor: '#2563eb' }, chipText: { fontSize: 10, fontWeight: '800', color: '#475569' }, chipTextOn: { color: '#fff' } });
