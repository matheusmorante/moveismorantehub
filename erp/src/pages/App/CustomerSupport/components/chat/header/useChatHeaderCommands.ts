import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import {
  supportConversationCommandSchema,
  type SupportConversationCommand,
} from '../../../../../../../../shared-utils/customerSupportFormSchemas';
import type { ConversationStatus, AssignedProfileSummary } from '../../types';

interface UseChatHeaderCommandsParams {
  conversationId: string;
  teamMembers: AssignedProfileSummary[];
  currentUserId?: string;
  currentUserName?: string;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<boolean | void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<boolean | void>;
  onToggleArchive: () => Promise<boolean | void> | boolean | void;
  onToggleReadStatus?: () => Promise<boolean | void>;
}

export function useChatHeaderCommands({
  conversationId,
  teamMembers,
  currentUserId,
  currentUserName,
  onAssign,
  onUpdateStatus,
  onToggleArchive,
  onToggleReadStatus,
}: UseChatHeaderCommandsParams) {
  const [isUpdatingReadStatus, setIsUpdatingReadStatus] = useState(false);
  const commandLock = useRef(false);

  const {
    reset,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupportConversationCommand>({
    resolver: zodResolver(supportConversationCommandSchema),
  });

  const submitCommand = async (command: SupportConversationCommand) => {
    if (commandLock.current) return;
    commandLock.current = true;
    reset(command);
    try {
      await handleSubmit(
        async (data) => {
          let saved: boolean | void = false;
          if (data.intent === 'assign' && onAssign) {
            const name =
              teamMembers.find((member) => member.id === data.assigneeId)?.fullName ||
              (data.assigneeId === currentUserId ? currentUserName : undefined);
            saved = await onAssign(data.assigneeId, name);
          } else if (data.intent === 'status' && onUpdateStatus) {
            saved = await onUpdateStatus(data.status);
          } else if (data.intent === 'archive') {
            saved = await onToggleArchive();
          }
          if (saved === false) {
            setError('root.command', {
              message: 'Não foi possível salvar a alteração. Tente novamente.',
            });
          }
        },
        () =>
          setError('root.command', {
            message:
              'Conversa, atendente ou status inválido. Atualize os dados antes de tentar novamente.',
          })
      )();
    } catch {
      setError('root.command', {
        message: 'Não foi possível salvar a alteração. Tente novamente.',
      });
    } finally {
      commandLock.current = false;
    }
  };

  const assign = (assigneeId: string | null) =>
    void submitCommand({ intent: 'assign', conversationId, assigneeId });

  const toggleReadStatus = async () => {
    if (!onToggleReadStatus || isUpdatingReadStatus) return;
    setIsUpdatingReadStatus(true);
    try {
      if ((await onToggleReadStatus()) === false) {
        toast.error('Não foi possível atualizar a leitura interna da conversa.');
      }
    } catch {
      toast.error('Não foi possível atualizar a leitura interna da conversa.');
    } finally {
      setIsUpdatingReadStatus(false);
    }
  };

  return {
    errors,
    isSubmitting,
    submitCommand,
    assign,
    isUpdatingReadStatus,
    toggleReadStatus,
  };
}
