import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import PersonTable from './PersonTable';
import { usePeople } from '../hooks/usePeople';
import Person, { PersonVisibilitySettings } from '../../../../types/person.type';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { CustomerOrderCountRow } from '../customerOrderCounts';
import {
  buildCustomerOrderMatchFilter,
  calculateCustomerOrderCounts,
  CUSTOMER_ORDER_PAGE_SIZE,
  fetchPaginatedRows,
} from '../customerOrderCounts';
import type { SupplierDeletionCounts } from '../../../../../../../shared-utils/supplierDeletion';

interface PersonListProps {
  onEdit: (person: Person) => void;
  filters?: any;
  visibilitySettings: PersonVisibilitySettings;
  onToggleColumn: (column: keyof PersonVisibilitySettings) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  collectionName: string;
  storageKey: string;
  onViewPurchaseHistory?: (person: Person) => void;
}

export interface PersonListRef {
  refresh: () => void;
}

const PersonList = forwardRef<PersonListRef, PersonListProps>(
  (
    {
      onEdit,
      filters,
      visibilitySettings,
      onToggleColumn,
      onSort,
      collectionName,
      storageKey,
      onViewPurchaseHistory,
    },
    ref
  ) => {
    const [supplierDeletionCounts, setSupplierDeletionCounts] = React.useState<
      Record<string, SupplierDeletionCounts>
    >({});
    const [supplierDeletionCountLoading, setSupplierDeletionCountLoading] = React.useState<
      Record<string, boolean>
    >({});
    const [supplierDeletionCountErrors, setSupplierDeletionCountErrors] = React.useState<
      Record<string, boolean>
    >({});
    const [confirmModal, setConfirmModal] = React.useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      type: 'danger' | 'warning' | 'info';
    }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
      type: 'info',
    });

    const {
      people,
      loading,
      error,
      totalItems,
      currentPage,
      itemsPerPage,
      setCurrentPage,
      setItemsPerPage,
      handleDelete: onDelete,
      handleRestore,
      handlePermanentDelete: onPermanentDelete,
      selectedPeople,
      toggleSelection,
      selectAll,
      clearSelection,
      handleBulkTrash: onBulkTrash,
      handleBulkRestore,
      handleBulkPermanentDelete: onBulkPermanentDelete,
      toggleActive,
      refresh,
    } = usePeople(collectionName, filters);

    const [customerOrderCounts, setCustomerOrderCounts] = React.useState<Record<string, number>>(
      {}
    );

    useEffect(() => {
      let active = true;

      if (collectionName === 'suppliers') {
        const supplierIds = people.map((person) => String(person.id || '')).filter(Boolean);
        if (!supplierIds.length) return;
        setSupplierDeletionCountLoading((current) => ({
          ...current,
          ...Object.fromEntries(supplierIds.map((id) => [id, true])),
        }));
        setSupplierDeletionCountErrors((current) => ({
          ...current,
          ...Object.fromEntries(supplierIds.map((id) => [id, false])),
        }));
        void supabase
          .rpc('get_supplier_deletion_counts', { p_supplier_ids: supplierIds })
          .then(({ data, error }) => {
            if (error) throw error;
            const rows = (data || []) as Array<{
              supplier_id: string;
              product_count: number | string;
              purchase_count: number | string;
              receipt_count: number | string;
              inventory_count: number | string;
              invoice_count: number | string;
              unavailability_count: number | string;
            }>;
            const rowsById = new Map(rows.map((row) => [String(row.supplier_id), row]));
            if (supplierIds.some((id) => !rowsById.has(id))) {
              throw new Error('A consulta de vínculos não retornou todos os fornecedores.');
            }
            if (!active) return;
            setSupplierDeletionCounts((current) => ({
              ...current,
              ...Object.fromEntries(
                rows.map((row) => [
                  String(row.supplier_id),
                  {
                    productCount: Number(row.product_count),
                    purchaseCount: Number(row.purchase_count),
                    receiptCount: Number(row.receipt_count),
                    inventoryCount: Number(row.inventory_count),
                    invoiceCount: Number(row.invoice_count),
                    unavailabilityCount: Number(row.unavailability_count),
                  },
                ])
              ),
            }));
            setSupplierDeletionCountErrors((current) => {
              const next = { ...current };
              supplierIds.forEach((id) => delete next[id]);
              return next;
            });
          })
          .catch((countError) => {
            console.error('Não foi possível verificar os vínculos dos fornecedores:', countError);
            if (active) {
              setSupplierDeletionCountErrors((current) => ({
                ...current,
                ...Object.fromEntries(supplierIds.map((id) => [id, true])),
              }));
            }
          })
          .finally(() => {
            if (active) {
              setSupplierDeletionCountLoading((current) => {
                const next = { ...current };
                supplierIds.forEach((id) => delete next[id]);
                return next;
              });
            }
          });
      }

      if (collectionName === 'customers') {
        const loadCustomerOrderCounts = async () => {
          const customerFilter = buildCustomerOrderMatchFilter(people);
          if (!customerFilter) {
            if (active) setCustomerOrderCounts({});
            return;
          }

          const rows = await fetchPaginatedRows<CustomerOrderCountRow>(
            async (from, to) => {
              const { data, error } = await supabase
                .from('orders')
                .select('id, customer_id, customer_name')
                .or(customerFilter)
                .order('id', { ascending: true })
                .range(from, to);
              return { data, error };
            },
            CUSTOMER_ORDER_PAGE_SIZE,
            () => active
          );

          if (!active) return;
          if (!rows) {
            console.error('Não foi possível carregar os pedidos dos clientes.');
            setCustomerOrderCounts({});
            return;
          }
          setCustomerOrderCounts(calculateCustomerOrderCounts(people, rows));
        };
        void loadCustomerOrderCounts();
      }

      return () => {
        active = false;
      };
    }, [collectionName, people]);

    // Auto-scroll to top when page changes
    React.useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
      scrollContainers.forEach((el) => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, [currentPage]);

    // Wrapped handlers for confirmation
    const handleDelete = (id: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Mover para Lixeira?',
        message:
          'O registro ficará inativo mas poderá ser restaurado futuramente a partir da lixeira.',
        onConfirm: () => onDelete(id),
        type: 'warning',
      });
    };

    const handlePermanentDelete = (id: string) => {
      setConfirmModal({
        isOpen: true,
        title: collectionName === 'suppliers' ? 'Excluir fornecedor?' : 'Excluir Permanentemente?',
        message: collectionName === 'suppliers'
          ? 'A exclusão permanente só é permitida sem produtos, pedidos de compra, recebimentos, inventários registrados, notas fiscais ou indisponibilidades de estoque vinculados. Esta ação não pode ser desfeita.'
          : 'Esta ação não pode ser desfeita. Todos os dados deste registro serão removidos do banco de dados.',
        onConfirm: () => onPermanentDelete(id),
        type: 'danger',
      });
    };

    const handleBulkTrash = () => {
      setConfirmModal({
        isOpen: true,
        title: 'Mover selecionados para Lixeira?',
        message: `Você está prestes a mover ${selectedPeople.length} registro(s) para a lixeira.`,
        onConfirm: () => onBulkTrash(),
        type: 'warning',
      });
    };

    const handleBulkPermanentDelete = () => {
      setConfirmModal({
        isOpen: true,
        title: 'Excluir Permanentemente?',
        message: `Você está prestes a excluir DEFINITIVAMENTE ${selectedPeople.length} registro(s). Esta ação não pode ser desfeita.`,
        onConfirm: () => onBulkPermanentDelete(),
        type: 'danger',
      });
    };

    useImperativeHandle(ref, () => ({
      refresh,
    }));

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            Carregando...
          </p>
        </div>
      );
    }

    if (error && people.length === 0) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="font-bold text-red-600">Não foi possível carregar os registros.</p>
          <button onClick={refresh} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Tentar novamente
          </button>
        </div>
      );
    }

    if (people.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
            <i className="bi bi-person-lines-fill text-4xl text-slate-200 dark:text-slate-800"></i>
          </div>
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 font-bold">
              Nenhum registro encontrado
            </p>
            <p className="text-slate-400 dark:text-slate-600 text-xs">
              Tente ajustar seus filtros ou adicione um novo.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <div
          className={
            collectionName === 'customers' || collectionName === 'suppliers'
              ? 'p-2 sm:p-3 md:p-4'
              : 'p-4 md:p-8'
          }
        >
          <PersonTable
            people={people}
            onEdit={onEdit}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onToggleActive={toggleActive}
            visibilitySettings={visibilitySettings}
            onToggleColumn={onToggleColumn}
            showTrash={filters?.showTrash}
            filters={filters}
            onSort={onSort}
            selectedPeople={selectedPeople}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkTrash={handleBulkTrash}
            onBulkRestore={handleBulkRestore}
            onBulkPermanentDelete={handleBulkPermanentDelete}
            storageKey={storageKey}
            onViewPurchaseHistory={onViewPurchaseHistory}
            collectionName={collectionName}
            supplierDeletionCounts={supplierDeletionCounts}
            supplierDeletionCountLoading={supplierDeletionCountLoading}
            supplierDeletionCountErrors={supplierDeletionCountErrors}
            customerOrderCounts={customerOrderCounts}
          />

          <ERPListPagination
            ariaLabel="Paginação de cadastros"
            page={currentPage}
            pageSize={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            preferenceKey={`people:${collectionName}`}
            loading={loading}
            className="mt-4"
          />
        </div>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
        />
      </div>
    );
  }
);

export default PersonList;
