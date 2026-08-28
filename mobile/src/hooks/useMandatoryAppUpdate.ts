import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../services/supabaseClient';

type RequiredUpdate = { required: boolean; url: string };

function getInstalledAndroidBuild() {
  const fallbackBuild = Number(Constants.platform?.android?.versionCode || 0);

  try {
    const application = require('expo-application') as { nativeBuildVersion?: string | null };
    return Number(application.nativeBuildVersion || fallbackBuild);
  } catch {
    return fallbackBuild;
  }
}

export function useMandatoryAppUpdate(): RequiredUpdate {
  const [update, setUpdate] = useState<RequiredUpdate>({ required: false, url: '' });

  useEffect(() => {
    const check = async () => {
      if (Platform.OS !== 'android') return;
      const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
      const config = data?.data?.mobileSettings;
      const minimumBuild = Number(config?.minimumAndroidBuild || 0);
      const installedBuild = getInstalledAndroidBuild();
      const url = config?.androidUpdateUrl || '';
      setUpdate({ required: Boolean(url && minimumBuild > installedBuild), url });
    };
    void check();
  }, []);

  return update;
}
