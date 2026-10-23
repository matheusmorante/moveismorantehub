import { chromium, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  const verifyReadReceipt = process.env.SUPPORT_READONLY_READ_RECEIPT === '1';
  if (verifyReadReceipt) test.setTimeout(90_000);
  const verifyPhoneCopy = process.env.SUPPORT_READONLY_COPY_PHONE === '1';
  const verifyOrdersPanel = process.env.SUPPORT_READONLY_ORDERS_PANEL === '1';
  const verifySnippets = process.env.SUPPORT_READONLY_SNIPPETS === '1';
  const verifyMobileLayout = process.env.SUPPORT_READONLY_MOBILE_LAYOUT === '1';
  const verifyMissedReadRecovery = process.env.SUPPORT_READONLY_MISSED_READ === '1';
  if (verifyPhoneCopy && !verifyReadReceipt) throw new Error('A prova de cópia exige a conversa própria retida e suas guardas de leitura.');
  if (verifyOrdersPanel && !verifyReadReceipt) throw new Error('A prova de pedidos exige a conversa própria retida e suas guardas de leitura.');
  if (verifySnippets && !verifyReadReceipt) throw new Error('A prova dos modelos exige a conversa própria retida e suas guardas de leitura.');
  if (verifyMobileLayout && !verifyReadReceipt) throw new Error('A prova em tela pequena exige o histórico próprio retido e suas guardas de leitura.');
  if (verifyMissedReadRecovery && !verifyReadReceipt) throw new Error('A recuperação de leitura exige o histórico próprio e suas guardas de leitura.');
  const retainedManifest = verifyReadReceipt
    ? JSON.parse(readFileSync(resolve(process.env.SUPPORT_REOPENING_MANIFEST || ''), 'utf8')) : null;
  if (verifyReadReceipt && (retainedManifest?.projectRef !== 'hkoxhourxwlddgsfdgws'
    || retainedManifest.runId !== '8eaed14f-364d-47ab-be41-66be54b3fb65'
    || retainedManifest.ownerId !== '13eab361-be48-4e49-be4b-4ad79813b812'
    || retainedManifest.cleanupCompleted !== true)) throw new Error('Manifesto de leitura retido não confirmado.');
  const slowSearch = '__central_readonly_sem_resultado_20261021__';
  let exerciseSlowList = false;
  let delayedListRequests = 0;
  let slowListCompleted = false;
  let rejectedReadWrites = 0;
  let customerOrderRequests = 0;
  let clipboardGranted = false;
  let failFolderReads = false;
  let rejectedFolderReads = 0;
  let failAgentReads = false;
  let rejectedAgentReads = 0;
  let agentDirectoryReads = 0;
  let directoryReadsAfterRetry = 0;
  let ownedReadConversationId: string | null = null;
  let simulateReadAcknowledgement = false;
  let simulatedReadAcknowledgements = 0;

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) throw new Error('Navegador visível de desenvolvimento não encontrado.');
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(15_000);
  const readOnlyRPCs = new Set([
    'customer_support_list_conversations', 'customer_support_conversation_counts', 'customer_support_list_agents',
    'customer_support_list_customer_summaries', 'customer_support_count_customer_orders',
    'customer_support_can_view', 'customer_support_can_view_commercial_info',
    'customer_support_test_fixture_manifest',
  ]);
  const guard = async (route: import('@playwright/test').Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'POST' && url.pathname === '/rest/v1/rpc/customer_support_list_agents') {
      agentDirectoryReads++;
      if (failAgentReads) {
        rejectedAgentReads++;
        await route.fulfill({ status: 403, contentType: 'application/json',
          body: JSON.stringify({ code: '42501', message: 'SUPPORT_TEST_AGENT_READ_DENIED' }) });
        return;
      }
    }
    if (verifyMissedReadRecovery && simulateReadAcknowledgement && ownedReadConversationId
      && method === 'PATCH' && url.pathname === '/rest/v1/whatsapp_conversations'
      && url.searchParams.get('id') === `eq.${ownedReadConversationId}`
      && url.searchParams.get('unread_count') === 'gt.0'
      && JSON.stringify(request.postDataJSON()) === JSON.stringify({ unread_count: 0 })) {
      simulateReadAcknowledgement = false;
      simulatedReadAcknowledgements++;
      await route.fulfill({ status: 204 });
      return;
    }
    if (failFolderReads && method === 'GET' && url.pathname === '/rest/v1/customer_support_inboxes') {
      rejectedFolderReads++;
      await route.fulfill({ status: 403, contentType: 'application/json',
        body: JSON.stringify({ code: '42501', message: 'SUPPORT_TEST_FOLDER_READ_DENIED' }) });
      return;
    }
    if (url.pathname === '/rest/v1/rpc/customer_support_list_customer_orders') customerOrderRequests++;
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
    else {
      if (verifyReadReceipt && method === 'PATCH' && url.pathname === '/rest/v1/whatsapp_conversations') rejectedReadWrites++;
      await route.abort('blockedbyclient');
    }
  };
  await context.route('**/*', guard);
  try {
    if (verifyOrdersPanel) await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
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
        await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
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
    console.info('[support-readonly] Identidade e gate do operador confirmados.');
    failFolderReads = true;
    failAgentReads = true;
    await page.goto('http://localhost:5173/atendimento');
    await expect(page.getByText('Pastas compartilhadas', { exact: true })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar as pastas. Tente atualizar.', { exact: true })).toBeVisible();
    await expect(page.getByText('Nenhuma pasta nesta aba.', { exact: true })).toHaveCount(0);
    expect(rejectedFolderReads).toBeGreaterThan(0);
    failFolderReads = false;
    const [folderRetry] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/rest/v1/customer_support_inboxes'
        && response.request().method() === 'GET'),
      page.getByRole('button', { name: 'Tentar carregar pastas novamente', exact: true }).click(),
    ]);
    expect(folderRetry.status()).toBe(200);
    await expect(page.getByText('Não foi possível carregar as pastas. Tente atualizar.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Carregando pastas...', { exact: true })).toHaveCount(0);
    console.info('[support-readonly] Falha de pastas simulada e recuperação por consulta remota confirmadas.');
    await expect(page.getByText('Não foi possível carregar os atendentes. Tente novamente.', { exact: true })).toBeVisible();
    await expect(page.getByText('Nenhum atendente autorizado encontrado.', { exact: true })).toHaveCount(0);
    expect(rejectedAgentReads).toBeGreaterThan(0);
    failAgentReads = false;
    const [directoryRetry] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/rest/v1/rpc/customer_support_list_agents'
        && response.request().method() === 'POST'),
      page.getByRole('button', { name: 'Tentar carregar atendentes novamente', exact: true }).click(),
    ]);
    expect(directoryRetry.status()).toBe(200);
    await expect(page.getByText('Não foi possível carregar os atendentes. Tente novamente.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Carregando atendentes...', { exact: true })).toHaveCount(0);
    directoryReadsAfterRetry = agentDirectoryReads;
    console.info('[support-readonly] Falha do diretório simulada e recuperação remota dos atendentes confirmadas.');
    await expect(page.getByText('Conversas', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: '••••••••' })).toHaveCount(0);
    console.info('[support-readonly] Inbox carregada sem formulário de credenciais.');

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
    console.info('[support-readonly] Validação de pasta sem gravação concluída.');

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
    console.info('[support-readonly] Consulta restrita por atendente confirmada.');

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

    if (verifyReadReceipt) {
      console.info('[support-readonly] Conferindo ownership do histórico próprio retido.');
      const ownFixture = await page.evaluate(async manifest => {
        const path = '/src/pages/utils/supabaseConfig.ts'; const { supabase } = await import(path);
        const user = await supabase.auth.getUser();
        if (user.data.user?.id !== manifest.ownerId) return null;
        const remote = await supabase.rpc('customer_support_test_fixture_manifest', { p_run_id: manifest.runId });
        if (remote.error || remote.data.ownerId !== manifest.ownerId
          || JSON.stringify([...remote.data.conversationIds].sort()) !== JSON.stringify([...manifest.conversationIds].sort())) return null;
        const rows = await supabase.from('whatsapp_conversations').select('id, contact_name, contact_phone, unread_count, customer_id, business_phone_number_id, is_archived').in('id', manifest.conversationIds);
        if (rows.error || !rows.data.every((row: { customer_id: string | null; business_phone_number_id: string; is_archived: boolean }) =>
          row.customer_id === null && row.business_phone_number_id === `test-artifact:${manifest.runId}` && row.is_archived)) return null;
        return rows.data.find((row: { unread_count: number }) => row.unread_count > 0) || null;
      }, retainedManifest);
      expect(ownFixture, 'A prova usa somente conversa própria arquivada e com não lidas; não cria massa.').toBeTruthy();
      ownedReadConversationId = ownFixture!.id;
      const searchToggle = page.getByTitle('Alternar campo de busca', { exact: true });
      if (!await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').isVisible()) await searchToggle.click();
      await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').fill(ownFixture!.contact_name);
      await page.getByRole('button', { name: /^[^A-Za-z]*All[^A-Za-z]*$/ }).click();
      await page.getByRole('button', { name: /Closed \(Fechadas\)/ }).click();
      await page.getByRole('region', { name: 'Lista de conversas', exact: true }).getByText(ownFixture!.contact_name, { exact: true }).click();
      await expect(page.getByText('Não foi possível confirmar a leitura. Atualize a conversa para tentar novamente.', { exact: true })).toBeVisible();
      const history = page.getByRole('region', { name: 'Histórico da conversa', exact: true });
      await expect(history.locator('[data-message-id]').first()).toBeVisible();
      expect(agentDirectoryReads, 'Abrir o chat deve reutilizar o diretório já carregado pela Inbox.').toBe(directoryReadsAfterRetry);
      for (const title of [
        'Emojis',
        'Gravar áudio',
        'Anexar arquivo',
        'Inserir Variável / Tag',
        'Canal WhatsApp',
        'Assistente de IA / Respostas Inteligentes',
        'Expandir editor',
      ]) {
        await expect(page.getByRole('button').and(page.getByTitle(title, { exact: true }))).toHaveCount(0);
      }
      await expect(page.getByText('Whatsapp', { exact: true })).toBeVisible();
      await expect(page.getByTitle('Modelos Rápidos / Snippets', { exact: true })).toBeVisible();
      await expect(page.getByTitle('O envio de mensagens para o cliente está bloqueado pela política da empresa', { exact: true })).toBeDisabled();
      await expect(page.getByText('Envio bloqueado pela política da empresa', { exact: true })).toBeVisible();
      expect(rejectedReadWrites).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Recarregar mensagens', exact: true }).click();
      await expect.poll(() => rejectedReadWrites).toBeGreaterThan(1);
      await expect(page.getByText('Não foi possível confirmar a leitura. Atualize a conversa para tentar novamente.', { exact: true })).toBeVisible();
      test.info().annotations.push({ type: 'read-receipt-refused', description: 'Histórico próprio retido renderizado; PATCH bloqueado antes do banco, erro de leitura visível e nova tentativa também bloqueada.' });
      console.info('[support-readonly] Histórico próprio e recusa de gravação confirmados.');
      if (verifyMissedReadRecovery) {
        const refusedBeforeRecovery = rejectedReadWrites;
        simulateReadAcknowledgement = true;
        await page.getByRole('button', { name: 'Recarregar mensagens', exact: true }).click();
        await expect.poll(() => simulatedReadAcknowledgements).toBe(1);
        const readError = page.getByText('Não foi possível confirmar a leitura. Atualize a conversa para tentar novamente.', { exact: true });
        await expect(readError).toHaveCount(0);
        // The database was not written: its next normal list poll still reports unread messages.
        await expect.poll(() => rejectedReadWrites, { timeout: 15_000 }).toBeGreaterThan(refusedBeforeRecovery);
        await expect(readError).toBeVisible();
        test.info().annotations.push({ type: 'missed-realtime-read', description: 'Um ACK de leitura foi simulado somente no navegador da fixture com ownership comprovado; nenhum PATCH foi enviado ao banco. A lista remota real voltou a informar não lidas, sem novo INSERT, e a UI tentou confirmar leitura novamente (tentativa bloqueada).' });
        console.info('[support-readonly] Recuperação de leitura por atualização da lista confirmada, sem escritas.');
      }
      if (verifyOrdersPanel) {
        await page.getByRole('button', { name: 'Painel de informações do cliente', exact: true }).click();
        const panel = page.locator('aside').filter({ has: page.getByRole('heading', { name: /Informações Comerciais/ }) });
        await expect(panel).toBeVisible();
        await panel.getByRole('button', { name: /^Pedidos/ }).click();
        await expect(panel.getByText('Vincule um cliente à conversa para visualizar seus pedidos de venda.', { exact: true })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Tentar carregar pedidos novamente', exact: true })).toHaveCount(0);
        expect(customerOrderRequests, 'Conversa própria sem cliente não pode consultar pedidos comerciais.').toBe(0);
        await panel.getByRole('button', { name: 'Fechar painel', exact: true }).click();
        await expect(panel).toHaveCount(0);
        test.info().annotations.push({ type: 'orders-panel-unlinked', description: 'Painel e aba Pedidos abertos pela UI na conversa própria sem cliente; zero consultas comerciais e zero escritas. Erro/retry comercial coberto somente em RTL.' });
      }
      if (verifySnippets) {
        const pixText = 'Olá! Para orientar seu pagamento via PIX, vou conferir as instruções oficiais vinculadas ao seu pedido. Aguarde a confirmação dos dados antes de realizar a transferência.';
        await page.bringToFront();
        await context.grantPermissions(['clipboard-write'], { origin: 'http://localhost:5173' });
        clipboardGranted = true;
        await page.getByTitle('Modelos Rápidos / Snippets', { exact: true }).click();
        const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Orientação de Pagamento via PIX', exact: true }) });
        await expect(dialog.getByText(pixText, { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: /Copiar/ }).first().click();
        await expect(page.getByText('Modelo "Orientação de Pagamento via PIX" copiado para a área de transferência.', { exact: true })).toBeVisible();
        console.info('[support-readonly] Cópia nativa do modelo público confirmada pela UI.');
        await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        test.info().annotations.push({ type: 'neutral-snippet-copy', description: 'Modelo público neutro aberto e writeText nativo confirmado pela UI; argumento e ausência de nota conferidos em RTL. Conteúdo do clipboard do sistema não relido. Todas as escritas de negócio bloqueadas.' });
      }
      if (verifyPhoneCopy) {
        await page.bringToFront();
        await context.grantPermissions(['clipboard-write'], { origin: 'http://localhost:5173' });
        clipboardGranted = true;
        await page.getByTitle('Mais opções da conversa', { exact: true }).click();
        await page.getByRole('button', { name: /Copiar telefone/ }).click();
        await expect(page.getByText('Telefone copiado para a área de transferência.', { exact: true })).toBeVisible();
        test.info().annotations.push({ type: 'copy-own-phone', description: 'writeText nativo confirmado pela UI usando somente telefone sintético próprio; argumento coberto em RTL, conteúdo do sistema não relido. Sem mensagens ou notas.' });
      }
    }

    if (verifyMobileLayout) {
      const previousViewport = page.viewportSize();
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        const history = page.getByRole('region', { name: 'Histórico da conversa', exact: true });
        const list = page.getByRole('region', { name: 'Lista de conversas', exact: true });
        await expect(history).toBeVisible();
        await expect(list).toBeHidden();
        const bounds = await history.boundingBox();
        expect(bounds).toBeTruthy();
        expect(bounds!.x).toBeGreaterThanOrEqual(-1);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
        await expect(page.getByPlaceholder('O envio para o cliente está desativado pela política da empresa.', { exact: true })).toBeDisabled();
        if (verifyOrdersPanel) {
          await page.getByRole('button', { name: 'Painel de informações do cliente', exact: true }).click();
          const panel = page.locator('aside').filter({ has: page.getByRole('heading', { name: /Informações Comerciais/ }) });
          await expect(panel).toBeVisible();
          const panelBounds = await panel.boundingBox();
          expect(panelBounds).toBeTruthy();
          expect(panelBounds!.x).toBeGreaterThanOrEqual(-1);
          expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(391);
          await panel.getByRole('button', { name: 'Fechar painel', exact: true }).click();
          await expect(panel).toHaveCount(0);
        }
        await page.getByRole('button', { name: 'Voltar para a lista', exact: true }).click();
        await expect(list).toBeVisible();
        await expect(history).toHaveCount(0);
        test.info().annotations.push({ type: 'small-screen-readonly', description: 'Viewport Chromium 390x844: histórico próprio cabe na largura, lista oculta com chat aberto, voltar reexibe lista e envio permanece bloqueado. Não é dispositivo nativo nem prova offline.' });
        console.info('[support-readonly] Navegação lista/chat em 390x844 confirmada sem escritas.');
      } finally {
        if (previousViewport) await page.setViewportSize(previousViewport);
      }
    }

    const anonymousMediaStatus = await page.evaluate(async () => {
      return (await fetch('/api/whatsapp-media?id=12345', { cache: 'no-store' })).status;
    });
    expect(anonymousMediaStatus).toBe(401);
  } finally {
    if (clipboardGranted) {
      await test.step('Limpar a área de transferência da prova própria', () =>
        page.evaluate(() => navigator.clipboard.writeText('')), { timeout: 3_000 }).catch(() => undefined);
      await context.clearPermissions();
    }
    // Stop the app before releasing the write guard; the visible browser stays open.
    await page.goto('about:blank');
    await context.unroute('**/*', guard);
    // Disconnect this runner; the CLI retains its visible browser and session.
    await browser.close();
  }
});
