import React, { useEffect, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth, UserRole } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

interface Profile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string | null;
    position: string | null;
}

const UsersManagement = () => {
    const { isAdmin } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('email');

            if (error) throw error;
            setProfiles(data);
        } catch (error: any) {
            toast.error('Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchProfiles();
        }
    }, [isAdmin]);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            // Optional: Also update position if it matches a standard role
            const roleMap: Record<string, string> = {
                'seller': 'Vendedor',
                'manager': 'Gerente',
                'administrator': 'Gerente',
                'deliverer': 'Entregador / Montador'
            };

            const positionToSet = roleMap[newRole];
            if (positionToSet) {
                await supabase.from('profiles').update({ position: positionToSet }).eq('id', userId);
            }

            setProfiles((prev: any) => prev.map((p: any) => p.id === userId ? { ...p, role: newRole, position: positionToSet || p.position } : p));
            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao atualizar perfil.');
        }
    };

    const handlePositionChange = async (userId: string, newPosition: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ position: newPosition })
                .eq('id', userId);

            if (error) throw error;

            setProfiles((prev: any) => prev.map((p: any) => p.id === userId ? { ...p, position: newPosition } : p));
            toast.success('Cargo atualizado com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao atualizar cargo.');
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <i className="bi bi-shield-lock-fill text-6xl text-slate-200 mb-6 block" />
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Acesso Restrito</h2>
                    <p className="text-slate-500 mt-2">Apenas administradores podem gerenciar perfis.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 animate-slide-up">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Gestão de Acessos</h1>
                    <p className="text-sm text-slate-500 mt-1 font-bold">Gerencie os perfis e permissões dos usuários do sistema.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo Principal</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil Atual</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center">
                                        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : (profiles as any).map((profile: any) => (
                                <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase">
                                                    {(profile.full_name || profile.email)[0]}
                                                </span>
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{profile.full_name || 'Usuário'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-500 font-bold">{profile.email}</td>
                                    <td className="px-8 py-5">
                                        <select
                                            value={profile.position || ""}
                                            onChange={(e: any) => handlePositionChange(profile.id, e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none w-full appearance-none"
                                        >
                                            <option value="">Nenhum</option>
                                            <option value="Vendedor">Vendedor</option>
                                            <option value="Gerente">Gerente</option>
                                            <option value="Entregador / Montador">Entregador / Montador</option>
                                            {profile.position && !['Vendedor', 'Gerente', 'Entregador / Montador'].includes(profile.position) && (
                                                <option value={profile.position}>{profile.position}</option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border 
                                            ${profile.role === 'administrator' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                profile.role === 'manager' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    profile.role === 'deliverer' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        profile.role === 'seller' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            profile.role === 'pending' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {profile.role === 'pending' ? 'Pendente' : profile.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <select
                                            value={profile.role}
                                            onChange={(e: any) => handleRoleChange(profile.id, e.target.value as UserRole)}
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                        >
                                            <option value="pending">Pendente (Aprov)</option>
                                            <option value="administrator">Administrador</option>
                                            <option value="manager">Gerente</option>
                                            <option value="seller">Vendedor</option>
                                            <option value="deliverer">Entregador / Montador</option>
                                            <option value="accountant">Contador</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UsersManagement;
