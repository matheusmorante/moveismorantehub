import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { UserRole, useAuth } from '@/context/AuthContext';
import { AppSettings } from '@/pages/utils/settingsService';

type Profile = { id: string; email: string; full_name?: string | null; role: UserRole; position?: string | null };
const roles: Array<[UserRole, string]> = [['administrator', 'Administrador'], ['manager', 'Gestor'], ['seller', 'Vendedor'], ['deliverer', 'Entregador / Montador'], ['pending', 'Sem acesso']];
const areas = [
  ['manualStockMovement', 'Movimentação de estoque'], ['productConfig', 'Produtos e cadastros'],
  ['viewFinancials', 'Financeiro'], ['deleteOrders', 'Excluir pedidos'], ['startDelivery', 'Iniciar entrega'],
] as const;

export default function AccessManagementSection({ settings, onChange }: { settings: AppSettings; onChange: (path: string, value: any) => void }) {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]); const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,position').order('email'); if (error) toast.error('Não foi possível carregar as contas.'); else setProfiles(data as Profile[]); setLoading(false); };
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);
  const visibleProfiles = useMemo(() => profiles.filter(p => `${p.full_name || ''} ${p.email}`.toLowerCase().includes(search.toLowerCase())), [profiles, search]);
  const setRole = async (profile: Profile, role: UserRole) => {
    const rolePositions: Partial<Record<UserRole, string>> = { manager: 'Gerente', seller: 'Vendedor', deliverer: 'Entregador / Montador' };
    const { error } = await supabase.from('profiles').update({ role, position: rolePositions[role] || null }).eq('id', profile.id);
    if (error) return toast.error('Não foi possível atualizar o cargo.');
    setProfiles(items => items.map(item => item.id === profile.id ? { ...item, role, position: rolePositions[role] || null } : item)); setOpenMenu(null); toast.success('Acesso atualizado e incluído na lista de funcionários.');
  };
  const togglePermission = (area: string, role: UserRole) => {
    if (role === 'administrator') return;
    const current = settings.rolePermissions?.[area as keyof NonNullable<AppSettings['rolePermissions']>] || [];
    const next = current.includes(role) ? current.filter(item => item !== role) : [...current, role];
    onChange(`rolePermissions.${area}`, next);
  };
  if (!isAdmin) return null;
  return <section id="acessos" className="space-y-6">
    <div><h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Gestão de acessos</h4><p className="text-xs text-slate-400 mt-1">Pesquise contas, atribua cargos e defina as áreas liberadas para cada cargo.</p></div>
    <div className="relative"><i className="bi bi-search absolute left-4 top-3 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou e-mail" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm" /></div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">{loading ? <p className="p-5 text-sm text-slate-400">Carregando contas...</p> : visibleProfiles.map(profile => <div key={profile.id} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{profile.full_name || 'Usuário sem nome'}</p><p className="truncate text-xs text-slate-400">{profile.email}</p></div><span className="hidden sm:block text-[10px] font-black uppercase text-blue-600">{roles.find(item => item[0] === profile.role)?.[1]}</span><div className="relative"><button onClick={() => setOpenMenu(openMenu === profile.id ? null : profile.id)} aria-label="Gerenciar conta" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><i className="bi bi-three-dots-vertical" /></button>{openMenu === profile.id && <div className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"><label className="text-[10px] font-black uppercase text-slate-400">Definir cargo</label><select value={profile.role} onChange={e => void setRole(profile, e.target.value as UserRole)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:bg-slate-800">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={() => void setRole(profile, 'pending')} className="mt-3 w-full rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-600 hover:bg-rose-100">Remover acesso</button></div>}</div></div>)}</div>
    <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"><h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">Áreas permitidas por cargo</h5><p className="mb-3 text-xs text-slate-400">Administrador possui acesso total e não pode ser desmarcado.</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Área</th>{roles.slice(0, 4).map(([, label]) => <th key={label} className="p-2 text-center">{label}</th>)}</tr></thead><tbody>{areas.map(([area, label]) => <tr key={area} className="border-t dark:border-slate-800"><td className="p-2 font-medium">{label}</td>{roles.slice(0, 4).map(([role]) => { const granted = role === 'administrator' || (settings.rolePermissions?.[area] || []).includes(role); return <td key={role} className="p-2 text-center"><input type="checkbox" checked={granted} disabled={role === 'administrator'} onChange={() => togglePermission(area, role)} /></td>; })}</tr>)}</tbody></table></div></div>
  </section>;
}
