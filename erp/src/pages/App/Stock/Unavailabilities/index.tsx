import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import UnavailabilityFormModal from './UnavailabilityFormModal';
import LabelPrint from './LabelPrint';
import {
  fetchStockUnavailabilities,
  STOCK_UNAVAILABILITIES_PAGE_SIZE,
  StockUnavailability,
  UnavailabilityProductKindFilter,
  UnavailabilityStatusFilter,
  undoStockUnavailability,
} from '@/pages/utils/stockUnavailabilityService';

export default function UnavailabilitiesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManageStock = canPerform('manualStockMovement', profile?.roles || profile?.role);
  const [unavailabilities, setUnavailabilities] = useState<StockUnavailability[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<UnavailabilityStatusFilter>('all');
  const [productKindFilter, setProductKindFilter] =
    useState<UnavailabilityProductKindFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [labelItem, setLabelItem] = useState<StockUnavailability | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchStockUnavailabilities({
        page: currentPage,
        status: statusFilter,
        productKind: productKindFilter,
        id,
      });
      setUnavailabilities(result.data);
      setTotalCount(result.totalCount);

      if (id) {
        const found = result.data.find((item) => item.id === id);
        if (found) setLabelItem(found);
        else toast.error('Indisponibilidade não encontrada.');
      }
    } catch (error) {
      console.error('Erro ao buscar indisponibilidades:', error);
      toast.error('Erro ao carregar indisponibilidades.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, id, productKindFilter, statusFilter]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const handleUndo = async (unavailabilityId: string) => {
    if (!canManageStock || !window.confirm('Desfazer esta indisponibilidade?')) return;
    try {
      await undoStockUnavailability(unavailabilityId);
      toast.success('Indisponibilidade desfeita.');
      await fetchPage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desfazer indisponibilidade.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / STOCK_UNAVAILABILITIES_PAGE_SIZE));

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Indisponibilidades</h1>
        {canManageStock && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Nova indisponibilidade
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as UnavailabilityStatusFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="active">Ativas</option>
            <option value="cancelled">Desfeitas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo do produto
          <select
            aria-label="Filtrar por tipo do produto"
            value={productKindFilter}
            onChange={(event) => {
              setProductKindFilter(event.target.value as UnavailabilityProductKindFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="normal">Normal</option>
            <option value="salvado">Salvado</option>
          </select>
        </label>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Produto / Variação</th>
              <th className="px-4 py-2">Origem</th>
              <th className="px-4 py-2">Fornecedor</th>
              <th className="px-4 py-2">Motivo/Tratativa</th>
              <th className="px-4 py-2">Local</th>
              <th className="px-4 py-2">Qtd</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-4 text-center" colSpan={9}>
                  Carregando indisponibilidades…
                </td>
              </tr>
            ) : unavailabilities.length === 0 ? (
              <tr>
                <td className="p-4 text-center" colSpan={9}>
                  Nenhuma indisponibilidade encontrada.
                </td>
              </tr>
            ) : (
              unavailabilities.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-2">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {item.product_variations?.name || item.products?.name}
                  </td>
                  <td className="px-4 py-2">
                    {item.products?.product_kind === 'salvado' ? 'Salvado' : 'Normal'}
                  </td>
                  <td className="px-4 py-2">{item.suppliers?.fantasy_name || '-'}</td>
                  <td className="px-4 py-2">
                    {item.reason} / {item.treatment}
                  </td>
                  <td className="px-4 py-2">{item.physical_location}</td>
                  <td className="px-4 py-2 text-red-600 font-bold">-{item.quantity}</td>
                  <td className="px-4 py-2">{item.status === 'active' ? 'Ativa' : 'Desfeita'}</td>
                  <td className="px-4 py-2 text-center flex gap-2 justify-center">
                    {canManageStock && item.status === 'active' && (
                      <button onClick={() => void handleUndo(item.id)} className="text-gray-500">
                        Desfazer
                      </button>
                    )}
                    <button onClick={() => setLabelItem(item)} className="text-blue-500">
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Paginação de indisponibilidades"
        className="flex items-center justify-between gap-3 py-4"
      >
        <span>
          Exibindo {totalCount === 0 ? 0 : (currentPage - 1) * STOCK_UNAVAILABILITIES_PAGE_SIZE + 1}
          –{Math.min(currentPage * STOCK_UNAVAILABILITIES_PAGE_SIZE, totalCount)} de {totalCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={isLoading || currentPage <= 1}
            onClick={() => setCurrentPage((page) => page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={isLoading || currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            Próxima
          </button>
        </div>
      </nav>

      <UnavailabilityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          void fetchPage();
        }}
      />
      {labelItem && (
        <LabelPrint
          item={labelItem}
          onClose={() => {
            setLabelItem(null);
            if (id) navigate('/estoque/indisponibilidades', { replace: true });
          }}
        />
      )}
    </div>
  );
}
