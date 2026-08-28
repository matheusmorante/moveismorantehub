import { AppState, type AppStateStatus, Alert } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import * as Updates from 'expo-updates';

export async function checkAndUpdateManually(onStatus?: (status: string) => void) {
  try {
    if (!Updates.isEnabled) {
      Alert.alert('Atualizações OTA', 'As atualizações OTA não estão ativas neste ambiente.');
      return;
    }

    onStatus?.('checking');
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      Alert.alert('App Atualizado', 'Você já está na versão mais recente disponível.');
      onStatus?.('latest');
      return;
    }

    onStatus?.('downloading');
    Alert.alert('Nova Versão Encontrada', 'Baixando atualização...', [], { cancelable: false });
    
    await Updates.fetchUpdateAsync();
    
    Alert.alert(
      'Atualização Pronta',
      'A nova versão foi baixada. O app será reiniciado agora.',
      [
        {
          text: 'Reiniciar Agora',
          onPress: async () => {
            await Updates.reloadAsync();
          },
        },
      ],
      { cancelable: false }
    );
    onStatus?.('ready');
  } catch (error: any) {
    console.warn('[Atualização Manual] Erro:', error);
    Alert.alert('Verificação de Atualização', `Não foi possível verificar atualizações no momento: ${error?.message || error}`);
    onStatus?.('error');
  }
}

/** Busca e aplica atualizações OTA automaticamente ao abrir ou voltar ao aplicativo. */
export function useExpoAutoUpdate() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const checking = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current) return;

    checking.current = true;
    try {
      // Pequeno delay para garantir que a inicialização nativa do app concluiu
      await new Promise(res => setTimeout(res, 1500));
      
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) return;

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[Atualização Automática] Aviso ao verificar OTA:', error);
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
