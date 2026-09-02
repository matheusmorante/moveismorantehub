import { useState, useEffect, useCallback } from 'react';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import {
  toggleMobileProductCatalog,
  toggleMobileProductActive,
  deleteMobileProduct,
  saveMobileProduct,
} from '../services/mobileProductMutationService';

const ITEMS_PER_PAGE = 30;

export function useMobileProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadProducts = useCallback(async (pull = false, page = currentPage) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const { data, total } = await fetchMobileProductsPage(page, ITEMS_PER_PAGE, {
        search: searchTerm,
        statusFilter,
        category: categoryFilter || undefined,
      });
      setProducts(data);
      setTotalItems(total);
    } catch (err) {
      console.warn('[useMobileProducts] Erro ao carregar:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    loadProducts(false, currentPage);
  }, [currentPage, loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const handleToggleCatalog = async (productId: string, currentStatus: string, isVar = false, varId?: string) => {
    try {
      const next = await toggleMobileProductCatalog(productId, currentStatus, isVar, varId);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          if (isVar && varId) {
            const nextVars = (p.allVariations || []).map((v: any) => v.id === varId ? { ...v, status: next } : v);
            return { ...p, allVariations: nextVars };
          }
          return { ...p, status: next };
        }
        return p;
      }));
    } catch (err) {
      console.warn('Erro ao alterar catálogo:', err);
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    try {
      const next = await toggleMobileProductActive(productId, currentActive);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, active: next } : p));
    } catch (err) {
      console.warn('Erro ao alternar ativo:', err);
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteMobileProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setTotalItems(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Erro ao excluir:', err);
    }
  };

  const handleSave = async (productData: any) => {
    await saveMobileProduct(productData);
    loadProducts(false, 1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  return {
    products,
    loading,
    refreshing,
    searchTerm,
    statusFilter,
    categoryFilter,
    currentPage,
    totalItems,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    setSearchTerm,
    setStatusFilter,
    setCategoryFilter,
    setCurrentPage,
    refresh: () => loadProducts(true),
    handleToggleCatalog,
    handleToggleActive,
    handleDelete,
    handleSave,
  };
}
