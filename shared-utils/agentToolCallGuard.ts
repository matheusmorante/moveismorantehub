const READ_ONLY_AGENT_TOOLS = new Set([
  'buscarCategoriasFinanceiras',
  'buscarContasAPagar',
  'buscarContasAReceber',
  'buscarMovimentacoesFinanceiras',
  'obterResumoFinanceiro',
  'buscarOperacoes',
  'obterDetalhesOperacao',
  'buscarPedidosEntregas',
  'obterDetalhesPedidoEntrega',
  'buscarClientes',
  'buscarColaboradores',
  'buscarProdutos',
  'obterDetalhesProduto',
  'listarCategoriasECaracteristicasProduto',
  'consultarMeusPedidos',
  'calcularFreteOuDistancia',
  'obterInformacoesComerciaisLoja',
]);

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)])
  );
};

export const canonicalizeAgentToolArguments = (args: unknown): string =>
  JSON.stringify(stableValue(args ?? {}));

export interface AgentToolCallGuardResult<T> {
  status: 'executed' | 'cached' | 'limit';
  value?: T;
}

/** Per-turn idempotency and call budget for assistant tool loops. */
export const createAgentToolCallGuard = (maxUniqueCalls = 8) => {
  const results = new Map<string, { value?: unknown; error?: unknown; readOnly: boolean }>();
  let uniqueCalls = 0;

  return {
    get uniqueCallCount() {
      return uniqueCalls;
    },

    async run<T>(
      name: string,
      args: unknown,
      execute: () => Promise<T>
    ): Promise<AgentToolCallGuardResult<T>> {
      const key = `${name}:${canonicalizeAgentToolArguments(args)}`;
      const cached = results.get(key);
      if (cached) {
        if (cached.error !== undefined) throw cached.error;
        return { status: 'cached', value: cached.value as T };
      }

      if (uniqueCalls >= maxUniqueCalls) return { status: 'limit' };

      const readOnly = READ_ONLY_AGENT_TOOLS.has(name);
      if (!readOnly) {
        // A mutation may invalidate a prior lookup, while its own idempotency
        // entry remains so duplicate model calls cannot repeat the write.
        for (const [cachedKey, entry] of results) {
          if (entry.readOnly) results.delete(cachedKey);
        }
      }

      uniqueCalls += 1;
      try {
        const value = await execute();
        results.set(key, { value, readOnly });
        return { status: 'executed', value };
      } catch (error) {
        results.set(key, { error, readOnly });
        throw error;
      }
    },
  };
};
