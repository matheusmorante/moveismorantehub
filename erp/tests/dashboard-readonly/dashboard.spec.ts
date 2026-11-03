import { chromium, expect, test, type Request, type Route } from '@playwright/test';

// Prova somente de leitura: permite apenas RPCs agregadas de consulta e bloqueia gravações.
test('Dashboard conserva os indicadores e navega entre períodos', async () => {
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || email.toLowerCase() !== 'matheusmorante002@gmail.com' || !password) {
    throw new Error('Credenciais do operador esperado não disponíveis no ambiente Vercel Development.');
  }
  const server = await fetch('http://localhost:5173', { signal: AbortSignal.timeout(10_000) });
  if (!server.ok || !(await server.text()).includes('/@vite/client')) {
    throw new Error('O ERP de desenvolvimento não está disponível na porta 5173.');
  }

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0];
  if (!context) throw new Error('Navegador visível não encontrado.');
  const page = context.pages()[0] || await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  let blockedWrites = 0;
  const blockedWritePaths: string[] = [];
  let measurementPhase: 'off' | 'initial' | 'period-change' = 'off';
  const requestStarts = new Map<Request, { phase: 'initial' | 'period-change'; startedAt: number }>();
  const measurements: Array<{
    phase: 'initial' | 'period-change';
    path: string;
    method: string;
    status: number;
    roundTripMs: number;
    payloadBytes: number;
    rows: number | null;
    contentRange: string | null;
    selection: string | null;
  }> = [];
  const measurementTasks: Promise<void>[] = [];
  const guard = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method());
    const login = request.method() === 'POST' && (url.pathname === '/auth/v1/token'
      || (url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local'));
    const dashboardReadRpcs = new Set([
      'get_dashboard_sales_summary',
      'get_dashboard_orders_by_effective_date',
      'get_dashboard_digital_catalog_metrics',
      'get_dashboard_stalled_products',
      'get_api_usage_dashboard_aggregates',
      'get_dashboard_daily_metrics',
    ]);
    const dashboardRead = request.method() === 'POST'
      && dashboardReadRpcs.has(url.pathname.split('/').at(-1) || '');
    const readOnlyAuthorizationCheck = request.method() === 'POST'
      && (url.pathname === '/api/testing/test-artifact-operator'
        || url.pathname === '/rest/v1/rpc/current_user_has_password');
    if (read || login || dashboardRead || readOnlyAuthorizationCheck) return route.continue();
    blockedWrites++;
    blockedWritePaths.push(`${request.method()} ${url.pathname}`);
    return route.abort('blockedbyclient');
  };
  await context.route('**/*', guard);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (measurementPhase === 'off' || !url.pathname.startsWith('/rest/v1/')) return;
    requestStarts.set(request, { phase: measurementPhase, startedAt: Date.now() });
  });
  page.on('response', (response) => {
    const request = response.request();
    const start = requestStarts.get(request);
    if (!start) return;
    const task = (async () => {
      const body = await response.body().catch(() => Buffer.alloc(0));
      let rows: number | null = null;
      try {
        const value = JSON.parse(body.toString('utf8'));
        if (Array.isArray(value)) rows = value.length;
        else if (value && typeof value === 'object' && Array.isArray(value.data)) rows = value.data.length;
      } catch {
        // Bodies without JSON rows still contribute transfer size and latency.
      }
      measurements.push({
        phase: start.phase,
        path: new URL(request.url()).pathname,
        method: request.method(),
        status: response.status(),
        roundTripMs: Date.now() - start.startedAt,
        payloadBytes: body.byteLength,
        rows,
        contentRange: response.headers()['content-range'] || null,
        selection: new URL(request.url()).searchParams.get('select')?.replace(/\s+/g, ' ').slice(0, 100) ?? null,
      });
      requestStarts.delete(request);
    })();
    measurementTasks.push(task);
  });
  let productAnalyticsRequests = 0;
  let digitalMetricsRequests = 0;
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/rest/v1/product_analytics') productAnalyticsRequests += 1;
    if (pathname === '/rest/v1/rpc/get_dashboard_digital_catalog_metrics') digitalMetricsRequests += 1;
  });

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    const alreadySignedIn = await page.evaluate(async (expected) => {
      const modulePath = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(modulePath);
      const result = await supabase.auth.getUser();
      const matches = result.data.user?.email?.trim().toLowerCase() === expected.toLowerCase();
      if (!matches && result.data.user) await supabase.auth.signOut({ scope: 'local' });
      return matches;
    }, email);
    if (!alreadySignedIn) {
      await page.getByRole('textbox', { name: 'exemplo@email.com' }).fill(email);
      await page.getByRole('textbox', { name: '••••••••' }).fill(password);
      await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
      await page.waitForURL((url) => url.pathname !== '/login', { timeout: 30_000 });
    }
    const operatorMatches = await page.evaluate(async (expected) => {
      const modulePath = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(modulePath);
      const result = await supabase.auth.getUser();
      return result.data.user?.email?.trim().toLowerCase() === expected.toLowerCase();
    }, email);
    expect(operatorMatches, 'A sessão deve pertencer ao operador esperado.').toBe(true);
    const legacyDailyRead = await page.evaluate(async () => {
      const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
      const { data, error } = await supabase.rpc('get_dashboard_daily_metrics', {
        p_start: '2026-10-01', p_end: '2026-11-02',
      });
      return {
        ok: !error,
        code: error?.code ?? null,
        message: error?.message?.slice(0, 160) ?? null,
        rows: Array.isArray(data) ? data.length : 0,
      };
    });
    expect(legacyDailyRead.ok, `RPC legada recusou administrador: ${legacyDailyRead.code} ${legacyDailyRead.message}`).toBe(true);
    expect(legacyDailyRead.rows).toBeGreaterThan(0);

    const initialSummary = page.waitForResponse((response) =>
      response.url().includes('/rest/v1/rpc/get_dashboard_sales_summary') && response.request().method() === 'POST'
    );
    measurementPhase = 'initial';
    const stockRead = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/rest/v1/inventory_moves' && response.request().method() === 'GET'
    );
    const initialUiStartedAt = Date.now();
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#kpi-faturamento h3')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Métricas da Loja Online')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Desempenho de Vendas')).toBeVisible({ timeout: 45_000 });
    const stockResponse = await stockRead;
    expect(stockResponse.ok(), 'A leitura dos movimentos que alimenta os alertas de estoque deve responder.').toBe(true);
    await expect(page.getByText(/Tudo em ordem|Sem Estoque|Estoque Mínimo|Inventário em Andamento/)).toBeVisible();
    await expect(page.getByText('Não foi possível verificar os alertas de estoque e inventário.')).toHaveCount(0);
    await expect(page.getByText('Não foi possível carregar os dados de pedidos do Dashboard.')).toHaveCount(0);
    const initialUiReadyMs = Date.now() - initialUiStartedAt;
    const first = await initialSummary;
    expect(first.ok(), 'O resumo consolidado deve responder para o operador.').toBe(true);
    const firstData = await first.json();
    expect(firstData?.ready, 'O resumo inicial deve estar pronto.').toBe(true);
    await expect.poll(async () => (await page.locator('#kpi-vendas h3').textContent())?.trim())
      .toBe(String(firstData.current.saleCount));
    const normalizedText = (value: string) => value.replace(/\s/g, '');
    const currency = (value: number) => normalizedText(new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL',
    }).format(value));
    expect(normalizedText((await page.locator('#kpi-faturamento h3').textContent()) || '') === currency(firstData.current.totalSales),
      'O faturamento deve coincidir com o consolidado.').toBe(true);
    expect(normalizedText((await page.locator('#kpi-faturamento-trafego-pago h3').textContent()) || '') === currency(firstData.current.paidTrafficSalesValue),
      'O faturamento de tráfego pago deve coincidir com o consolidado.').toBe(true);

    const monthSummary = page.waitForResponse((response) =>
      response.url().includes('/rest/v1/rpc/get_dashboard_sales_summary') && response.request().method() === 'POST'
    );
    measurementPhase = 'period-change';
    const periodChangeStartedAt = Date.now();
    await page.locator('#dashboard-period').selectOption('month');
    const month = await monthSummary;
    expect(month.ok(), 'O resumo do período deve responder.').toBe(true);
    const monthData = await month.json();
    expect(monthData?.ready).toBe(true);
    await expect.poll(async () => (await page.locator('#kpi-vendas h3').textContent())?.trim())
      .toBe(String(monthData.current.saleCount));
    await expect(page.getByText('Métricas da Loja Online')).toBeVisible();
    expect(productAnalyticsRequests, 'Eventos de analytics não devem ser transferidos ao cliente.').toBe(0);
    expect(digitalMetricsRequests, 'A agregação do catálogo deve ser consultada uma vez e reutilizada ao trocar o período.').toBe(1);
    expect(normalizedText((await page.locator('#kpi-faturamento h3').textContent()) || '') === currency(monthData.current.totalSales),
      'O faturamento do mês deve coincidir com o consolidado.').toBe(true);
    expect(normalizedText((await page.locator('#kpi-faturamento-trafego-pago h3').textContent()) || '') === currency(monthData.current.paidTrafficSalesValue),
      'O faturamento de tráfego pago do mês deve coincidir com o consolidado.').toBe(true);
    await expect(page.getByText('Desempenho de Vendas')).toBeVisible();
    const periodChangeUiReadyMs = Date.now() - periodChangeStartedAt;
    expect(blockedWrites, `O Dashboard não deve disparar mutações ou limpeza de rascunhos: ${blockedWritePaths.join(', ')}`).toBe(0);
    await page.waitForTimeout(300);
    await Promise.all(measurementTasks);
    measurementPhase = 'off';
    const orderEndpoints = measurements.filter((entry) =>
      entry.path.includes('/rpc/get_dashboard_orders_by_effective_date')
      || entry.path === '/rest/v1/orders'
      || entry.path === '/rest/v1/order_items'
    );
    const stockEndpoints = measurements.filter((entry) =>
      entry.path === '/rest/v1/product_variations'
      || entry.path === '/rest/v1/inventory_moves'
      || (entry.path === '/rest/v1/products' && entry.selection?.startsWith('id,description,stock,min_stock,'))
    );
    const notificationProductReads = measurements.filter((entry) =>
      entry.path === '/rest/v1/products' && entry.selection === '*'
    );
    const initialDetailedOrderReads = orderEndpoints.filter((entry) =>
      entry.phase === 'initial' && entry.path.includes('/rpc/get_dashboard_orders_by_effective_date')
    );
    expect(initialDetailedOrderReads, 'A carga inicial deve buscar o mesmo período apenas uma vez.').toHaveLength(1);
    const measuredSummary = (phase: 'initial' | 'period-change') => {
      const entries = orderEndpoints.filter((entry) => entry.phase === phase);
      return {
        requests: entries.length,
        returnedRows: entries.reduce((total, entry) => total + (entry.rows ?? 0), 0),
        responseBytes: entries.reduce((total, entry) => total + entry.payloadBytes, 0),
        slowestRoundTripMs: entries.reduce((max, entry) => Math.max(max, entry.roundTripMs), 0),
      };
    };
    const stockSummary = (phase: 'initial' | 'period-change') => {
      const entries = stockEndpoints.filter((entry) => entry.phase === phase);
      return {
        requests: entries.length,
        returnedRows: entries.reduce((total, entry) => total + (entry.rows ?? 0), 0),
        responseBytes: entries.reduce((total, entry) => total + entry.payloadBytes, 0),
        slowestRoundTripMs: entries.reduce((max, entry) => Math.max(max, entry.roundTripMs), 0),
      };
    };
    const notificationProductSummary = (phase: 'initial' | 'period-change') => {
      const entries = notificationProductReads.filter((entry) => entry.phase === phase);
      return {
        requests: entries.length,
        returnedRows: entries.reduce((total, entry) => total + (entry.rows ?? 0), 0),
        responseBytes: entries.reduce((total, entry) => total + entry.payloadBytes, 0),
        slowestRoundTripMs: entries.reduce((max, entry) => Math.max(max, entry.roundTripMs), 0),
      };
    };
    const endpointBreakdown = (entries: typeof measurements, phase: 'initial' | 'period-change') => {
      const groups = new Map<string, typeof measurements>();
      entries.filter((entry) => entry.phase === phase).forEach((entry) => {
        const group = groups.get(entry.path) ?? [];
        group.push(entry);
        groups.set(entry.path, group);
      });
      return Array.from(groups, ([path, rows]) => ({
        path,
        requests: rows.length,
        returnedRows: rows.reduce((total, entry) => total + (entry.rows ?? 0), 0),
        responseBytes: rows.reduce((total, entry) => total + entry.payloadBytes, 0),
        slowestRoundTripMs: rows.reduce((max, entry) => Math.max(max, entry.roundTripMs), 0),
      }));
    };
    console.log('[dashboard-readonly-measurement]', JSON.stringify({
      initialUiReadyMs,
      periodChangeUiReadyMs,
      orderData: {
        initial: measuredSummary('initial'),
        periodChange: measuredSummary('period-change'),
      },
      stockData: {
        initial: stockSummary('initial'),
        periodChange: stockSummary('period-change'),
      },
      notificationProductData: {
        initial: notificationProductSummary('initial'),
        periodChange: notificationProductSummary('period-change'),
      },
      byEndpoint: {
        initial: endpointBreakdown([...orderEndpoints, ...stockEndpoints, ...notificationProductReads], 'initial'),
        periodChange: endpointBreakdown([...orderEndpoints, ...stockEndpoints, ...notificationProductReads], 'period-change'),
      },
      requests: measurements.filter((entry) => orderEndpoints.includes(entry) || stockEndpoints.includes(entry)
        || notificationProductReads.includes(entry))
        .map(({ phase, path, roundTripMs, payloadBytes, rows, contentRange, selection }) => ({
          phase, path, roundTripMs, payloadBytes, rows, contentRange, selection,
        })),
      aggregateRequests: measurements.filter((entry) => entry.phase === 'period-change'
        && entry.path.startsWith('/rest/v1/rpc/')).map(({ path, status, roundTripMs, payloadBytes }) => ({
        path, status, roundTripMs, payloadBytes,
      })),
    }));
  } catch (error) {
    // Uma falha não deve gravar dados comerciais nem credenciais no contexto de erro do runner.
    await page.goto('about:blank').catch(() => undefined);
    throw error;
  } finally {
    await context.unroute('**/*', guard);
    // A janela visível permanece aberta para inspeção; nenhuma credencial é registrada.
  }
});
