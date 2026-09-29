'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  filterPublicCatalogSuggestions,
  isCatalogSearchLongEnough,
  MAX_PRODUCT_SEARCH_SUGGESTIONS,
  orderCatalogSearchResultsByIds,
} from '@/features/products/product-search-suggestions';

export function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchParam = searchParams.get('search') || '';

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(currentSearchParam);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(currentSearchParam);
  }, [currentSearchParam]);

  // Sugestões
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    environments: any[];
    categories: any[];
    products: any[];
  }>({ environments: [], categories: [], products: [] });

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Fecha sugestões ao clicar fora do container de busca
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalização de texto sem acentos, sem hífens e minúsculo
  const normalizeText = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-_/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Caching local de categorias para busca instantânea sem acento
  const [allDbCategories, setAllDbCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadAllCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, type')
        .order('name');
      if (data) setAllDbCategories(data);
    }
    loadAllCategories();
  }, []);

  // Busca sugestões em tempo real ao digitar (Debounce)
  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || !isCatalogSearchLongEnough(trimmed)) {
      setSuggestions({ environments: [], categories: [], products: [] });
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    setShowSuggestions(true);
    let isCurrent = true;

    const timer = setTimeout(async () => {
      try {
        const cleanQuery = normalizeText(trimmed);
        const queryTokens = cleanQuery.split(' ').filter((token) => token.length >= 2);

        const getSynonyms = (token: string): string[] => {
          if (/^(roupa|roupas|guarda|roupeiro|roupeiros)$/.test(token)) {
            return ['roupa', 'roupas', 'guarda', 'roupeiro', 'roupeiros'];
          }
          if (/^(sofa|sofas|estofado|estofados)$/.test(token)) {
            return ['sofa', 'sofas', 'estofado', 'estofados'];
          }
          if (/^(colchao|colchoes|espuma|molas)$/.test(token)) {
            return ['colchao', 'colchoes'];
          }
          if (/^(cama|camas|box|sommier)$/.test(token)) {
            return ['cama', 'camas', 'box'];
          }
          if (/^(mesa|mesas)$/.test(token)) {
            return ['mesa', 'mesas'];
          }
          if (/^(painel|paineis|rack|racks)$/.test(token)) {
            return ['painel', 'paineis', 'rack', 'racks'];
          }
          return [token];
        };

        // 1. Filtrar Ambientes e Categorias localmente (insensível a acentos e hífens)
        const matched = allDbCategories.filter((c) => {
          const cleanCatName = normalizeText(c.name);
          return queryTokens.every((token) => {
            const synonyms = getSynonyms(token);
            return synonyms.some((syn) => cleanCatName.includes(syn));
          });
        });
        const environments = matched.filter((c) => c.type === 'environment').slice(0, 5);
        const categories = matched.filter((c) => c.type === 'category').slice(0, 5);

        // Sugestões usam a mesma busca do catálogo, com a página limitada a cinco.
        const { data: searchRows, error: prodErr } = await supabase.rpc(
          'search_catalog_product_page',
          {
            p_search: trimmed,
            p_category_ids: null,
            p_environment_category_ids: null,
            p_type: 'all',
            p_min_price: 0,
            p_max_price: 10000,
            p_page: 1,
            p_page_size: MAX_PRODUCT_SEARCH_SUGGESTIONS,
            p_sort_by: 'newest',
          }
        );
        if (prodErr) throw prodErr;

        const orderedIds = (searchRows || []).map((row: { product_id: string }) => row.product_id);
        let products: any[] = [];
        if (orderedIds.length > 0) {
          const { data: prodData, error: detailsError } = await supabase
            .from('products')
            .select(
              'id, name, price, promo_price, slug, status, deleted_at, product_images(image_url, is_main), product_variations(status)'
            )
            .eq('status', 'published')
            .is('deleted_at', null)
            .in('id', orderedIds);
          if (detailsError) throw detailsError;

          const filtered = filterPublicCatalogSuggestions(
            orderCatalogSearchResultsByIds(prodData || [], orderedIds)
          );
          products = filtered.map((p: any) => {
            const mainImg =
              p.product_images?.find((img: any) => img.is_main)?.image_url ||
              p.product_images?.[0]?.image_url ||
              '';
            return {
              id: p.id,
              name: p.name,
              price: p.price,
              promo_price: p.promo_price,
              slug: p.slug,
              image: mainImg,
            };
          });
        }

        if (isCurrent) {
          setSuggestions({
            environments,
            categories,
            products,
          });
        }
      } catch (err) {
        if (isCurrent) console.error('Erro ao buscar sugestões:', err);
      } finally {
        if (isCurrent) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, allDbCategories]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // Reseta filtros de ambiente e categoria anteriores para busca ampla
    router.push(`/?search=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    setShowSuggestions(false);
  }

  function close() {
    setIsOpen(false);
    setQuery('');
    setShowSuggestions(false);
  }

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    inputRef,
    searchContainerRef,
    submit,
    close,
    showSuggestions,
    setShowSuggestions,
    loadingSuggestions,
    suggestions,
  };
}
