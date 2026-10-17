import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { postLibraryFilterFormSchema, postDeleteFormSchema, postDownloadFormSchema } from '../../../../../../../../shared-utils/marketingFormSchemas';
import { submittedSearchFormSchema } from '../../../../../../../../shared-utils/lookupFormSchemas';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { PostCampaign } from '../../types/postCreator';
import {
  ProductPost,
  ProductPostFormat,
} from '../../types/postSpecification';
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

export function PostsLibraryPage({
  campaigns,
  initialProductId,
  initialProductName,
}: PostsLibraryPageProps) {
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
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));

  const [errorMessage, setErrorMessage] = useState('');
  const [cleanupPending, setCleanupPending] = useState<ProductPost[]>([]);
  const active = useRef(true), deleting = useRef(false), uncertain = useRef(new Set<string>());
  const { user } = useAuth();
  const actor = useRef({ id: user?.id });
  if (actor.current.id !== user?.id) actor.current = { id: user?.id };
  const source = useRef({ actor: actor.current, productId: filterProductId, campaignId: filterCampaignId, format: filterFormat });
  if (source.current.actor !== actor.current || source.current.productId !== filterProductId || source.current.campaignId !== filterCampaignId || source.current.format !== filterFormat) source.current = { actor: actor.current, productId: filterProductId, campaignId: filterCampaignId, format: filterFormat };
  const querySequence = useRef(0), searchSequence = useRef(0);
  const postsSource = useRef(posts), namesSource = useRef(productNames), cleanupSource = useRef(cleanupPending);
  postsSource.current = posts; namesSource.current = productNames; cleanupSource.current = cleanupPending;
  const { enqueueAndRun: queryPosts } = useZodForm(postLibraryFilterFormSchema, { productId: filterProductId, campaignId: filterCampaignId, format: filterFormat });
  const { enqueueAndRun: searchProducts } = useZodForm(submittedSearchFormSchema, { search: productSearch });
  const deleteForm = useZodForm(postDeleteFormSchema, { id: '', productId: '', imageStoragePath: '' });
  const downloadForm = useZodForm(postDownloadFormSchema, { id: '', format: 'FEED_4_5', imageUrl: '' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setFilterProductId(initialProductId || ''); setFilterProductName(initialProductName || ''); setUploadOpen(false); setProductSuggestions([]); setProductSearch(''); }, [initialProductId, initialProductName]);
  useEffect(() => { setPosts([]); setProductNames({}); setCleanupPending([]); setErrorMessage(''); }, [user?.id]);
  const loadPosts = useCallback(async () => {
    if (!user?.id) { setLoading(false); setErrorMessage('Aguarde a confirmação da sessão.'); return false; }
    const sequence = ++querySequence.current, scope = source.current;
    const current = () => active.current && source.current === scope && sequence === querySequence.current;
    setLoading(true);
    try {
      return await queryPosts({ productId: filterProductId, campaignId: filterCampaignId, format: filterFormat }, async (values) => {
        if (!current()) return false;
        const results = await withTimeout(productPostsService.listPosts({ productId: values.productId || undefined, campaignId: values.campaignId || undefined, format: values.format || undefined }), 15_000, null, 'Consultar biblioteca de posts');
        if (!current()) return false;
        if (!Array.isArray(results)) throw new Error('A consulta da biblioteca não foi confirmada. Tente novamente.');
        setPosts(results); setErrorMessage('');
        const missingIds = [...new Set(results.map((post) => post.productId))].filter((id) => !namesSource.current[id]);
        if (missingIds.length) {
          const names = await withTimeout(supabase.from('products').select('id, name, description').in('id', missingIds), 15_000, null, 'Nomes dos produtos da biblioteca');
          if (!current()) return false;
          if (names?.data) setProductNames((previous) => ({ ...previous, ...Object.fromEntries(names.data.map((product: any) => [product.id, product.name ?? product.description ?? 'Produto'])) }));
        }
        return true;
      }, (errors) => { if (current()) setErrorMessage(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) { if (current()) { const message = error instanceof Error ? error.message : 'Erro ao carregar a biblioteca.'; setErrorMessage(message); toast.error(message); } return false; }
    finally { if (current()) setLoading(false); }
  }, [filterProductId, filterCampaignId, filterFormat, queryPosts, user?.id]);
  const latestLoad = useRef(loadPosts); latestLoad.current = loadPosts;
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const handleSearchProducts = useCallback(async (query: string): Promise<ProductOption[]> => {
    const scope = actor.current;
    if (!scope.id) throw new Error('Aguarde a confirmação da sessão.');
    const current = () => active.current && actor.current === scope;
    const results = await searchProducts({ search: query }, async (values) => {
      if (!current()) return [];
      const result = await withTimeout(supabase.from('products').select('id, name, description, slug').ilike('name', '%' + values.search + '%').eq('is_draft', false).limit(10), 15_000, null, 'Buscar produto da biblioteca');
      if (!current()) return [];
      if (!result || result.error || !Array.isArray(result.data)) throw new Error('A busca de produtos não foi confirmada. Tente novamente.');
      return result.data.map((product: any) => ({ id: product.id, name: product.name ?? product.description ?? 'Produto', slug: product.slug ?? '' }));
    }, (errors) => { if (current()) setErrorMessage(Object.values(flattenFormErrors(errors))[0]); });
    return results || [];
  }, [searchProducts]);
  const handleProductSearch = async (query: string) => {
    const sequence = ++searchSequence.current, scope = actor.current;
    setProductSearch(query); setProductSuggestions([]);
    if (!query.trim()) return;
    try { const results = await handleSearchProducts(query); if (active.current && actor.current === scope && sequence === searchSequence.current) setProductSuggestions(results); }
    catch (error) { if (active.current && actor.current === scope && sequence === searchSequence.current) setErrorMessage(error instanceof Error ? error.message : 'Erro ao buscar produto.'); }
  };

  const handleDelete = async (post: ProductPost) => {
    if (deleting.current) return;
    if (!user?.id) { setErrorMessage('Aguarde a confirmação da sessão.'); return; }
    if (uncertain.current.has(post.id)) { setErrorMessage('Há uma exclusão sem confirmação. Confira a biblioteca antes de repetir.'); return; }
    deleting.current = true; setDeletingId(post.id); setErrorMessage('');
    const scope = actor.current, current = () => active.current && actor.current === scope;
    try {
      await deleteForm.validateAndRun({ ...post }, async (values) => {
        const cleanup = cleanupSource.current.find((item) => item.id === values.id);
        const selected = cleanup || postsSource.current.find((item) => item.id === values.id);
        if (!selected || selected.productId !== values.productId || selected.imageStoragePath !== values.imageStoragePath) throw new Error('A arte selecionada mudou. Atualize a biblioteca.');
        if (!cleanup && !confirm('Excluir esta arte da Biblioteca? A ação não pode ser desfeita.')) return false;
        await productPostsService.deletePost(values as unknown as ProductPost, { recordAlreadyDeleted: Boolean(cleanup), isCurrent: current });
        if (!current()) return false;
        setCleanupPending((previous) => previous.filter((item) => item.id !== values.id));
        setPosts((previous) => previous.filter((item) => item.id !== values.id));
        toast.success('Post removido da Biblioteca.'); await latestLoad.current(); return true;
      }, (errors) => { if (current()) setErrorMessage(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (error && typeof error === 'object' && 'recordDeleted' in error && error.recordDeleted && current()) {
        setCleanupPending((previous) => previous.some((item) => item.id === post.id) ? previous : [...previous, post]);
        setPosts((previous) => previous.filter((item) => item.id !== post.id));
      } else if (error && typeof error === 'object' && 'uncertain' in error && error.uncertain) uncertain.current.add(post.id);
      if (current()) { const message = error instanceof Error ? error.message : 'Erro ao excluir a arte.'; setErrorMessage(message); toast.error(message); }
    } finally { deleting.current = false; if (active.current) setDeletingId(undefined); }
  };
  const handleDownload = async (post: ProductPost) => downloadForm.validateAndRun(post, (values) => {
    const link = document.createElement('a'); link.href = values.imageUrl; link.download = 'post-' + values.format.toLowerCase() + '-' + values.id.slice(0, 8) + '.webp'; link.target = '_blank'; link.rel = 'noopener'; link.click();
  }, (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));

  const totalByFormat = { feed: posts.filter((post) => post.format === 'FEED_4_5').length, story: posts.filter((post) => post.format === 'STORY_STATUS_9_16').length };

  return (
    <div className="space-y-5">
      {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
      {loading && <p role="status">Consultando biblioteca de posts...</p>}
      {errorMessage && !deletingId && <button type="button" onClick={() => void loadPosts()}>Tentar atualizar biblioteca</button>}
      {deletingId && <p role="status">Confirmando exclusão da arte...</p>}
      {cleanupPending.map((post) => <button type="button" key={post.id} disabled={Boolean(deletingId)} onClick={() => void handleDelete(post)}>Tentar limpar arquivo pendente</button>)}
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {/* Busca de produto */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Produto</label>
          {filterProductId ? (
            <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
              <span className="truncate">{filterProductName}</span>
              <button
                onClick={() => {
                  setFilterProductId('');
                  setFilterProductName('');
                }}
                className="ml-2 text-xs text-slate-400 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={productSearch}
                onChange={(e) => void handleProductSearch(e.target.value)}
                placeholder="Filtrar por produto..."
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
              />
              {productSuggestions.length > 0 && (
                <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                  {productSuggestions.map((p) => (
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
            aria-label="Filtrar campanha"
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {campaigns
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        {/* Formato */}
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Formato</label>
          <select
            aria-label="Filtrar formato"
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value as ProductPostFormat | '')}
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
          <span>
            {posts.length} {posts.length === 1 ? 'arte' : 'artes'} na biblioteca
          </span>
          {totalByFormat.feed > 0 && (
            <span className="text-indigo-400">· {totalByFormat.feed} Feed 4:5</span>
          )}
          {totalByFormat.story > 0 && (
            <span className="text-purple-400">· {totalByFormat.story} Story/Status 9:16</span>
          )}
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
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              productName={productNames[post.productId]}
              campaignName={post.campaignId ? campaignMap[post.campaignId] : undefined}
              onDelete={(p) => {
                if (!deletingId) void handleDelete(p);
              }}
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
