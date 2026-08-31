import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth, UserRole } from '../../../context/AuthContext';
import { getPrimaryRole, getProfileRoles, roleLabel } from '@/pages/utils/accessRoles';
import UserRolesModal, { AccessProfile } from './UserRolesModal';
import { toast } from 'react-toastify';

interface Profile extends AccessProfile { role: UserRole; roles?: UserRole[]; }

const UserRow = ({ profile, onClick }: { profile: AccessProfile; onClick: () => void }) => <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black uppercase text-blue-600 dark:bg-blue-900/30">{(profile.full_name || profile.email)[0]}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{profile.full_name || 'Usuário'}</p><p className="truncate text-xs text-slate-400">{profile.email}</p></div>{profile.roles.length > 0 && <div className="hidden flex-wrap justify-end gap-1 sm:flex">{profile.roles.map((role) => <span key={role} className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/30">{roleLabel(role)}</span>)}</div>}<i className="bi bi-chevron-right text-slate-400" /></button>;

const UsersManagement = () => {
    const { isAdmin } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Profile | null>(null);

    useEffect(() => {
        if (!isAdmin) return;
        void supabase.from('profiles').select('id,email,full_name,role').order('email').then(({ data, error }) => {
            if (error) toast.error('Erro ao carregar as contas.'); else setProfiles((data || []) as Profile[]);
            setLoading(false);
        });
    }, [isAdmin]);

    const normalizedProfiles = useMemo(() => profiles.map((profile) => ({ ...profile, roles: getProfileRoles(profile) })), [profiles]);
    const assigned = normalizedProfiles.filter((profile) => profile.roles.length > 0);
    const unassigned = normalizedProfiles.filter((profile) => profile.roles.length === 0);
    const saveRoles = async (roles: UserRole[]) => {
        if (!selected) return;
        const role = getPrimaryRole(roles);
        const { error } = await supabase.from('profiles').update({ role }).eq('id', selected.id);
        if (error) { toast.error('Não foi possível salvar os cargos.'); throw error; }
        setProfiles((items) => items.map((item) => item.id === selected.id ? { ...item, roles, role } : item));
        toast.success('Cargos atualizados.');
    };

    if (!isAdmin) return <div className="flex min-h-[60vh] items-center justify-center text-center"><div><i className="bi bi-shield-lock-fill mb-6 block text-6xl text-slate-200" /><h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Acesso restrito</h2></div></div>;
    const list = (title: string, description: string, rows: AccessProfile[]) => <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"><header className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30"><h2 className="text-sm font-black text-slate-800 dark:text-slate-100">{title} <span className="text-slate-400">({rows.length})</span></h2><p className="mt-1 text-xs text-slate-400">{description}</p></header>{rows.length ? rows.map((profile) => <UserRow key={profile.id} profile={profile} onClick={() => setSelected(profile as Profile)} />) : <p className="p-8 text-center text-sm font-bold text-slate-400">Nenhuma conta nesta lista.</p>}</section>;

    return <div className="mx-auto max-w-6xl animate-slide-up p-4"><header className="mb-5"><h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Gestão de acessos</h1><p className="mt-1 text-sm font-bold text-slate-500">Clique em uma conta para ver os detalhes e definir seus cargos.</p></header><div className="space-y-5">{loading ? <div className="py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" /></div> : <>{list('Usuários com cargo', 'Contas que já têm acesso ao sistema.', assigned)}{list('Usuários sem cargo', 'Contas aguardando a atribuição de acesso.', unassigned)}</>}</div>{selected && <UserRolesModal profile={selected} onClose={() => setSelected(null)} onSave={saveRoles} />}</div>;
};

export default UsersManagement;
