import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { PostCampaign } from '../../types/postCreator';
import { ProductPost, ProductPostFormat, productPostFormatLabel } from '../../types/postSpecification';
import { productPostsService } from '../../services/productPostsService';
import { PostCard } from './PostCard';
import { UploadPostModal } from './UploadPostModal';

interface PostsLibraryPageProps {
  campaigns: PostCampaign[];
  /** Se fornecido, a biblioteca é aberta já filtrada por esse produto. */
  initialProductId?: string;
  initialProductName?: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
}

export function PostsLibraryPage({ campaigns, initialProductId, initialProductName }: PostsLibraryPageProps) {
  const [posts, setPosts] = useState<ProductPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  // Filtros
  const [filterProductId, setFilterProductId] = useState(initialProductId ?? '');
  const [filterProductName, setFilterProductName] = useState(initialProductName ?? '');
  const [filterCampaignId, setFilterCampaignId] = useState('');
  const [filterFormat, setFilterFormat] = useState<ProductPostFormat | ''>('');
  const [productSearch, setProductSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<ProductOption[]>([]);

  // Mapa de nomes
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.name]));

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const results = await productPostsService.listPosts({
        productId: filterProductId || undefined,
        campaignId: filterCampaignId || undefined,
        format: filterFormat || undefined,
      });
      setPosts(results);

      // Carregar nomes dos produtos que ainda não temos
      const missingIds = [...new Set(results.map(p => p.productId))].filter(id => !productNames[id]);
      if (missingIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, title')
          .in('id', missingIds);
        if (data) {
          setProductNames(prev => ({
            ...prev,
            ...Object.fromEntries(data.map((p: any) => [p.id, p.name ?? p.title ?? 'Produto'])),
          }));
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [filterProductId, filterCampaignId, filterFormat, productNames]);

  useEffect(() => { void loadPosts(); }, [filterProductId, filterCampaignId, filterFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchProducts = useCallback(async (query: string): Promise<ProductOption[]> => {
    const { data } = await supabase
      .from('products')
      .select('id, name, title, slug')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .eq('is_draft', false)
      .limit(10);
    return (data ?? []).map((p: any) => ({ id: p.id, name: p.name ?? p.title ?? 'Produto', slug: p.slug ?? '' }));
  }, []);

  const handleProductSearch = async (q: string) => {
    setProductSearch(q);
    if (!q.trim()) { setProductSuggestions([]); return; }
    const results = await handleSearchProducts(q);
    setProductSuggestions(results);
  };

  const handleDelete = async (post: ProductPost) => {
    if (!confirm('Excluir esta arte da Biblioteca? A ação não pode ser desfeita.')) return;
    setDeletingId(post.id);
    try {
      await productPostsService.deletePost(post);
      toast.success('Post removido da Biblioteca.');
      void loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir o post.');
    } finally {
      setDeletingId(undefined);
    }
  };

  const handleDownload = (post: ProductPost) => {
    const link = document.createElement('a');
    link.href = post.imageUrl;
    link.download = `post-${post.format.toLowerCase()}-${post.id.slice(0, 8)}.webp`;
    link.target = '_blank';
    link.click();
  };

  const totalByFormat = {
    feed: posts.filter(p => p.format === 'FEED_4_5').length,
    story: posts.filter(p => p.format === 'STORY_STATUS_9_16').length,
  };

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {/* Busca de produto */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Produto</label>
          {filterProductId ? (
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
              <span className="truncate">{filterProductName}</span>
              <button
                onClick={() => { setFilterProductId(''); setFilterProductName(''); }}
                className="ml-2 text-xs text-slate-400 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={productSearch}
                onChange={e => void handleProductSearch(e.target.value)}
                placeholder="Filtrar por produto..."
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
              />
              {productSuggestions.length > 0 && (
                <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                  {productSuggestions.map(p => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setFilterProductId(p.id);
                          setFilterProductName(p.name);
                          setProductSearch('');
                          setProductSuggestions([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Campanha */}
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Campanha</label>
          <select
            value={filterCampaignId}
            onChange={e => setFilterCampaignId(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {campaigns.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Formato */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Formato</label>
          <select
            value={filterFormat}
            onChange={e => setFilterFormat(e.target.value as ProductPostFormat | '')}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="FEED_4_5">Feed 4:5</option>
            <option value="STORY_STATUS_9_16">Story/Status 9:16</option>
          </select>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          + Adicionar post
        </button>
      </div>

      {/* Resumo */}
      {posts.length > 0 && (
        <div className="flex gap-3 text-xs text-slate-400">
          <span>{posts.length} {posts.length === 1 ? 'arte' : 'artes'} na biblioteca</span>
          {totalByFormat.feed > 0 && <span className="text-indigo-400">· {totalByFormat.feed} Feed 4:5</span>}
          {totalByFormat.story > 0 && <span className="text-purple-400">· {totalByFormat.story} Story/Status 9:16</span>}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span className="ml-3 text-sm">Carregando biblioteca…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-slate-500">
          <span className="text-4xl">🖼️</span>
          <p className="text-sm">Nenhuma arte encontrada</p>
          <p className="text-xs text-slate-600">
            Crie a arte no ChatGPT ou Gemini e adicione aqui via <strong>+ Adicionar post</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              productName={productNames[post.productId]}
              campaignName={post.campaignId ? campaignMap[post.campaignId] : undefined}
              onDelete={p => { if (!deletingId) void handleDelete(p); }}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadPostModal
          campaigns={campaigns}
          preselectedProductId={filterProductId || undefined}
          preselectedProductName={filterProductName || undefined}
          onSearchProducts={handleSearchProducts}
          onClose={() => setUploadOpen(false)}
          onUploaded={loadPosts}
        />
      )}
    </div>
  );
}
