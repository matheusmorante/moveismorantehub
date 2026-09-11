import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { supabase } from '../services/supabaseClient';

export type RequiredUpdate = { required: boolean; url: string };

const TARGET_OFFICIAL_BUILD = 17;

function getInstalledAndroidBuild(): number {
  try {
    const buildVersion = Application.nativeBuildVersion;
    if (buildVersion) {
      const parsed = parseInt(String(buildVersion), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}

  const fallback = Constants.expoConfig?.android?.versionCode || Constants.platform?.android?.versionCode;
  return fallback ? parseInt(String(fallback), 10) : 0;
}

export function useMandatoryAppUpdate(): RequiredUpdate {
  const [update, setUpdate] = useState<RequiredUpdate>({ required: false, url: '' });

  useEffect(() => {
    const check = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'app')
          .maybeSingle();

        const config = data?.data?.mobileSettings;
        const requiredBuild = Number(config?.requiredAndroidBuild || config?.minimumAndroidBuild || TARGET_OFFICIAL_BUILD);
        const url = config?.androidUpdateUrl || 'https://expo.dev/artifacts/eas/c6GuI7KSgOnw0kSY-zI9S_5dxaFMuc9lCT37XL-ynYE.apk';
        const installedBuild = getInstalledAndroidBuild();

        // Se a build instalada for diferente da build requerida oficial (17), bloqueia para atualização obrigatória
        const isOutdated = installedBuild !== requiredBuild;

        if (url && isOutdated) {
          console.log(`[Update Obrigatório] Build instalada: ${installedBuild} != Esperada: ${requiredBuild}`);
          setUpdate({ required: true, url });
        } else {
          setUpdate({ required: false, url: '' });
        }
      } catch (err) {
        console.warn('[useMandatoryAppUpdate] Erro ao verificar atualização:', err);
      }
    };

    void check();
  }, []);

  return update;
}
