import { AppState, type AppStateStatus } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import * as Updates from 'expo-updates';

/** Busca e aplica atualizações OTA ao abrir ou voltar ao aplicativo. */
export function useExpoAutoUpdate() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const checking = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current) return;

    checking.current = true;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) return;

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[Atualização] Não foi possível verificar atualizações OTA:', error);
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToForeground =
        /inactive|background/.test(appState.current) && nextState === 'active';

      appState.current = nextState;
      if (returnedToForeground) void checkForUpdate();
    });

    return () => subscription.remove();
  }, [checkForUpdate]);
}
