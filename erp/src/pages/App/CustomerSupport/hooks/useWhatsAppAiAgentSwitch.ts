import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { subscribeToSettings, useSettings } from '@/pages/utils/settings';
import { setWhatsAppAiAgentEnabled } from '../services/whatsappAiAgentSettings';

const switchSchema = z.object({ enabled: z.boolean() });

export function useWhatsAppAiAgentSwitch(isAdministrator: boolean) {
  const settings = useSettings();
  const [isAgentStatusKnown, setIsAgentStatusKnown] = useState(false);
  const [isTogglingAiAgent, setIsTogglingAiAgent] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const { setValue, handleSubmit } = useForm<z.infer<typeof switchSchema>>({
    resolver: zodResolver(switchSchema),
    defaultValues: { enabled: false },
  });

  useEffect(() => subscribeToSettings(() => {}, {
    onRemoteLoad: ({ confirmed }) => setIsAgentStatusKnown(confirmed),
  }), [refresh]);

  const isAiAgentEnabled = settings.whatsappAiAgent?.enabled === true;
  const handleToggleAiAgent = () => {
    if (!isAdministrator || !isAgentStatusKnown || busy.current) return;
    if (!isAiAgentEnabled && !settings.whatsappAiAgent?.testPhoneNumbers?.length) {
      toast.info('Cadastre ao menos um número de teste nas configurações do agente antes de ligá-lo.');
      return;
    }
    const expectedEnabled = isAiAgentEnabled;
    busy.current = true;
    setIsTogglingAiAgent(true);
    setValue('enabled', !expectedEnabled);

    void handleSubmit(async ({ enabled }) => {
      try {
        const result = await setWhatsAppAiAgentEnabled(expectedEnabled, enabled);
        if (!result.confirmed) {
          toast.info('O estado do agente mudou em outra sessão. Confira antes de tentar novamente.');
          return;
        }
        toast.success(enabled
          ? 'Agente ligado para os números de teste cadastrados.'
          : 'Agente de IA desligado.');
      } catch {
        setIsAgentStatusKnown(false);
        setRefresh(value => value + 1);
        toast.error('Não foi possível confirmar a alteração. Confira o status antes de tentar novamente.');
      }
    }, () => toast.error('Não foi possível validar a alteração do agente.'))()
      .finally(() => {
        busy.current = false;
        setIsTogglingAiAgent(false);
      });
  };

  return {
    aiAgentConfig: settings.whatsappAiAgent,
    isAiAgentEnabled,
    isAgentStatusKnown,
    isTogglingAiAgent,
    handleToggleAiAgent,
  };
}
