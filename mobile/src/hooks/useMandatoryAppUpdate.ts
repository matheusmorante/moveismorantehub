import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { supabase } from '../services/supabaseClient';
import { resolveAndroidReleaseUpdateState } from './androidReleaseRules';
import type { AndroidReleaseRecord } from './androidReleaseRules';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

function getInstalledAndroidBuild() {
  const nativeBuild = Number(Application.nativeBuildVersion);
  if (Number.isSafeInteger(nativeBuild) && nativeBuild > 0) return nativeBuild;

  const configuredBuild = Number(Constants.expoConfig?.android?.versionCode || Constants.platform?.android?.versionCode);
  return Number.isSafeInteger(configuredBuild) && configuredBuild > 0 ? configuredBuild : 0;
}

export function useMandatoryAppUpdate() {
  const installedBuild = useMemo(getInstalledAndroidBuild, []);
  const [release, setRelease] = useState<AndroidReleaseRecord | null>(null);
  const [dismissedBuild, setDismissedBuild] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const lastCheckAt = useRef(0);

  const checkRelease = useCallback(async () => {
    if (Platform.OS !== 'android' || Date.now() - lastCheckAt.current < 15_000) return;
    lastCheckAt.current = Date.now();

    try {
      const { data, error } = await supabase
        .from('app_release_current')
        .select('platform,version,build_number,min_supported_build,storage_path,file_size,sha256,is_mandatory,release_notes,download_url,updated_at')
        .eq('platform', 'android')
        .maybeSingle();

      if (error) return;
      const updateState = resolveAndroidReleaseUpdateState(installedBuild, data as AndroidReleaseRecord | null);
      setRelease(updateState.release);
    } catch {
      // Offline — mantém app utilizável; próxima abertura tenta de novo.
    }
  }, [installedBuild]);

  useEffect(() => {
    void checkRelease();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkRelease();
    });
    return () => subscription.remove();
  }, [checkRelease]);

  const updateState = resolveAndroidReleaseUpdateState(installedBuild, release);
  const visible = updateState.available
    && (updateState.required || dismissedBuild !== updateState.release?.build_number);

  const dismissUpdate = useCallback(() => {
    if (!updateState.required && updateState.release) {
      setDismissedBuild(updateState.release.build_number);
    }
    setDownloadError(null);
  }, [updateState.required, updateState.release]);

  const downloadUpdate = useCallback(async () => {
    const currentRelease = updateState.release;
    if (!currentRelease?.download_url || !updateState.available || downloading) return;

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      if (!FileSystem.cacheDirectory) throw new Error('Armazenamento temporário indisponível.');
      const destination = `${FileSystem.cacheDirectory}morantehub-update.apk`;
      await FileSystem.deleteAsync(destination, { idempotent: true });

      const task = FileSystem.createDownloadResumable(
        currentRelease.download_url,
        destination,
        { headers: { 'Cache-Control': 'no-cache' } },
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(Math.min(100, Math.floor((totalBytesWritten / totalBytesExpectedToWrite) * 100)));
          }
        },
      );
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        throw new Error('O download foi interrompido. Tente novamente.');
      }

      const file = await FileSystem.getInfoAsync(result.uri);
      if (!file.exists) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
        throw new Error('O arquivo baixado não foi encontrado. Tente novamente.');
      }

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: contentUri,
          type: APK_MIME_TYPE,
          flags: FLAG_GRANT_READ_URI_PERMISSION,
        });
      } catch {
        const packageName = Application.applicationId || 'com.morante.mobile';
        try {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
            data: `package:${packageName}`,
          });
        } catch {
          // Mantém o erro visível se configurações não puderem ser abertas.
        }
        throw new Error('Permita que o App Morante instale aplicativos desta fonte e toque em baixar novamente.');
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Falha ao baixar a atualização.');
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  }, [downloading, updateState.available, updateState.release]);

  return {
    visible,
    required: updateState.required,
    release: updateState.release,
    downloading,
    downloadProgress,
    downloadError,
    downloadUpdate,
    dismissUpdate,
  };
}
