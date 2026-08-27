import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';

const Profile = () => {
    const { user, profile, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [position, setPosition] = useState(profile?.position || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [address, setAddress] = useState(profile?.address || '');
    const [city, setCity] = useState(profile?.city || '');
    const [stateValue, setStateValue] = useState(profile?.state || '');
    const [email, setEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state when profile loads
    useEffect(() => {
        if (profile) {
            setFullName(prev => prev || profile.full_name || user?.user_metadata?.full_name || '');
            setPosition(prev => prev || profile.position || '');
            setPhone(prev => prev || profile.phone || user?.phone || user?.user_metadata?.phone || '');
            setAddress(prev => prev || profile.address || '');
            setCity(prev => prev || profile.city || '');
            setStateValue(prev => prev || profile.state || '');

            // Auto-set position if empty based on role
            if (!profile.position && !position && profile.role) {
                const roleMap: Record<string, string> = {
                    'seller': 'Vendedor',
                    'manager': 'Gerente',
                    'administrator': 'Gerente',
                    'deliverer': 'Entregador'
                };
                setPosition(roleMap[profile.role] || '');
            }
        }
        if (user) setEmail(user.email || '');
    }, [profile, user]);

    const handleUpdateProfile = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const now = (new (window as any).Date()).toISOString();
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    position: position,
                    phone: phone,
                    address: address,
                    city: city,
                    state: stateValue,
                    updated_at: now
                })
                .eq('id', user?.id);

            if (error) throw error;
            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!email || email === user?.email) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            toast.info('Verifique seu novo e-mail para confirmar a alteração.');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar e-mail.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword) return;
        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success('Senha alterada com sucesso!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha.');
        } finally {
            setLoading(false);
        }
    };

    const uploadAvatar = async (event: any) => {
        try {
            setUploading(true);
            const files = event.target.files;
            if (!files || files.length === 0) {
                throw new (window as any).Error('Você deve selecionar uma imagem para upload.');
            }

            const file = files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            toast.success('Foto de perfil atualizada!');
            (window as any).location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Lateral: Avatar e Info Básica */}
                <div className="md:col-span-1">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="relative inline-block mb-6">
                            <div className="w-32 h-32 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <i className="bi bi-person-fill text-5xl text-blue-300"></i>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => (fileInputRef.current as any)?.click()}
                                disabled={uploading}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-all border-4 border-white dark:border-slate-900"
                            >
                                {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="bi bi-camera-fill text-sm"></i>}
                            </button>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={uploadAvatar}
                            />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{profile?.full_name || 'Usuário'}</h2>
                        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-1">{profile?.role}</p>

                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3">
                            <a 
                                href="/application-9bba56a8-1ab4-46b5-ac41-637fbb6cab2d.apk"
                                download="application-9bba56a8-1ab4-46b5-ac41-637fbb6cab2d.apk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all text-xs"
                            >
                                <i className="bi bi-android2 text-base"></i>
                                Baixar App Android (v1.0.2)
                            </a>

                            <button
                                onClick={logout}
                                className="w-full py-3 bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-box-arrow-right"></i>
                                Sair da Conta
                            </button>
                        </div>
                    </div>
                </div>

                {/* Principal: Formulários */}
                <div className="md:col-span-2 space-y-6">

                    {/* Dados Pessoais */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                <i className="bi bi-person-badge-fill text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Informações Pessoais</h3>
                                <p className="text-xs text-slate-400 font-bold italic">Mantenha seus dados sempre atualizados.</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e: any) => setFullName(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">WhatsApp / Celular</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e: any) => setPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Cargo Principal</label>
                                        <select
                                            value={position}
                                            onChange={(e: any) => setPosition(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Selecione o cargo...</option>
                                            <option value="Vendedor">Vendedor</option>
                                            <option value="Gerente">Gerente</option>
                                            <option value="Entregador">Entregador</option>
                                            {position && !['Vendedor', 'Gerente', 'Entregador'].includes(position) && (
                                                <option value={position}>{position}</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">E-mail</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                value={email}
                                                readOnly
                                                className="grow bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-400 dark:text-slate-500 font-bold outline-none cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Endereço Residencial</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e: any) => setAddress(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Rua, Número, Bairro"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Cidade</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e: any) => setCity(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Sua Cidade"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Estado</label>
                                        <input
                                            type="text"
                                            value={stateValue}
                                            onChange={(e: any) => setStateValue(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Ex: São Paulo"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar Alterações"}
                            </button>
                        </form>
                    </div>

                    {/* Segurança */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                <i className="bi bi-shield-lock-fill text-amber-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Segurança da Conta</h3>
                                <p className="text-xs text-slate-400 font-bold italic">Gerencie sua senha de acesso.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Nova Senha</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e: any) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Confirmar Senha</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e: any) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={loading || !newPassword}
                                className="w-full mt-4 py-4 bg-slate-800 dark:bg-slate-700 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Atualizar Senha"}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
