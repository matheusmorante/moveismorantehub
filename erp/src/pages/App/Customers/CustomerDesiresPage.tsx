import React, { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { CustomerDesire } from '../../utils/crmIntelligenceService';

const PAGE_SIZE = 50;

interface PageCursor {
  createdAt: string | null;
  id: string;
}

type CustomerDesireRow = Omit<CustomerDesire, 'id' | 'created_at'> & {
  id: string;
  created_at: string | null;
};

interface MatchWithData {
  id: string;
  created_at: string | null;
  product?: {
    description: string;
  } | null;
  desire?: Pick<CustomerDesire, 'customer_name' | 'customer_phone'> | null;
}

const getNextCursor = <T extends { created_at: string | null; id: string }>(items: T[]) => {
  const lastItem = items[items.length - 1];
  return lastItem ? { createdAt: lastItem.created_at, id: lastItem.id } : null;
};

const applyCursor = <T extends { or: (filter: string) => T }>(
  query: T,
  cursor: PageCursor | null
) => {
  if (!cursor) return query;

  const filter = cursor.createdAt
    ? `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}),created_at.is.null`
    : `and(created_at.is.null,id.lt.${cursor.id})`;

  return query.or(filter);
};

const CustomerDesiresPage = () => {
  const [desires, setDesires] = useState<CustomerDesireRow[]>([]);
  const [matches, setMatches] = useState<MatchWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [desiresCursor, setDesiresCursor] = useState<PageCursor | null>(null);
  const [matchesCursor, setMatchesCursor] = useState<PageCursor | null>(null);
  const [desiresHasMore, setDesiresHasMore] = useState(false);
  const [matchesHasMore, setMatchesHasMore] = useState(false);
  const [loadingMoreDesires, setLoadingMoreDesires] = useState(false);
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);
  const [notifyingMatchId, setNotifyingMatchId] = useState<string | null>(null);
  const [updatingDesireId, setUpdatingDesireId] = useState<string | null>(null);

  const fetchDesiresPage = useCallback(async (cursor: PageCursor | null) => {
    let query = supabase
      .from('customer_desires')
      .select('id,customer_name,customer_phone,product_name,details,status,created_at');
    query = applyCursor(query, cursor)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    const { data, error } = await query;
    if (error) throw error;
    const items = (data || []) as CustomerDesireRow[];
    return { items, cursor: getNextCursor(items), hasMore: items.length === PAGE_SIZE };
  }, []);

  const fetchMatchesPage = useCallback(async (cursor: PageCursor | null) => {
    let query = supabase
      .from('desire_matches')
      .select(
        'id,created_at,product:products(description),desire:customer_desires(customer_name,customer_phone)'
      )
      .eq('notified', false);
    query = applyCursor(query, cursor)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    const { data, error } = await query;
    if (error) throw error;
    const items = (data || []) as MatchWithData[];
    return { items, cursor: getNextCursor(items), hasMore: items.length === PAGE_SIZE };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const desiresPage = await fetchDesiresPage(null);
      setDesires(desiresPage.items);
      setDesiresCursor(desiresPage.cursor);
      setDesiresHasMore(desiresPage.hasMore);

      const matchesPage = await fetchMatchesPage(null);
      setMatches(matchesPage.items);
      setMatchesCursor(matchesPage.cursor);
      setMatchesHasMore(matchesPage.hasMore);
    } catch (err: unknown) {
      console.error('Erro ao carregar lista de desejos:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDesiresPage, fetchMatchesPage]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const loadMoreDesires = async () => {
    if (!desiresHasMore || !desiresCursor || loadingMoreDesires) return;
    setLoadingMoreDesires(true);
    try {
      const page = await fetchDesiresPage(desiresCursor);
      setDesires((current) => [...current, ...page.items]);
      setDesiresCursor(page.cursor);
      setDesiresHasMore(page.hasMore);
    } catch (err: unknown) {
      console.error('Erro ao carregar mais desejos:', err);
    } finally {
      setLoadingMoreDesires(false);
    }
  };

  const loadMoreMatches = async () => {
    if (!matchesHasMore || !matchesCursor || loadingMoreMatches) return;
    setLoadingMoreMatches(true);
    try {
      const page = await fetchMatchesPage(matchesCursor);
      setMatches((current) => [...current, ...page.items]);
      setMatchesCursor(page.cursor);
      setMatchesHasMore(page.hasMore);
    } catch (err: unknown) {
      console.error('Erro ao carregar mais avisos:', err);
    } finally {
      setLoadingMoreMatches(false);
    }
  };

  const markAsNotified = async (matchId: string) => {
    setNotifyingMatchId(matchId);
    try {
      const { data, error } = await supabase
        .from('desire_matches')
        .update({ notified: true })
        .eq('id', matchId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Aviso de desejo não encontrado para atualização.');
      setMatches((current) => current.filter((match) => match.id !== matchId));
    } catch (err: unknown) {
      console.error('Erro ao marcar desejo como notificado:', err);
    } finally {
      setNotifyingMatchId(null);
    }
  };

  const updateDesireStatus = async (desireId: string, status: CustomerDesire['status']) => {
    setUpdatingDesireId(desireId);
    try {
      const { data, error } = await supabase
        .from('customer_desires')
        .update({ status })
        .eq('id', desireId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Desejo não encontrado para atualização.');
      setDesires((current) =>
        current.map((desire) =>
          desire.id === desireId ? { ...desire, status } : desire
        )
      );
    } catch (err: unknown) {
      console.error('Erro ao atualizar status do desejo:', err);
    } finally {
      setUpdatingDesireId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header>
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          🔥 CRM de Desejos
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic">
          Monitore o que seus clientes querem e receba alertas de estoque.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Matches Recentes */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <h2 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-widest text-xs">
            <i className="bi bi-stars"></i> Matches de Estoque
          </h2>

          {loading && matches.length === 0 ? (
            <p className="text-sm text-slate-500" role="status">Carregando avisos...</p>
          ) : matches.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Nenhum match pendente
              </p>
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.id}
                className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white flex flex-col gap-4"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                    Produto em Estoque
                  </span>
                  <h3 className="text-lg font-black leading-tight">{match.product?.description}</h3>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                    Interessado
                  </span>
                  <p className="font-bold">
                    {match.desire?.customer_name || 'Cliente identificado'}
                  </p>
                  <p className="text-xs opacity-90">{match.desire?.customer_phone}</p>
                </div>
                <button
                  onClick={() => markAsNotified(match.id)}
                  disabled={notifyingMatchId !== null}
                  className="w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-colors"
                >
                  {notifyingMatchId === match.id ? 'Atualizando...' : 'Marcar como Notificado'}
                </button>
              </div>
            ))
          )}
          {matchesHasMore && (
            <button
              type="button"
              onClick={() => void loadMoreMatches()}
              disabled={loading || loadingMoreMatches}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-blue-600 disabled:opacity-60"
            >
              {loadingMoreMatches ? 'Carregando...' : 'Carregar mais avisos'}
            </button>
          )}
        </div>

        {/* Lista de Desejos */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">
            Lista Geral de Desejos
          </h2>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th
                    scope="col"
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Produto Desejado
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {loading && desires.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-6 text-sm text-slate-500" role="status">
                      Carregando desejos...
                    </td>
                  </tr>
                ) : desires.map((desire) => (
                  <tr
                    key={desire.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {desire.customer_name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-400">{desire.customer_phone}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">
                        {desire.product_name}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        {desire.details || 'Sem detalhes informados'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          desire.status === 'pending'
                            ? 'bg-amber-100 text-amber-600'
                            : desire.status === 'notified'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {desire.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={desire.status}
                        disabled={updatingDesireId === desire.id}
                        aria-label={`Atualizar status do desejo de ${desire.customer_name || 'cliente'}`}
                        onChange={(e) =>
                          void updateDesireStatus(
                            desire.id,
                            e.target.value as CustomerDesire['status']
                          )
                        }
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-blue-600 focus:ring-0 cursor-pointer"
                      >
                        <option value="pending">Pendente</option>
                        <option value="notified">Notificado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {desiresHasMore && (
              <button
                type="button"
                onClick={() => void loadMoreDesires()}
                disabled={loading || loadingMoreDesires}
                className="w-full border-t border-slate-100 px-4 py-3 text-sm font-bold text-blue-600 disabled:opacity-60"
              >
                {loadingMoreDesires ? 'Carregando...' : 'Carregar mais desejos'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDesiresPage;
