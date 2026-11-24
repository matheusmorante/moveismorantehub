import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { useAuth } from '../../../context/AuthContext';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createPasswordChangeFormSchema, profileFormSchema } from '../../../../../shared-utils/accountFormSchemas';
import { avatarUploadFormSchema } from '../../../../../shared-utils/fileFormSchemas';
import {
  changeProfilePassword,
  getProfileErrorMessage,
  resendProfileReauthCode,
  updateProfileRecord,
  uploadProfileAvatar,
} from '@/services/profile/profileService';
import ProfileSidebarCard from './components/ProfileSidebarCard';
import { ProfilePersonalInfoSection } from './components/ProfilePersonalInfoSection';
import { ProfileSecuritySection } from './components/ProfileSecuritySection';

const DEFAULT_POSITION_BY_ROLE: Record<string, string> = {
  seller: 'Vendedor',
  manager: 'Gerente',
  administrator: 'Gerente',
  deliverer: 'Entregador',
};

const normalizeProfileFormValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const Profile: React.FC = () => {
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
  const profileForm = useZodForm(profileFormSchema, {
    fullName,
    position,
    phone,
    address,
    city,
    state: stateValue,
  });
  const passwordSchema = createPasswordChangeFormSchema({
    code: passwordReauthRequired,
    currentPassword: currentPasswordRequired,
  });
  const passwordForm = useZodForm(passwordSchema, {
    password: newPassword,
    confirmation: confirmPassword,
    reauthenticationCode: passwordReauthCode,
    currentPassword,
  });

  const showValidationError = (errors: FieldErrors) => {
    toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.');
  };

  useEffect(() => {
    if (profile) {
      setFullName((prev) => prev || profile.full_name || user?.user_metadata?.full_name || '');
      setPosition((prev) => prev || profile.position || '');
      setPhone((prev) => prev || profile.phone || user?.phone || user?.user_metadata?.phone || '');
      setAddress((prev) => prev || profile.address || '');
      setCity((prev) => prev || profile.city || '');
      setStateValue((prev) => prev || profile.state || '');

      if (!profile.position && !position && profile.role) {
        setPosition(DEFAULT_POSITION_BY_ROLE[profile.role] || '');
      }
    }
    if (user) setEmail(user.email || '');
  }, [profile, user]);

  const handleUpdateProfile = async (data: z.output<typeof profileFormSchema>) => {
    if (profile) {
      const baseline = {
        fullName: profile.full_name || user?.user_metadata?.full_name || '',
        position: profile.position || DEFAULT_POSITION_BY_ROLE[profile.role] || '',
        phone: profile.phone || user?.phone || user?.user_metadata?.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
      };
      const fields = Object.keys(baseline) as Array<keyof typeof baseline>;
      const unchanged = fields.every(
        (field) => normalizeProfileFormValue(data[field]) === normalizeProfileFormValue(baseline[field]),
      );

      if (unchanged) {
        toast.info('Nenhum campo foi alterado. Nada foi enviado ao servidor.');
        return;
      }
    }

    setLoading(true);
    try {
      await updateProfileRecord(user?.id, data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: unknown) {
      toast.error(getProfileErrorMessage(error, 'Erro ao atualizar perfil.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (data: z.output<typeof passwordSchema>) => {
    setLoading(true);
    try {
      const result = await changeProfilePassword({
        password: data.password,
        reauthRequired: passwordReauthRequired,
        reauthenticationCode: data.reauthenticationCode,
        currentPasswordRequired,
        currentPassword: data.currentPassword,
      });

      if (result.status === 'reauth_sent') {
        setPasswordReauthRequired(true);
        setPasswordReauthCode('');
        toast.info('Enviamos um código para confirmar sua identidade.');
        return;
      }
      if (result.status === 'current_password_required') {
        setCurrentPasswordRequired(true);
        toast.info('Informe sua senha atual para continuar.');
        return;
      }
      if (result.status === 'error') {
        toast.error(result.message);
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

  const handleResendReauthCode = async () => {
    setLoading(true);
    try {
      const outcome = await resendProfileReauthCode();
      if (!outcome.ok) toast.error(outcome.message);
      else toast.success('Enviamos um novo código de confirmação.');
    } catch {
      toast.error('Não foi possível enviar o código agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) =>
    avatarForm.validateAndRun(
      { userId: user?.id || '', files: Array.from(event.target.files || []) },
      async (values) => {
        try {
          setUploading(true);
          const files = values.files;
          if (!files || files.length === 0) {
            throw new Error('Você deve selecionar uma imagem para upload.');
          }
          if (!user?.id || values.userId !== user.id) {
            throw new Error('Não foi possível confirmar o perfil autenticado para salvar a foto.');
          }

          await uploadProfileAvatar(user.id, files[0]);
          toast.success('Foto de perfil atualizada!');
          window.location.reload();
        } catch (error: unknown) {
          toast.error(getProfileErrorMessage(error, 'Erro ao atualizar foto de perfil.'));
        } finally {
          setUploading(false);
        }
      },
      showValidationError,
    );

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
        <div className="md:col-span-2 space-y-6">
          <ProfilePersonalInfoSection
            fullName={fullName}
            phone={phone}
            position={position}
            email={email}
            address={address}
            city={city}
            stateValue={stateValue}
            loading={loading}
            onFullNameChange={setFullName}
            onPhoneChange={setPhone}
            onPositionChange={setPosition}
            onAddressChange={setAddress}
            onCityChange={setCity}
            onStateValueChange={setStateValue}
            onSubmit={profileForm.submit(handleUpdateProfile, showValidationError)}
          />
          <ProfileSecuritySection
            currentPasswordRequired={currentPasswordRequired}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            passwordReauthRequired={passwordReauthRequired}
            passwordReauthCode={passwordReauthCode}
            loading={loading}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onPasswordReauthCodeChange={setPasswordReauthCode}
            onResendCode={handleResendReauthCode}
            onSubmit={passwordForm.submit(handleChangePassword, showValidationError)}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
