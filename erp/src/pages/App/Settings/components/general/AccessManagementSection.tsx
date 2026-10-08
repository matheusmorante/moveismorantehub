import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppSettings } from '@/pages/utils/settingsService';
import RolePermissionsMatrix from '@/components/access/RolePermissionsMatrix';

interface AccessManagementSectionProps {
  settings: AppSettings;
  onChange: (path: string, value: any) => void;
}

export default function AccessManagementSection({
  settings,
  onChange,
}: AccessManagementSectionProps) {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <section id="acessos" className="p-4 sm:p-6">
      <RolePermissionsMatrix
        settings={settings}
        onPermissionsChange={(permissions) =>
          Object.entries(permissions).forEach(([actionId, roles]) =>
            onChange(`rolePermissions.${actionId}`, roles)
          )
        }
      />
    </section>
  );
}
