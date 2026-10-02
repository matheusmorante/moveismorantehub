import { CheckCircle2, FilterX, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import {
  fetchStockUnavailabilities,
  STOCK_UNAVAILABILITIES_PAGE_SIZE,
  type StockUnavailability,
  type UnavailabilityProductKindFilter,
  type UnavailabilityStatusFilter,
  undoStockUnavailability,
} from '@/pages/utils/stockUnavailabilityService';
import LabelPrint from './LabelPrint';
import PhotoPreviewModal from './modals/PhotoPreviewModal';
import UnavailabilityFormModal from './modals/UnavailabilityFormModal';

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
  const [selectedPhotosItem, setSelectedPhotosItem] = useState<StockUnavailability | null>(null);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchStockUnavailabilities({
        page: currentPage,
        status: statusFilter,
        productKind: productKindFilter,
        id: id && id !== 'undefined' && id.trim() !== '' ? id : undefined,
      });
      setUnavailabilities(result.data);
      setTotalCount(result.totalCount);

      if (id && id !== 'undefined' && id.trim() !== '') {
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
            type="button"
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
            <option value="salvado">Salvados</option>
            <option value="usado">Usados</option>
          </select>
        </label>
      </div>

      {/* Estado vazio para estoque sem indisponibilidades cadastradas */}
      {!isLoading && totalCount === 0 && statusFilter === 'all' && productKindFilter === 'all' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center my-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Nenhuma indisponibilidade registrada
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            O estoque está 100% liberado. Não há itens com avarias, defeitos ou bloqueios de saída
            no momento.
          </p>
          {canManageStock && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm"
            >
              <Plus size={18} />
              Nova indisponibilidade
            </button>
          )}
        </div>
      ) : (
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
                  <td className="p-8 text-center text-gray-500" colSpan={9}>
                    Carregando indisponibilidades…
                  </td>
                </tr>
              ) : unavailabilities.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-gray-500" colSpan={9}>
                    <p className="font-medium text-gray-700 mb-2">
                      Nenhum registro encontrado para os filtros selecionados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setProductKindFilter('all');
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <FilterX size={16} />
                      Limpar filtros
                    </button>
                  </td>
                </tr>
              ) : (
                unavailabilities.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.products?.name || 'Produto'}
                      </div>
                      {item.product_variations?.name && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.product_variations.name}
                          {item.product_variations.sku ? ` (${item.product_variations.sku})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {item.products?.product_kind === 'salvado'
                        ? 'Salvados'
                        : item.products?.product_kind === 'usado'
                          ? 'Usados'
                          : 'Normal'}
                    </td>
                    <td className="px-4 py-2">{item.suppliers?.fantasy_name || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="text-slate-800 dark:text-slate-100 font-medium">
                        {item.reason} / {item.treatment}
                      </div>
                      {item.observation && (
                        <div
                          className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs"
                          title={item.observation}
                        >
                          Obs: {item.observation}
                        </div>
                      )}
                      {item.photos && item.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotosItem(item)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold mt-0.5"
                        >
                          📷 {item.photos.length} foto(s)
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">{item.physical_location}</td>
                    <td className="px-4 py-2 text-red-600 font-bold">-{item.quantity}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          item.status === 'active'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.status === 'active' ? 'Ativa' : 'Desfeita'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center flex gap-2 justify-center">
                      {canManageStock && item.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => void handleUndo(item.id)}
                          className="text-gray-500 hover:text-red-600 text-xs font-medium"
                        >
                          Desfazer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLabelItem(item)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        Imprimir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && totalCount > 0 && (
        <nav
          aria-label="Paginação de indisponibilidades"
          className="flex items-center justify-between gap-3 py-4 text-sm text-gray-600"
        >
          <span>
            Exibindo {(currentPage - 1) * STOCK_UNAVAILABILITIES_PAGE_SIZE + 1}–
            {Math.min(currentPage * STOCK_UNAVAILABILITIES_PAGE_SIZE, totalCount)} de {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={isLoading || currentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
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
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </nav>
      )}

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
      {selectedPhotosItem && (
        <PhotoPreviewModal item={selectedPhotosItem} onClose={() => setSelectedPhotosItem(null)} />
      )}
    </div>
  );
}
