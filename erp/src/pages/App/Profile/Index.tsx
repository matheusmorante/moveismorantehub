import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createPasswordChangeFormSchema, profileFormSchema } from '../../../../../shared-utils/accountFormSchemas';
import ProfileSidebarCard from './components/ProfileSidebarCard';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { avatarUploadFormSchema } from '../../../../../shared-utils/fileFormSchemas';
import {
  getPasswordAuthErrorMessage,
  isCurrentPasswordRequired,
  isPasswordReauthenticationRequired,
  requestPasswordChangeReauthentication,
  updateAuthenticatedPassword,
} from '@/services/authPasswordRecovery';

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
  const [passwordReauthRequired, setPasswordReauthRequired] = useState(false);
  const [passwordReauthCode, setPasswordReauthCode] = useState('');
  const [currentPasswordRequired, setCurrentPasswordRequired] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const avatarForm = useZodForm(avatarUploadFormSchema, { userId: user?.id || '', files: [] });
  const profileForm = useZodForm(profileFormSchema, { fullName, position, phone, address, city, state: stateValue });
  const passwordSchema = createPasswordChangeFormSchema({ code: passwordReauthRequired, currentPassword: currentPasswordRequired });
  const passwordForm = useZodForm(passwordSchema, {
    password: newPassword, confirmation: confirmPassword,
    reauthenticationCode: passwordReauthCode, currentPassword,
  });
  const showValidationError = (errors: FieldErrors) => {
    toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.');
  };

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName((prev) => prev || profile.full_name || user?.user_metadata?.full_name || '');
      setPosition((prev) => prev || profile.position || '');
      setPhone((prev) => prev || profile.phone || user?.phone || user?.user_metadata?.phone || '');
      setAddress((prev) => prev || profile.address || '');
      setCity((prev) => prev || profile.city || '');
      setStateValue((prev) => prev || profile.state || '');

      // Auto-set position if empty based on role
      if (!profile.position && !position && profile.role) {
        const roleMap: Record<string, string> = {
          seller: 'Vendedor',
          manager: 'Gerente',
          administrator: 'Gerente',
          deliverer: 'Entregador',
        };
        setPosition(roleMap[profile.role] || '');
      }
    }
    if (user) setEmail(user.email || '');
  }, [profile, user]);

  const handleUpdateProfile = async (data: z.output<typeof profileFormSchema>) => {
    setLoading(true);
    try {
      const now = new (window as any).Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          position: data.position,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          updated_at: now,
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

  const handleChangePassword = async (data: z.output<typeof passwordSchema>) => {
    setLoading(true);
    try {
      const { error } = await updateAuthenticatedPassword(
        supabase,
        data.password,
        passwordReauthRequired ? data.reauthenticationCode : undefined,
        currentPasswordRequired ? data.currentPassword : undefined
      );
      if (error && !passwordReauthRequired && isPasswordReauthenticationRequired(error)) {
        const { error: reauthError } = await requestPasswordChangeReauthentication(supabase);
        if (reauthError) {
          toast.error(getPasswordAuthErrorMessage(reauthError, 'reauth-send'));
          return;
        }
        setPasswordReauthRequired(true);
        setPasswordReauthCode('');
        toast.info('Enviamos um código para confirmar sua identidade.');
        return;
      }
      if (error && !currentPasswordRequired && isCurrentPasswordRequired(error)) {
        setCurrentPasswordRequired(true);
        toast.info('Informe sua senha atual para continuar.');
        return;
      }
      if (error) {
        toast.error(
          getPasswordAuthErrorMessage(
            error,
            passwordReauthRequired ? 'recovery-verify' : 'password-update'
          )
        );
        return;
      }
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordReauthRequired(false);
      setPasswordReauthCode('');
      setCurrentPasswordRequired(false);
      setCurrentPassword('');
    } catch {
      toast.error('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: any) => {
    return avatarForm.validateAndRun({ userId: user?.id || '', files: Array.from(event.target.files || []) }, async (values) => {
    try {
      setUploading(true);
      const files = values.files;
      if (!files || files.length === 0) {
        throw new (window as any).Error('Você deve selecionar uma imagem para upload.');
      }
      if (!user?.id || values.userId !== user.id) {
        throw new (window as any).Error('Não foi possível confirmar o perfil autenticado para salvar a foto.');
      }

      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Persist the avatar in the authenticated user's metadata. The profiles
      // table intentionally does not own this field.
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;

      toast.success('Foto de perfil atualizada!');
      (window as any).location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
    }, showValidationError);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProfileSidebarCard
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name}
          role={profile?.role}
          uploading={uploading}
          onAvatarChange={uploadAvatar}
          onLogout={logout}
        />

        {/* Principal: Formulários */}
        <div className="md:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <i className="bi bi-person-badge-fill text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Informações Pessoais
                </h3>
                <p className="text-xs text-slate-400 font-bold italic">
                  Mantenha seus dados sempre atualizados.
                </p>
              </div>
            </div>

            <form noValidate onSubmit={profileForm.submit(handleUpdateProfile, showValidationError)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e: any) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                    WhatsApp / Celular
                  </label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      Cargo Principal
                    </label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      E-mail
                    </label>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                    Endereço Residencial
                  </label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e: any) => setCity(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Sua Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      Estado
                    </label>
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
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Salvar Alterações'
                )}
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
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Segurança da Conta
                </h3>
                <p className="text-xs text-slate-400 font-bold italic">
                  Gerencie sua senha de acesso.
                </p>
              </div>
            </div>

            <form noValidate onSubmit={passwordForm.submit(handleChangePassword, showValidationError)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPasswordRequired && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      Senha atual
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e: any) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e: any) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {passwordReauthRequired && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
                      Código de confirmação
                    </label>
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={passwordReauthCode}
                      onChange={(e: any) =>
                        setPasswordReauthCode(e.target.value.replace(/\s/g, ''))
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Código enviado por e-mail"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { error } = await requestPasswordChangeReauthentication(supabase);
                          if (error) {
                            toast.error(getPasswordAuthErrorMessage(error, 'reauth-send'));
                          } else {
                            toast.success('Enviamos um novo código de confirmação.');
                          }
                        } catch {
                          toast.error('Não foi possível enviar o código agora. Tente novamente.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Reenviar código
                    </button>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full mt-4 py-4 bg-slate-800 dark:bg-slate-700 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : passwordReauthRequired ? (
                  'Confirmar e alterar senha'
                ) : (
                  'Alterar senha'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
