import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

type Agent = {
  id: string;
  name: string;
  last_seen_at: string | null;
  mine: boolean;
};

const agentApi = '/api/label-print-agents';
const REMOTE_AGENT_LIST_REFRESH_INTERVAL_MS = 30_000;
const localAgent = 'http://127.0.0.1:40405';
type LocalAgentState = 'checking' | 'offline' | 'ready' | 'paired';

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');
  return data.session.access_token;
}

async function responseJson(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Não foi possível concluir a ação.');
  return body;
}

function makeToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const LabelPrintAgentPanel: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [localState, setLocalState] = useState<LocalAgentState>('checking');
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');
  const agentListVersion = useRef(0);
  const mobile = window.location.pathname === '/mobile/etiquetas' ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

  const refresh = useCallback(async () => {
    if (mobile) return;
    const version = agentListVersion.current;
    try {
      const token = await accessToken();
      const data = await responseJson(await fetch(agentApi, { headers: { Authorization: `Bearer ${token}` } }));
      if (version !== agentListVersion.current) return;
      setAgents(Array.isArray(data.agents) ? data.agents : []);
      setMessage('');
    } catch (error) {
      if (version === agentListVersion.current) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível consultar as estações.');
      }
    } finally {
      if (version === agentListVersion.current) setLoading(false);
    }
  }, [mobile]);

  useEffect(() => {
    if (mobile) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), REMOTE_AGENT_LIST_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [mobile, refresh]);

  useEffect(() => {
    if (mobile) return;
    let active = true;
    const checkLocal = async () => {
      try {
        const response = await fetch(`${localAgent}/health`, { signal: AbortSignal.timeout(4_000) });
        const health = response.ok ? await response.json() : null;
        if (active) setLocalState(health?.paired ? 'paired' : response.ok ? 'ready' : 'offline');
      } catch {
        if (active) setLocalState('offline');
      }
    };
    void checkLocal();
    const timer = window.setInterval(() => void checkLocal(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mobile]);

  const pairStation = async () => {
    if (pairing) return;
    setPairing(true);
    setMessage('');
    let id = '';
    let token = '';
    try {
      const healthResponse = await fetch(`${localAgent}/health`, { signal: AbortSignal.timeout(4_000) });
      if (!healthResponse.ok) throw new Error('Não encontrei o agente neste computador. Inicie o agente de impressão e tente novamente.');
      const health = await healthResponse.json();
      if (health.paired) throw new Error('Este computador já está conectado à fila de impressão.');
      token = makeToken();
      id = crypto.randomUUID();
      const sessionToken = await accessToken();
      await responseJson(await fetch(agentApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ action: 'pair', id, name: 'Estação de impressão', tokenHash: await sha256(token), origin: window.location.origin }),
      }));

      try {
        const pairResponse = await fetch(`${localAgent}/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: id, token, apiBaseUrl: `${window.location.origin}/api` }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!pairResponse.ok) throw new Error('O agente recusou o pareamento desta estação.');
        setLocalState('paired');
        setMessage('Estação conectada. Ela imprimirá automaticamente quando receber uma tarefa.');
      } catch (error) {
        await fetch(agentApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'revoke', id }),
        }).catch(() => undefined);
        throw error;
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível conectar a estação.');
    } finally {
      token = '';
      setPairing(false);
    }
  };

  const revoke = async (id: string) => {
    setWorkingId(id);
    setMessage('');
    try {
      const token = await accessToken();
      await responseJson(await fetch(agentApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'revoke', id }),
      }));
      agentListVersion.current += 1;
      setAgents((current) => current.filter((agent) => agent.id !== id));
      setMessage('Estação desconectada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível desconectar a estação.');
    } finally {
      setWorkingId('');
    }
  };

  if (mobile) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-4" aria-label="Estação de impressão">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Impressão direta</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Conecte este computador para imprimir sem abrir PDF ou janela de impressão.
          </p>
        </div>
        <button type="button" onClick={() => void pairStation()} disabled={pairing || localState === 'checking' || localState === 'offline' || localState === 'paired'}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60">
          {pairing ? 'Conectando…' : localState === 'paired' ? 'Estação conectada' : localState === 'offline' ? 'Agente não detectado' : 'Conectar esta estação'}
        </button>
      </div>
      {loading ? <p role="status" className="mt-2 text-xs text-slate-500">Consultando estações…</p> : null}
      {localState === 'offline' && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">Inicie o agente no computador da loja para conectá-lo à impressora.</p>}
      {agents.length > 0 && (
        <ul className="mt-3 space-y-2">
          {agents.map((agent) => {
            const online = Boolean(agent.last_seen_at && Date.now() - new Date(agent.last_seen_at).getTime() < 60_000);
            return (
              <li key={agent.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{agent.name}{agent.mine ? ' (esta conta)' : ''} · {online ? 'online' : 'offline'}</span>
                {agent.mine && <button type="button" onClick={() => void revoke(agent.id)} disabled={workingId === agent.id}
                  className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50">Desconectar</button>}
              </li>
            );
          })}
        </ul>
      )}
      {message && <p role="status" className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
    </section>
  );
};
