import React from 'react';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import { QuickSnippetsModal } from '../QuickSnippetsModal';
import { ForwardMessageDialog } from './ForwardMessageDialog';

interface ChatAreaModalsProps {
  isSnippetsModalOpen: boolean;
  setIsSnippetsModalOpen: (open: boolean) => void;
  handleInsertSnippet: (snippet: { id: number; title: string; content: string }) => void;
  forwardMessage: WhatsAppMessage | null;
  setForwardMessage: (message: WhatsAppMessage | null) => void;
  canSend: boolean;
  onSelectConversation?: (conversation: WhatsAppConversation) => void;
}

export const ChatAreaModals: React.FC<ChatAreaModalsProps> = ({
  isSnippetsModalOpen,
  setIsSnippetsModalOpen,
  handleInsertSnippet,
  forwardMessage,
  setForwardMessage,
  canSend,
  onSelectConversation,
}) => {
  return (
    <>
      {/* Modal de Respostas Rápidas & Snippets */}
      <QuickSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        onSelect={handleInsertSnippet}
      />

      {forwardMessage && (
        <ForwardMessageDialog
          message={forwardMessage}
          canSend={canSend}
          onClose={() => setForwardMessage(null)}
          onSelectConversation={(target) => {
            onSelectConversation?.(target);
            setForwardMessage(null);
          }}
        />
      )}
    </>
  );
};
