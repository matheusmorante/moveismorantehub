import { useEffect, useState } from 'react';

type RequiredUpdate = { required: boolean; url: string };

/**
 * Hook de atualização obrigatória desativado para evitar bloqueios falso-positivos de APK.
 * As atualizações são tratadas automaticamente em segundo plano via EAS Update (OTA).
 */
export function useMandatoryAppUpdate(): RequiredUpdate {
  return { required: false, url: '' };
}
