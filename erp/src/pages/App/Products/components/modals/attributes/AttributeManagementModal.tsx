import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Variations from '../../../../Variations/Index';

export interface AttributeManagementModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly focusAttributeName?: string;
}

/**
 * Modal para gerenciamento completo de atributos e variações globais dentro do cadastro/edição de produtos.
 */
export const AttributeManagementModal: React.FC<AttributeManagementModalProps> = ({
  isOpen,
  onClose,
  focusAttributeName,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10002] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Gerenciamento de Atributos e Variações"
    >
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md cursor-default"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className="relative h-full min-h-0 w-full bg-white shadow-2xl dark:bg-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-300">
        <div className="min-h-0 flex-1 overflow-hidden">
          <Variations focusAttributeName={focusAttributeName} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttributeManagementModal;
