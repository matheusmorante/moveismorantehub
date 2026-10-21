import { chromium, expect, test } from '@playwright/test';

test('login autônomo e consulta da Inbox sem gravações de negócio', async () => {
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development') {
    throw new Error('Execute pela raiz: npm run test:support:readonly, com ambiente Vercel Development.');
  }
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('Credenciais do operador ausentes no ambiente Vercel Development.');
  const development = await fetch('http://localhost:5173', { signal: AbortSignal.timeout(10_000) });
  if (!development.ok || !(await development.text()).includes('/@vite/client')) {
    throw new Error('Inicie o ERP Vite na porta 5173 com strictPort antes do navegador de teste.');
  }

  const verifySlowRefresh = process.env.SUPPORT_READONLY_SLOW_REFRESH === '1';
  const slowSearch = '__central_readonly_sem_resultado_20261021__';
  let exerciseSlowList = false;
  let delayedListRequests = 0;
  let slowListCompleted = false;

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) throw new Error('Navegador visível de desenvolvimento não encontrado.');
  const readOnlyRPCs = new Set([
    'customer_support_list_conversations', 'customer_support_conversation_counts', 'customer_support_list_agents',
    'customer_support_list_customer_summaries', 'customer_support_count_customer_orders',
    'customer_support_can_view', 'customer_support_can_view_commercial_info',
  ]);
  const guard = async (route: import('@playwright/test').Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    const auth = method === 'POST' && (url.pathname === '/auth/v1/token'
      || (url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local'));
    const operator = method === 'POST' && url.origin === 'http://localhost:5173'
      && url.pathname === '/api/testing/test-artifact-operator';
    const rpc = method === 'POST' && url.pathname.startsWith('/rest/v1/rpc/')
      && readOnlyRPCs.has(url.pathname.split('/').pop() || '');
    if (exerciseSlowList && rpc && url.pathname.endsWith('/customer_support_list_conversations')
      && request.postDataJSON()?.p_search === slowSearch) {
      delayedListRequests++;
      if (delayedListRequests === 1) {
        const response = await route.fetch({ timeout: 15_000 });
        await new Promise(resolve => setTimeout(resolve, 8_500));
        exerciseSlowList = false;
        await route.fulfill({ response });
        slowListCompleted = true;
        return;
      }
    }
    if (read || auth || operator || rpc) await route.continue();
    else await route.abort('blockedbyclient');
  };
  await context.route('**/*', guard);
  try {
    await page.goto('http://localhost:5173/login');
    try {
      const sameOperator = await page.evaluate(async (expected) => {
        const modulePath = '/src/pages/utils/supabaseConfig.ts';
        const { supabase } = await import(modulePath);
        const auth = await supabase.auth.getUser();
        const same = !auth.error && auth.data.user?.email?.trim().toLowerCase() === expected.toLowerCase();
        if (!same) await supabase.auth.signOut({ scope: 'local' });
        return same;
      }, email);
      if (!sameOperator) {
        await page.goto('http://localhost:5173/login');
        await page.getByRole('textbox', { name: 'exemplo@email.com' }).fill(email);
        await page.getByRole('textbox', { name: '••••••••' }).fill(password);
        await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 30_000 });
      }
    } catch {
      await page.locator('input[type="email"], input[type="password"]').evaluateAll((inputs) => {
        for (const input of inputs) if (input instanceof HTMLInputElement) input.value = '';
      }).catch(() => undefined);
      throw new Error('O fluxo de login não concluiu. Investigar a sessão sem expor credenciais.');
    }

    const operatorGateStatus = await page.evaluate(async () => {
      const modulePath = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(modulePath);
      const session = await supabase.auth.getSession();
      if (!session.data.session) return 0;
      return (await fetch('/api/testing/test-artifact-operator', {
        method: 'POST', headers: { Authorization: 'Bearer ' + session.data.session.access_token },
      })).status;
    });
    expect(operatorGateStatus, 'A identidade deve passar pelo gate real do operador.').toBe(204);
    await page.goto('http://localhost:5173/atendimento');
    await expect(page.getByText('Pastas compartilhadas', { exact: true })).toBeVisible();
    await expect(page.getByText('Conversas', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: '••••••••' })).toHaveCount(0);

    if (verifySlowRefresh) {
      const list = page.getByRole('region', { name: 'Lista de conversas', exact: true });
      await expect(list.getByText(/^\d+ de \d+ conversas$/)).toBeVisible();
      await page.getByTitle('Alternar campo de busca', { exact: true }).click();
      exerciseSlowList = true;
      await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').fill(slowSearch);
      await expect.poll(() => slowListCompleted, { timeout: 20_000 }).toBe(true);
      expect(delayedListRequests, 'A consulta lenta não pode ser substituída pelos polls de 6s.').toBe(1);
      await expect(list.getByRole('heading', { name: 'Nenhuma conversa encontrada', exact: true })).toBeVisible();
      await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').fill('');
      await expect(list.getByText(/^\d+ de \d+ conversas$/)).toBeVisible();
      test.info().annotations.push({ type: 'slow-refresh', description: 'Resposta remota de leitura retida por 8,5s; um pedido da busca e loading encerrado, sem escritas.' });
    }

    await page.getByRole('button', { name: 'Criar pasta compartilhada', exact: true }).click();
    const folderDialog = page.getByRole('dialog', { name: 'Nova pasta compartilhada' });
    await folderDialog.getByRole('button', { name: 'Criar pasta', exact: true }).click();
    await expect(folderDialog.getByText('O nome deve ter pelo menos 2 caracteres.')).toBeVisible();
    await folderDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(folderDialog).toHaveCount(0);

    const agentSection = page.getByRole('button', { name: 'Atendentes', exact: true }).locator('..');
    const agentButton = agentSection.locator('button[aria-pressed]').first();
    await expect(agentButton).toBeVisible();
    const [agentResponse] = await Promise.all([page.waitForResponse((response) => {
      return response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')
        && Boolean(response.request().postDataJSON()?.p_agent_id);
    }, { timeout: 15_000 }), agentButton.click()]);
    await expect(agentButton).toHaveAttribute('aria-pressed', 'true');
    expect(agentResponse.status()).toBe(200);
    const selectedAgentId = agentResponse.request().postDataJSON().p_agent_id;
    const agentRows = await agentResponse.json();
    expect(Array.isArray(agentRows) && agentRows.every((row: { assigned_to: string }) => row.assigned_to === selectedAgentId)).toBe(true);

    const [resetResponse] = await Promise.all([page.waitForResponse((response) => {
      return response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')
        && response.request().postDataJSON()?.p_agent_id === null;
    }, { timeout: 15_000 }), agentSection.getByRole('button', { pressed: true }).click()]);
    expect(resetResponse.status()).toBe(200);
    const conversationList = page.getByRole('region', { name: 'Lista de conversas', exact: true });
    const count = conversationList.getByText(/^\d+ de \d+ conversas$/);
    await expect(count).toBeVisible();
    const initialCount = (await count.innerText()).match(/^(\d+) de (\d+)/);
    if (initialCount && Number(initialCount[2]) > 50) {
      expect(Number(initialCount[1])).toBe(50);
      const geometry = await conversationList.evaluate((element) => ({
        height: element.clientHeight, content: element.scrollHeight, viewport: window.innerHeight,
      }));
      expect(geometry.height > 0 && geometry.height < geometry.viewport && geometry.content > geometry.height).toBe(true);
      const [secondPage] = await Promise.all([page.waitForResponse((response) => {
        return response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')
          && response.request().postDataJSON()?.p_page === 2;
      }, { timeout: 15_000 }), conversationList.evaluate((element) => { element.scrollTop = element.scrollHeight; })]);
      expect(secondPage.status()).toBe(200);
      await expect(count).toHaveText(`${Math.min(100, Number(initialCount[2]))} de ${initialCount[2]} conversas`);
      test.info().annotations.push({ type: 'pagination', description: 'Segunda página consultada pela rolagem real, sem selecionar conversa.' });
    } else {
      test.info().annotations.push({ type: 'limitation', description: 'Lista real com até 50 conversas; paginação exige fixture controlada.' });
    }

    const anonymousMediaStatus = await page.evaluate(async () => {
      return (await fetch('/api/whatsapp-media?id=12345', { cache: 'no-store' })).status;
    });
    expect(anonymousMediaStatus).toBe(401);
  } finally {
    await context.unroute('**/*', guard);
    // Disconnect this runner; the CLI retains its visible browser and session.
    await browser.close();
  }
});
