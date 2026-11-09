import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { getSettings, saveSettings, useSettings } from '@/pages/utils/settings';
import type { AppSettings } from '@/pages/utils/settings/types';
import {
  whatsAppAiAgentFormSchema,
  type WhatsAppAiAgentFormData,
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { buildDefaultAiAgentFormValues } from './useWhatsAppAiAgentFormDefaults';
import { useTestPhoneNumbersManagement } from './useTestPhoneNumbersManagement';

interface UseWhatsAppAiAgentFormOptions {
  isOpen: boolean;
  isAdministrator: boolean;
  onClose: () => void;
}

export function useWhatsAppAiAgentForm({
  isOpen,
  isAdministrator,
  onClose,
}: UseWhatsAppAiAgentFormOptions) {
  const settings = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WhatsAppAiAgentFormData>({
    resolver: zodResolver(whatsAppAiAgentFormSchema),
    defaultValues: buildDefaultAiAgentFormValues(settings.whatsappAiAgent),
  });

  const watchedEnabled = watch('enabled');
  const watchedNumbers = watch('testPhoneNumbers') || [];
  const watchedPrompt = watch('systemPrompt') || '';
  const watchedTools = watch('enabledTools') || [];
  const watchedKnowledge = watch('knowledgeBase') || [];
  const watchedRules = watch('situationRules') || [];
  const watchedWorkflows = watch('workflows') || [];

  const {
    phoneInput,
    phoneError,
    setPhoneInput,
    setPhoneError,
    handleAddPhone,
    handleRemovePhone,
    resetPhoneInput,
  } = useTestPhoneNumbersManagement(watchedNumbers, setValue);

  useEffect(() => {
    if (isOpen) {
      reset(buildDefaultAiAgentFormValues(getSettings().whatsappAiAgent));
      resetPhoneInput();
    }
  }, [isOpen, reset, resetPhoneInput]);

  const handleToggleTool = (toolId: string) => {
    const isCurrentlyEnabled = watchedTools.includes(toolId);
    let nextTools: string[];
    if (isCurrentlyEnabled) {
      nextTools = watchedTools.filter((t) => t !== toolId);
    } else {
      nextTools = [...watchedTools, toolId];
    }
    setValue('enabledTools', nextTools, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRestoreDefaultPrompt = () => {
    setValue('systemPrompt', DEFAULT_WHATSAPP_AI_AGENT_PROMPT, {
      shouldValidate: true,
      shouldDirty: true,
    });
    toast.info('Instruções padrão do agente restauradas.');
  };

  const onSubmit = async (data: WhatsAppAiAgentFormData) => {
    if (!isAdministrator) {
      toast.error('Apenas administradores podem alterar as configurações do agente de IA.');
      return;
    }

    setIsSaving(true);
    try {
      const current = getSettings();
      const updated: AppSettings = {
        ...current,
        whatsappAiAgent: {
          enabled: data.enabled,
          testMode: true,
          testPhoneNumbers: data.testPhoneNumbers,
          supportMode: data.supportMode,
          systemPrompt: data.systemPrompt,
          enabledTools: data.enabledTools,
          knowledgeBase: data.knowledgeBase,
          situationRules: data.situationRules,
          workflows: data.workflows,
        },
      };

      await saveSettings(updated);
      toast.success('Configurações do Agente de IA salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações do agente de IA:', error);
      toast.error('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    isSaving,
    phoneInput,
    phoneError,
    setPhoneInput,
    setPhoneError,
    watchedEnabled,
    watchedNumbers,
    watchedPrompt,
    watchedTools,
    watchedKnowledge,
    watchedRules,
    watchedWorkflows,
    handleAddPhone,
    handleRemovePhone,
    handleToggleTool,
    handleRestoreDefaultPrompt,
    submitForm: handleSubmit(onSubmit),
  };
}
