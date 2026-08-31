import React, { useEffect, useState } from 'react';
import { UserRole } from '@/context/AuthContext';
import { roleLabel, SYSTEM_ROLES } from '@/pages/utils/accessRoles';

export interface AccessProfile { id: string; email: string; full_name: string | null; roles: UserRole[]; }

interface UserRolesModalProps {
    profile: AccessProfile;
    onClose: () => void;
    onSave: (roles: UserRole[]) => Promise<void>;
}

const UserRolesModal = ({ profile, onClose, onSave }: UserRolesModalProps) => {
    const [roles, setRoles] = useState<UserRole[]>(profile.roles);
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { setRoles(profile.roles); }, [profile]);
    const addRole = () => {
        if (selectedRole) setRoles((items) => [...new Set([...items, selectedRole])]);
        setSelectedRole('');
    };
    const save = async () => {
        setSaving(true);
        try { await onSave(roles); onClose(); }
        finally { setSaving(false); }
    };

    return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
        <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800"><div><h2 className="text-lg font-black text-slate-800 dark:text-white">Detalhes do usuário</h2><p className="mt-1 text-sm font-bold text-slate-500">{profile.full_name || 'Usuário'}</p><p className="text-xs text-slate-400">{profile.email}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><i className="bi bi-x-lg" /></button></header>
            <div className="space-y-4 p-6"><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo</label><div className="flex gap-2"><select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole | '')} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100"><option value="">Selecione um cargo</option>{SYSTEM_ROLES.filter(([role]) => !roles.includes(role)).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select><button type="button" onClick={addRole} disabled={!selectedRole} className="w-11 rounded-xl bg-blue-600 text-white disabled:opacity-40"><i className="bi bi-plus-lg" /></button></div>
                <div className="flex flex-wrap gap-2">{roles.length ? roles.map((role) => <span key={role} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-950/30"><span>{roleLabel(role)}</span><button onClick={() => setRoles((items) => items.filter((item) => item !== role))} aria-label={`Remover ${roleLabel(role)}`}><i className="bi bi-x-lg" /></button></span>) : <p className="text-sm font-medium text-slate-400">Esta conta está sem cargo e sem acesso.</p>}</div>
                {roles.some((role) => role === 'administrator' || role === 'manager') && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30">Administrador e Gestor possuem acesso total.</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 p-5 dark:border-slate-800"><button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button><button onClick={() => void save()} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar cargos'}</button></footer>
        </section>
    </div>;
};

export default UserRolesModal;
