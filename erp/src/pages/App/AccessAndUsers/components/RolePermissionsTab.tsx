import React, { useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  getSettings,
  saveSettings,
  subscribeToSettings,
} from '@/pages/utils/settingsService';
import RolePermissionsMatrix from '@/components/access/RolePermissionsMatrix';
import { toast } from 'react-toastify';

export const RolePermissionsTab: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const settingsRef = useRef(settings);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => {
      settingsRef.current = newSettings;
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  const handlePermissionsChange = (permissions: Record<string, string[]>) => {
    const nextSettings: AppSettings = {
      ...settingsRef.current,
      rolePermissions: {
        ...(settingsRef.current.rolePermissions || {}),
        ...permissions,
      },
    };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    void saveSettings(nextSettings)
      .then(() => toast.success('Permissão atualizada.', { autoClose: 1200 }))
      .catch(() => toast.error('Erro ao salvar permissão.'));
  };

  return <RolePermissionsMatrix settings={settings} onPermissionsChange={handlePermissionsChange} />;
};
