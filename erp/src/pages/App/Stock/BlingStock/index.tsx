import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

import { blingService } from '@/pages/services/blingService';
import { BlingProductDetailsModal } from './components/BlingProductDetailsModal';
import { BlingProductTableRow } from './components/BlingProductTableRow';
import type { BlingProductItem } from './types/blingProductItem.types';

const BlingStock: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<BlingProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<BlingProductItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleOAuthCallback(code);
    } else {
      loadProducts();
    }
  }, [page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await blingService.fetchProducts({
        pagina: page,
        limite: 20,
        criterio: 1,
        pesquisa: searchTerm || undefined,
      });
      const pageProducts = data.data || [];
      const reportedTotalPages = Number(
        data.meta?.totalPaginas ?? data.meta?.totalPages ?? data.meta?.total_pages
      );
      const hasReportedTotalPages = Number.isFinite(reportedTotalPages) && reportedTotalPages > 0;

      if (!hasReportedTotalPages && page > 1 && pageProducts.length === 0) {
        setTotalPages(page - 1);
        setPage(page - 1);
        return;
      }

      setProducts(pageProducts);
      setTotalPages(
        hasReportedTotalPages
          ? reportedTotalPages
          : pageProducts.length < 20
            ? page
            : page + 1
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao carregar produtos do Bling.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    const toastId = toast.loading('Conectando ao Bling...');
    try {
      await blingService.exchangeCode(code);
      toast.update(toastId, {
        render: 'Conta Bling conectada com sucesso! 🚀',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      loadProducts();
    } catch (err) {
      toast.update(toastId, {
        render: 'Erro na autenticação. Verifique as credenciais.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Ordenação e Agrupamento
  const sortedProducts = useMemo(() => {
    const productNameMap = new Map();
    products.forEach((p) => productNameMap.set(p.id.toString(), p.nome));

    return [...products].sort((a, b) => {
      const idPaiA = a.idProdutoPai?.toString();
      const idPaiB = b.idProdutoPai?.toString();

      const refNameA = idPaiA ? productNameMap.get(idPaiA) || a.nome : a.nome;
      const refNameB = idPaiB ? productNameMap.get(idPaiB) || b.nome : b.nome;

      if (refNameA !== refNameB) {
        return refNameA.localeCompare(refNameB);
      }

      if (!idPaiA && idPaiB) return -1;
      if (idPaiA && !idPaiB) return 1;

      return a.nome.localeCompare(b.nome);
    });
  }, [products]);

  const handleViewDetail = (product: BlingProductItem) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-reveal">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-premium-lg">
            <i className="bi bi-clouds-fill text-3xl"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">
              Estoque <span className="text-blue-600">Bling</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Página {page} • Sincronização v3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-premium-sm flex items-center gap-4 group focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <i className="bi bi-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
            <input
              type="text"
              placeholder="Pesquisar no Bling..."
              className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 w-48 lg:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  loadProducts();
                }
              }}
            />
          </div>

          <button
            onClick={() => {
              setPage(1);
              loadProducts();
            }}
            disabled={loading}
            className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:shadow-premium-md transition-all active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <i className="bi bi-arrow-clockwise text-xl"></i>
            )}
          </button>

          <FixedPageSlots
            ariaLabel="Paginação dos produtos sincronizados do Bling"
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={loading}
          />
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-premium-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-8 py-6">Produto</th>
              <th className="px-8 py-6 text-center">SKU/Código</th>
              <th className="px-8 py-6 text-center">Saldo / Mínimo</th>
              <th className="px-8 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedProducts.length > 0
              ? sortedProducts.map((product) => {
                  return (
                    <BlingProductTableRow
                      key={product.id}
                      product={product}
                      onViewDetails={handleViewDetail}
                    />
                  );
                })
              : !loading && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <i className="bi bi-inbox text-4xl text-slate-200 mb-4 block"></i>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Nenhum produto encontrado
                      </p>
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {isDetailOpen && selectedProduct && (
        <BlingProductDetailsModal
          product={selectedProduct}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
};

export default BlingStock;
