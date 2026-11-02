import React, { useRef, useState } from 'react';
import Person from '../../../../types/person.type';
import DropdownPortal from '../../../../../components/shared/DropdownPortal';
import SupplierDeleteMenuItem from './SupplierDeleteMenuItem';
import type { SupplierDeletionCounts } from '../../../../../../../shared-utils/supplierDeletion';

interface PersonCardActionsMenuProps {
  readonly person: Person;
  readonly onEdit: (person: Person) => void;
  readonly onDelete: (id: string) => void;
  readonly onRestore: (id: string) => void;
  readonly onPermanentDelete: (id: string) => void;
  readonly onViewPurchaseHistory?: (person: Person) => void;
  readonly showTrash?: boolean;
  readonly supplierDeletionCounts?: SupplierDeletionCounts;
  readonly supplierDeletionCountLoading?: boolean;
  readonly supplierDeletionCountError?: boolean;
}

const PersonCardActionsMenu = ({
  person,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onViewPurchaseHistory,
  showTrash,
  supplierDeletionCounts,
  supplierDeletionCountLoading,
  supplierDeletionCountError,
}: PersonCardActionsMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const isSupplier = person.type === 'suppliers';
  const hasActions = showTrash || person.type !== 'employees' || Boolean(onViewPurchaseHistory);

  if (!hasActions) return null;

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={menuAnchorRef}
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className={`flex items-center justify-center transition-colors shrink-0 ${
          person.type === 'customers' ? 'w-7 h-7' : 'w-8 h-8'
        } ${
          isMenuOpen
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title="Mais Ações"
      >
        <i className="bi bi-three-dots text-xs" />
      </button>

      <DropdownPortal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        anchorRef={menuAnchorRef}
        className="min-w-[190px]"
      >
        <div
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          {showTrash ? (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen(false);
                  onRestore(person.id!);
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
              >
                <i className="bi bi-arrow-counterclockwise text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Restaurar
                </span>
              </button>
              {isSupplier ? (
                <SupplierDeleteMenuItem
                  counts={supplierDeletionCounts}
                  loading={supplierDeletionCountLoading}
                  error={supplierDeletionCountError}
                  onDelete={() => {
                    setIsMenuOpen(false);
                    onPermanentDelete(person.id!);
                  }}
                />
              ) : (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    onPermanentDelete(person.id!);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                >
                  <i className="bi bi-trash3-fill text-red-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                    Excluir Permanentemente
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              {person.type !== 'employees' && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit(person);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
                >
                  <i className="bi bi-pencil-fill text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    Editar
                  </span>
                </button>
              )}

              {onViewPurchaseHistory && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    onViewPurchaseHistory(person);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
                >
                  <i className="bi bi-bag-check-fill text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    Histórico de Pedidos
                  </span>
                </button>
              )}

              {isSupplier ? (
                <SupplierDeleteMenuItem
                  counts={supplierDeletionCounts}
                  loading={supplierDeletionCountLoading}
                  error={supplierDeletionCountError}
                  onDelete={() => {
                    setIsMenuOpen(false);
                    onPermanentDelete(person.id!);
                  }}
                />
              ) : (
                person.type !== 'employees' && (
                  <>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen(false);
                        import('../../../../utils/whatsapp').then(
                          ({ sendDirectPersonGroupInviteMessage }) => {
                            sendDirectPersonGroupInviteMessage(person);
                          }
                        );
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group"
                    >
                      <i className="bi bi-person-lines-fill text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                        Enviar Convite VIP
                      </span>
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen(false);
                        onDelete(person.id!);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                    >
                      <i className="bi bi-trash-fill text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                        Mover para Lixeira
                      </span>
                    </button>
                  </>
                )
              )}
            </>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default PersonCardActionsMenu;
