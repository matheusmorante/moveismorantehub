import { chromium, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
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

  if (process.env.SUPPORT_READONLY_SECURE_API_IMPORT === '1') {
    const response = await fetch('http://localhost:3000/api/meta-graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    });
    expect([401, 503], 'A rota ESM deve carregar e rejeitar a chamada sem sessão ou token de integração.').toContain(response.status);
  }

  const verifySlowRefresh = process.env.SUPPORT_READONLY_SLOW_REFRESH === '1';
  const verifyReadReceipt = process.env.SUPPORT_READONLY_READ_RECEIPT === '1';
  if (verifyReadReceipt) test.setTimeout(90_000);
  const verifyPhoneCopy = process.env.SUPPORT_READONLY_COPY_PHONE === '1';
  const verifyOrdersPanel = process.env.SUPPORT_READONLY_ORDERS_PANEL === '1';
  const verifySnippets = process.env.SUPPORT_READONLY_SNIPPETS === '1';
  const verifyHistoryPanels = process.env.SUPPORT_READONLY_HISTORY_PANELS === '1';
  const verifyMessageSearch = process.env.SUPPORT_READONLY_MESSAGE_SEARCH === '1';
  const verifyMessagePaging = process.env.SUPPORT_READONLY_MESSAGE_PAGING === '1';
  const verifyMobileLayout = process.env.SUPPORT_READONLY_MOBILE_LAYOUT === '1';
  const verifyMissedReadRecovery = process.env.SUPPORT_READONLY_MISSED_READ === '1';
  const verifyProductionMetaConnection = process.env.SUPPORT_READONLY_META_PRODUCTION_CONNECTION === '1';
  const verifyProductionMetaCredentialsOnly = process.env.SUPPORT_READONLY_META_CREDENTIALS_ONLY === '1';
  const verifyProductionSignedWebhook = process.env.SUPPORT_READONLY_META_PRODUCTION_SIGNED_WEBHOOK === '1';
  const verifyProductionWabaSubscription = process.env.SUPPORT_READONLY_META_WABA_SUBSCRIPTION === '1';
  if (verifyProductionSignedWebhook || verifyProductionWabaSubscription) test.setTimeout(90_000);
  if (verifyPhoneCopy && !verifyReadReceipt) throw new Error('A prova de cópia exige a conversa própria retida e suas guardas de leitura.');
  if (verifyOrdersPanel && !verifyReadReceipt) throw new Error('A prova de pedidos exige a conversa própria retida e suas guardas de leitura.');
  if (verifySnippets && !verifyReadReceipt) throw new Error('A prova dos modelos exige a conversa própria retida e suas guardas de leitura.');
  if (verifyHistoryPanels && !verifyReadReceipt) throw new Error('Timeline e galeria exigem a conversa própria retida e suas guardas de leitura.');
  if (verifyMessageSearch && !verifyReadReceipt) throw new Error('A busca exige a conversa própria retida e suas guardas de leitura.');
  if (verifyMessagePaging && !verifyReadReceipt) throw new Error('A paginação de mensagens exige a conversa própria retida e suas guardas de leitura.');
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
  let ownedReadConversationId: string | null = null;
  let simulateMessagePaging = false;
  let syntheticOlderMessageRequests = 0;
  let simulateReadAcknowledgement = false;
  let simulatedReadAcknowledgements = 0;

  const launchBrowser = process.env.SUPPORT_READONLY_LAUNCH_BROWSER === '1';
  const browser = launchBrowser
    ? await chromium.launch({ channel: 'chrome', headless: false })
    : await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = launchBrowser ? await browser.newContext() : browser.contexts()[0];
  if (!context) throw new Error('Navegador visível de desenvolvimento não encontrado.');
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.setViewportSize({ width: 1280, height: 800 });
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
    // shortcut: intercept pages instead of inserting rows; use a separately approved fixture for database paging.
    if (verifyMessagePaging && simulateMessagePaging && ownedReadConversationId
      && method === 'GET' && url.pathname === '/rest/v1/whatsapp_messages'
      && url.searchParams.get('conversation_id') === `eq.${ownedReadConversationId}`) {
      const message = (sequence: number) => {
        const timestamp = new Date(Date.UTC(2026, 9, 23, 12, sequence, 0)).toISOString();
        return { id: `support-readonly-paging-${sequence.toString().padStart(3, '0')}`,
          conversation_id: ownedReadConversationId, api_message_id: null, direction: 'inbound', message_type: 'text',
          text_content: `Mensagem sintética ${sequence}`, media_id: null, media_mime_type: null, media_url: null,
          media_filename: null, media_caption: null, reply_to_message_id: null, reply_to_wamid: null, status: 'received',
          error_code: null, failure_reason: null, raw_payload: {}, timestamp, created_at: timestamp };
      };
      if (url.searchParams.get('limit') === '80' && !url.searchParams.has('or')) {
        const latest = Array.from({ length: 80 }, (_, index) => message(80 - index));
        await route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'content-range': '0-79/81' }, body: JSON.stringify(latest) });
        return;
      }
      if (url.searchParams.get('limit') === '50' && url.searchParams.has('or')) {
        syntheticOlderMessageRequests++;
        await route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'content-range': '0-0/81' }, body: JSON.stringify([message(0)]) });
        return;
      }
    }
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
    } catch (error) {
      const feedback = await page.locator('[role="alert"], [data-sonner-toast], .Toastify__toast-body')
        .allTextContents().catch(() => []);
      const safeFeedback = feedback.map((message) => message.replace(email, '[operador]').trim().slice(0, 140));
      console.info('[support-readonly] Login diagnostic:', JSON.stringify({
        errorType: error instanceof Error ? error.name : 'unknown',
        path: new URL(page.url()).pathname,
        feedback: safeFeedback,
      }));
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

    if (verifyProductionMetaConnection || verifyProductionMetaCredentialsOnly || verifyProductionSignedWebhook
      || verifyProductionWabaSubscription) {
      const deploymentId = process.env.SUPPORT_READONLY_META_PRODUCTION_DEPLOYMENT?.trim() || '';
      if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId)) {
        throw new Error('Informe um ID de deployment de produção válido para a consulta Meta somente leitura.');
      }
      const accessToken = await page.evaluate(async () => {
        const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token || null;
      });
      if (!accessToken) throw new Error('A sessão autenticada não está disponível para a consulta Meta.');

      const projectRoot = resolve(process.cwd(), '..');
      const requestProductionMetaOperation = (
        operation: 'verify_app_credentials' | 'connection_test' | 'verify_waba_subscription'
      ) => {
        const curlConfig = [
          'request = "POST"',
          `header = "Authorization: Bearer ${accessToken}"`,
          'header = "Content-Type: application/json"',
          `data = "{\\"operation\\":\\"${operation}\\"}"`,
          'write-out = "\\n__HTTP_STATUS__:%{http_code}"',
        ].join('\n');
        let output = '';
        try {
          output = execFileSync('cmd.exe', [
            '/d', '/s', '/c',
            `vercel.cmd curl /api/meta-graph --deployment ${deploymentId} -- --config -`,
          ], {
            cwd: projectRoot,
            input: curlConfig,
            encoding: 'utf8',
            timeout: 45_000,
            windowsHide: true,
            maxBuffer: 256 * 1024,
          });
        } catch {
          throw new Error('A consulta somente leitura à rota Meta de produção falhou no Vercel CLI.');
        }

        const statusMatch = output.match(/__HTTP_STATUS__:(\d{3})\s*$/);
        if (!statusMatch) throw new Error('A resposta da consulta Meta não incluiu o status HTTP.');
        const status = Number(statusMatch[1]);
        const responseText = output.slice(0, statusMatch.index).split(/\r?\n/).filter(line => line.trim()).at(-1) || '{}';
        try {
          return { status, body: JSON.parse(responseText) as Record<string, unknown> };
        } catch {
          throw new Error(`A consulta Meta respondeu HTTP ${status} com formato inesperado.`);
        }
      };

      const appCredentials = requestProductionMetaOperation('verify_app_credentials');
      if (appCredentials.status !== 200 || appCredentials.body.valid !== true) {
        const reason = typeof appCredentials.body.reason === 'string' ? appCredentials.body.reason : 'unknown';
        const graphStatus = typeof appCredentials.body.graphStatus === 'number'
          ? appCredentials.body.graphStatus : 'n/a';
        const graphCode = typeof appCredentials.body.graphCode === 'string'
          || typeof appCredentials.body.graphCode === 'number' ? appCredentials.body.graphCode : 'n/a';
        const graphSubcode = typeof appCredentials.body.graphSubcode === 'number'
          ? appCredentials.body.graphSubcode : 'n/a';
        const graphErrorKind = typeof appCredentials.body.graphErrorKind === 'string'
          ? appCredentials.body.graphErrorKind : 'unknown';
        throw new Error(`Verificação Meta falhou: HTTP ${appCredentials.status}, motivo=${reason}, Graph HTTP=${graphStatus}, código=${graphCode}, subcódigo=${graphSubcode}, classe=${graphErrorKind}.`);
      }
      console.info('[support-readonly] App ID, App Secret e token Meta de produção confirmados sem expor credenciais.');

      if (verifyProductionWabaSubscription) {
        const subscription = requestProductionMetaOperation('verify_waba_subscription');
        expect(subscription.status, 'Production deve concluir a consulta Graph da inscrição do WABA.').toBe(200);
        expect(subscription.body.valid, 'A resposta da consulta Graph deve ser válida.').toBe(true);
        expect(subscription.body.subscribed, 'O app configurado precisa estar inscrito no WABA.').toBe(true);
        console.info('[support-readonly] App ID atual confirmado como inscrito no WABA configurado; nenhum identificador ou payload de outros apps foi registrado.');
      }

      if (verifyProductionMetaConnection) {
        const connection = requestProductionMetaOperation('connection_test');
        const { status, body: responseBody } = connection;
        if (status !== 200 || responseBody.error || typeof responseBody.id !== 'string') {
          const error = responseBody.error && typeof responseBody.error === 'object'
            ? responseBody.error as Record<string, unknown> : {};
          const code = typeof error.code === 'number' || typeof error.code === 'string' ? error.code : 'n/a';
          const type = typeof error.type === 'string' ? error.type : 'n/a';
          throw new Error(`Meta connection_test falhou: HTTP ${status}, code=${code}, type=${type}.`);
        }
        console.info('[support-readonly] Conexão Graph de produção confirmada; metadados da linha telefônica omitidos.');
      }

      if (verifyProductionSignedWebhook) {
        const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
        if (!appSecret) throw new Error('App Secret de Vercel Development ausente para a prova HMAC.');
        const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
        const requestProductionWebhook = (signature?: string) => {
          const curlConfig = [
            'request = "POST"',
            'header = "Content-Type: application/json"',
            ...(signature ? [`header = "X-Hub-Signature-256: ${signature}"`] : []),
            `data = ${JSON.stringify(rawBody)}`,
            'write-out = "\\n__HTTP_STATUS__:%{http_code}"',
          ].join('\n');
          let output = '';
          try {
            output = execFileSync('cmd.exe', [
              '/d', '/s', '/c',
              `vercel.cmd curl /api/whatsapp-webhook --deployment ${deploymentId} -- --config -`,
            ], {
              cwd: projectRoot,
              input: curlConfig,
              encoding: 'utf8',
              timeout: 45_000,
              windowsHide: true,
              maxBuffer: 256 * 1024,
            });
          } catch {
            throw new Error('A prova de assinatura do webhook em Production falhou no Vercel CLI.');
          }
          const statusMatch = output.match(/__HTTP_STATUS__:(\d{3})\s*$/);
          if (!statusMatch) throw new Error('A prova do webhook não incluiu o status HTTP.');
          const status = Number(statusMatch[1]);
          const responseText = output.slice(0, statusMatch.index).split(/\r?\n/).filter(line => line.trim()).at(-1) || '{}';
          try {
            return { status, body: JSON.parse(responseText) as Record<string, unknown> };
          } catch {
            throw new Error(`A prova do webhook respondeu HTTP ${status} com formato inesperado.`);
          }
        };

        expect(requestProductionWebhook().status, 'Production deve recusar a ausência da assinatura.').toBe(401);
        expect(requestProductionWebhook(`sha256=${'0'.repeat(64)}`).status,
          'Production deve recusar uma assinatura HMAC inválida.').toBe(401);
        const signature = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
        const accepted = requestProductionWebhook(signature);
        expect(accepted.status, 'O webhook de Production deve aceitar HMAC válida no payload sem eventos.').toBe(200);
        expect(accepted.body.status).toBe('EVENT_RECEIVED');
        console.info('[support-readonly] Webhook Production recusou assinatura ausente/inválida e aceitou HMAC válida no payload vazio; nenhum evento ou dado comercial foi processado.');
      }
    }

    failFolderReads = true;
    failAgentReads = true;
    await page.goto('http://localhost:5173/atendimento');
    const resetLayoutButton = page.getByRole('button', { name: 'Restaurar layout padrão', exact: true });
    await expect(page.getByTestId('customer-support-layout')).toBeVisible({ timeout: 20_000 });
    const layoutEntryState = await page.evaluate(() => ({
      path: window.location.pathname,
      width: window.innerWidth,
      hasLayout: Boolean(document.querySelector('[data-testid="customer-support-layout"]')),
      hasInboxPanel: Boolean(document.querySelector('[data-testid="customer-support-inbox-panel"]')),
      hasLogin: Boolean(document.querySelector('input[type="password"]')),
    }));
    console.info(`[support-readonly] Estado de entrada da Inbox: ${JSON.stringify(layoutEntryState)}.`);
    await expect(resetLayoutButton).toBeVisible({ timeout: 10_000 });
    await resetLayoutButton.click();
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
      console.info(`[support-readonly] Paginação real: ${initialCount[1]} iniciais → ${Math.min(100, Number(initialCount[2]))} de ${initialCount[2]}, segunda página HTTP ${secondPage.status()}.`);
      test.info().annotations.push({ type: 'pagination', description: 'Segunda página consultada pela rolagem real, sem selecionar conversa.' });
    } else {
      console.info(`[support-readonly] Paginação não exercitada nesta conta: total de ${initialCount?.[2] ?? 'indisponível'} conversas (limite da página: 50).`);
      test.info().annotations.push({ type: 'limitation', description: 'Lista real com até 50 conversas; paginação exige fixture controlada.' });
    }

    await test.step('Redimensionar os painéis, recolher e manter a seleção em desktop e mobile', async () => {
      const inboxPanel = page.getByTestId('customer-support-inbox-panel');
      const conversationsPanel = page.getByTestId('customer-support-conversations-panel');
      const inboxToggle = page.getByRole('button', { name: 'Caixa de entrada', exact: true });
      const conversationsToggle = page.getByRole('button', { name: 'Mostrar ou recolher lista de conversas', exact: true });
      const inboxHandle = page.getByRole('separator', { name: 'Redimensionar painel: Pastas e filas', exact: true });
      const conversationsHandle = page.getByRole('separator', { name: 'Redimensionar painel: Lista de conversas', exact: true });

      await expect(inboxHandle).toBeVisible();
      await expect(conversationsHandle).toBeVisible();
      if (await inboxToggle.getAttribute('aria-expanded') !== 'true') await inboxToggle.click();
      if (await conversationsToggle.getAttribute('aria-expanded') !== 'true') await conversationsToggle.click();

      await inboxHandle.focus();
      await inboxHandle.press('End');
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '360');
      await inboxHandle.press('Home');
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '180');
      await inboxHandle.press('ArrowRight');
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '196');
      await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(196);

      const inboxBounds = await inboxHandle.boundingBox();
      expect(inboxBounds).toBeTruthy();
      await page.mouse.move(inboxBounds!.x + 4, inboxBounds!.y + Math.min(120, inboxBounds!.height / 2));
      await page.mouse.down();
      await page.mouse.move(inboxBounds!.x - 64, inboxBounds!.y + Math.min(120, inboxBounds!.height / 2), { steps: 4 });
      await page.mouse.up();
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '0');
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
       await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);
      await inboxToggle.click();
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
      await inboxHandle.dblclick();
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
       await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);

      await conversationsHandle.focus();
      await conversationsHandle.press('End');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '600');
      await conversationsHandle.press('Home');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '260');
      await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(260);
      const conversationsBounds = await conversationsHandle.boundingBox();
      expect(conversationsBounds).toBeTruthy();
      await page.mouse.move(conversationsBounds!.x + 4, conversationsBounds!.y + Math.min(120, conversationsBounds!.height / 2));
      await page.mouse.down();
      await page.mouse.move(conversationsBounds!.x - 48, conversationsBounds!.y + Math.min(120, conversationsBounds!.height / 2), { steps: 4 });
      await page.mouse.up();
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '0');
      await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
       await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(220);
      await conversationsToggle.click();
      await conversationsHandle.dblclick();
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');
       await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(220);

       await inboxHandle.focus();
       await inboxHandle.press('End');
       await expect(inboxHandle).toHaveAttribute('aria-valuenow', '360');
       const panelBudgetMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
         const children = Array.from(layout.children) as HTMLElement[];
         return {
           layoutWidth: layout.clientWidth,
           navigationWidth: children[0]?.getBoundingClientRect().width || 0,
           handleWidths: Array.from(layout.querySelectorAll('[role="separator"]')).map((handle) =>
             handle.getBoundingClientRect().width
           ),
           inboxWidth: children[1]?.getBoundingClientRect().width || 0,
           conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
           chatWidth: children[5]?.getBoundingClientRect().width || 0,
         };
       });
       console.info(`[support-readonly] Medidas dos painéis após expandir a Inbox: ${JSON.stringify(panelBudgetMetrics)}; max conversa=${await conversationsHandle.getAttribute('aria-valuemax')}.`);
       await conversationsHandle.focus();
       const availableConversationWidth = Number(await conversationsHandle.getAttribute('aria-valuemax'));
       await conversationsHandle.press('End');
       await expect(conversationsHandle).toHaveAttribute('aria-valuenow', String(availableConversationWidth));
       await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0))
         .toBe(availableConversationWidth);
       const desktopMaximumMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
         const children = Array.from(layout.children) as HTMLElement[];
         return {
           clientWidth: layout.clientWidth,
           scrollWidth: layout.scrollWidth,
           inboxWidth: children[1]?.getBoundingClientRect().width || 0,
           conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
           chatWidth: children[5]?.getBoundingClientRect().width || 0,
         };
       });
       expect(desktopMaximumMetrics.inboxWidth).toBe(360);
       expect(availableConversationWidth).toBe(600);
       expect(desktopMaximumMetrics.conversationsWidth).toBeLessThanOrEqual(availableConversationWidth);
       expect(desktopMaximumMetrics.conversationsWidth).toBeGreaterThanOrEqual(260);
       expect(desktopMaximumMetrics.conversationsWidth).toBe(600);
       expect(desktopMaximumMetrics.chatWidth).toBeGreaterThanOrEqual(240);
       expect(desktopMaximumMetrics.scrollWidth).toBeLessThanOrEqual(desktopMaximumMetrics.clientWidth + 1);
       await resetLayoutButton.click();

      const cardHeadings = conversationList.locator('[role="button"] h4');
      const safeConversationIndex = await cardHeadings.evaluateAll((headings) =>
        headings.findIndex((heading) => !heading.closest('[role="button"]')?.querySelector('span.bg-blue-600'))
      );
      let selectedName: string | null = null;
      if (safeConversationIndex >= 0) {
        const selectedCardHeading = cardHeadings.nth(safeConversationIndex);
        await expect(selectedCardHeading).toBeVisible();
        await expect.poll(() => selectedCardHeading.evaluate((heading) =>
          !heading.closest('[role="button"]')?.querySelector('span.bg-blue-600')
        )).toBe(true);
        selectedName = (await selectedCardHeading.textContent())?.trim() || null;
        await selectedCardHeading.click();
        const chatHeading = page.getByRole('heading', { name: selectedName, exact: true }).last();
        await expect(chatHeading).toBeVisible();
        const listScrollBeforeCollapse = await conversationList.evaluate((element) => element.scrollTop);
        await conversationsToggle.click();
        await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
        await expect(chatHeading).toBeVisible();
        await conversationsToggle.click();
        await expect(chatHeading).toBeVisible();
        await expect.poll(() => conversationList.evaluate((element) => element.scrollTop)).toBe(listScrollBeforeCollapse);
      } else {
        test.info().annotations.push({ type: 'selection-limitation', description: 'Nenhuma conversa carregada sem badge de não lidas; a prova evitou abrir uma conversa que pudesse disparar confirmação de leitura.' });
      }

      const layoutSearch = page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...', { exact: true });
      await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);
      if (!await layoutSearch.isVisible()) {
        const searchToggle = page.getByTitle('Alternar campo de busca', { exact: true });
        await expect(searchToggle).toBeVisible();
        await searchToggle.scrollIntoViewIfNeeded();
        await searchToggle.click();
      }
      await expect(layoutSearch).toBeVisible();
      await layoutSearch.fill('__central_panel_search_retention__');
      await expect(page.getByRole('heading', { name: 'Nenhuma conversa encontrada', exact: true })).toBeVisible();
      await conversationsToggle.click();
      await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
      await conversationsToggle.click();
      await expect(layoutSearch).toHaveValue('__central_panel_search_retention__');
      await layoutSearch.fill('');

      const unassignedFilter = inboxPanel.getByRole('button', { name: /Não atribuídas/ }).first();
      const [unassignedResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')
          && response.request().postDataJSON()?.p_filter === 'unassigned', { timeout: 15_000 }),
        unassignedFilter.click(),
      ]);
      expect(unassignedResponse.status()).toBe(200);
      await expect(unassignedFilter).toHaveClass(/bg-blue-600/);
      await inboxToggle.click();
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
      await inboxToggle.click();
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
      await expect(unassignedFilter).toHaveClass(/bg-blue-600/);
      if (selectedName) await expect(page.getByRole('heading', { name: selectedName, exact: true }).last()).toBeVisible();

      await expect.poll(async () => page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
        const value = key ? localStorage.getItem(key) : null;
        return value ? JSON.parse(value) : null;
      })).not.toBeNull();
      const savedPreferences = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
        const value = key ? localStorage.getItem(key) : null;
        return value ? JSON.parse(value) : null;
      });
      expect(savedPreferences).toMatchObject({ inboxWidth: 220, conversationsWidth: 340, isInboxOpen: true, isConversationsOpen: true });

      const previousViewport = page.viewportSize() ?? await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(inboxHandle).toBeHidden();
      await expect(conversationsHandle).toBeHidden();
      if (selectedName) await expect(page.getByRole('heading', { name: selectedName, exact: true }).last()).toBeVisible();
      await inboxToggle.click();
      const inboxAside = page.getByLabel('Pastas e filas de atendimento', { exact: true });
      await expect(inboxAside).toBeVisible();
      const mobileBounds = await inboxAside.boundingBox();
      expect(mobileBounds).toBeTruthy();
      expect(mobileBounds!.x).toBeGreaterThanOrEqual(55);
      expect(mobileBounds!.x + mobileBounds!.width).toBeLessThanOrEqual(391);
      const inboxBackdrop = page.getByRole('button', { name: 'Fechar pastas e filas', exact: true });
      const backdropBounds = await inboxBackdrop.boundingBox();
      expect(backdropBounds).toBeTruthy();
      await page.mouse.click(backdropBounds!.x + backdropBounds!.width - 10, backdropBounds!.y + backdropBounds!.height / 2);
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
      if (selectedName) {
        await conversationsToggle.click();
        await expect(conversationList).toBeVisible();
      }
      const afterMobilePreferences = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
        const value = key ? localStorage.getItem(key) : null;
        return value ? JSON.parse(value) : null;
      });
      expect(afterMobilePreferences).toEqual(savedPreferences);
      if (previousViewport) await page.setViewportSize(previousViewport);
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');

      const chatContent = page.getByRole('heading', { name: 'Central de Atendimento MoranteHub', exact: true });
      await inboxToggle.click();
      await conversationsToggle.click();
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
      await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
      await expect(inboxToggle).toBeVisible();
      await expect(conversationsToggle).toBeVisible();
      await expect(chatContent).toBeVisible();
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '0');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '0');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
      await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
      await inboxToggle.click();
      await conversationsToggle.click();
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');

      await page.setViewportSize({ width: 768, height: 844 });
      const tabletMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
        const children = Array.from(layout.children) as HTMLElement[];
        return {
          clientWidth: layout.clientWidth,
          scrollWidth: layout.scrollWidth,
          inboxWidth: children[1]?.getBoundingClientRect().width || 0,
          conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
          chatWidth: children[5]?.getBoundingClientRect().width || 0,
        };
      });
      expect(tabletMetrics.scrollWidth).toBeLessThanOrEqual(tabletMetrics.clientWidth + 1);
      expect(tabletMetrics.inboxWidth).toBeGreaterThanOrEqual(180);
      expect(tabletMetrics.conversationsWidth).toBeGreaterThanOrEqual(260);
      expect(tabletMetrics.chatWidth).toBeGreaterThanOrEqual(240);
      await expect(inboxHandle).toBeVisible();
      await expect(conversationsHandle).toBeVisible();

      await inboxHandle.focus();
      await inboxHandle.press('End');
       const availableTabletInboxWidth = Number(await inboxHandle.getAttribute('aria-valuemax'));
       await expect(inboxHandle).toHaveAttribute('aria-valuenow', String(availableTabletInboxWidth));
       await expect.poll(async () => Number(await conversationsHandle.getAttribute('aria-valuemax')))
         .toBeGreaterThanOrEqual(260);
      await conversationsHandle.focus();
       const availableTabletConversationWidth = Number(await conversationsHandle.getAttribute('aria-valuemax'));
      await conversationsHandle.press('End');
       await expect(conversationsHandle).toHaveAttribute('aria-valuenow', String(availableTabletConversationWidth));
       const tabletMaximumMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
         const children = Array.from(layout.children) as HTMLElement[];
         return {
           clientWidth: layout.clientWidth,
           scrollWidth: layout.scrollWidth,
           inboxWidth: children[1]?.getBoundingClientRect().width || 0,
           conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
           chatWidth: children[5]?.getBoundingClientRect().width || 0,
         };
       });
       expect(tabletMaximumMetrics.inboxWidth).toBeGreaterThanOrEqual(180);
       expect(tabletMaximumMetrics.conversationsWidth).toBe(availableTabletConversationWidth);
       expect(tabletMaximumMetrics.chatWidth).toBeGreaterThanOrEqual(240);
       expect(tabletMaximumMetrics.scrollWidth).toBeLessThanOrEqual(tabletMaximumMetrics.clientWidth + 1);
      await page.getByRole('button', { name: 'Restaurar layout padrão', exact: true }).click();
      await expect.poll(async () => Number(await inboxHandle.getAttribute('aria-valuenow')))
        .toBe(Math.round((await inboxPanel.boundingBox())?.width || 0));
      await expect.poll(async () => Number(await conversationsHandle.getAttribute('aria-valuenow')))
        .toBe(Math.round((await conversationsPanel.boundingBox())?.width || 0));
      await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
      await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'false');
      const tabletSavedPreferences = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
        const value = key ? localStorage.getItem(key) : null;
        return value ? JSON.parse(value) : null;
      });
      expect(tabletSavedPreferences).toMatchObject({ inboxWidth: 220, conversationsWidth: 340 });
      await page.setViewportSize({ width: 1280, height: 844 });
      await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
      await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');
      console.info('[support-readonly] Larguras, filtros/busca/rolagem e seleção preservados ao recolher no desktop, fechamento simultâneo, persistência após reload, reset global e breakpoints mobile/tablet confirmados; nenhuma gravação comercial foi feita.');
      test.info().annotations.push({ type: 'customer-support-layout', description: 'Inbox 180–360px e conversas 260–600px: teclado e arraste conferidos, recolhimento independente/simultâneo, reabertura, reset individual/global e persistência após reload. Filtro, busca e scroll preservados; a seleção é preservada ao recolher no desktop. Em 390px mobile, a navegação lista/chat usa overlay sem sobrescrever preferências; em 768px tablet, o chat permanece utilizável sem rolagem horizontal.' });
    });

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
      simulateMessagePaging = verifyMessagePaging;
      const searchToggle = page.getByTitle('Alternar campo de busca', { exact: true });
      if (!await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').isVisible()) await searchToggle.click();
      await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').fill(ownFixture!.contact_name);
      await page.getByRole('button', { name: /^[^A-Za-z]*All[^A-Za-z]*$/ }).click();
      await page.getByRole('button', { name: /Closed \(Fechadas\)/ }).click();
      const agentDirectoryReadsBeforeChat = agentDirectoryReads;
      await page.getByRole('region', { name: 'Lista de conversas', exact: true }).getByText(ownFixture!.contact_name, { exact: true }).click();
      await expect(page.getByText('Não foi possível confirmar a leitura. Atualize a conversa para tentar novamente.', { exact: true })).toBeVisible();
      const history = page.getByRole('region', { name: 'Histórico da conversa', exact: true });
      await expect(history.locator('[data-message-id]').first()).toBeVisible();
      if (verifyMessagePaging) {
        await expect(history.getByText('Mensagem sintética 80', { exact: true })).toBeVisible();
        await expect(history.getByText('Carregando mensagens anteriores…', { exact: true })).toHaveCount(0);
        await expect(history.locator('[data-message-id]')).toHaveCount(80);
        expect(syntheticOlderMessageRequests, 'Abrir o chat não deve carregar uma página antiga antes do scroll.').toBe(0);
        const [olderPage] = await Promise.all([
          page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname === '/rest/v1/whatsapp_messages' && response.request().method() === 'GET'
              && url.searchParams.get('conversation_id') === `eq.${ownedReadConversationId}`
              && url.searchParams.get('limit') === '50' && url.searchParams.has('or');
          }),
          history.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); }),
        ]);
        expect(olderPage.status()).toBe(200);
        expect(syntheticOlderMessageRequests).toBe(1);
        await expect(history.getByText('Mensagem sintética 0', { exact: true })).toBeVisible();
        await expect(history.locator('[data-message-id]')).toHaveCount(81);
        simulateMessagePaging = false;
        test.info().annotations.push({ type: 'message-history-pagination-ui',
          description: 'A conversa iniciou com 80 mensagens; scroll manual até o topo carregou uma mensagem anterior pela UI. Apenas respostas sintéticas foram interceptadas no cliente, sem escrita no banco.' });
        console.info('[support-readonly] Scroll manual no topo carregou uma mensagem anterior; 80 → 81 itens, sem gravações.');
      }
      expect(agentDirectoryReads, 'Abrir o chat deve reutilizar o diretório já carregado pela Inbox.').toBe(agentDirectoryReadsBeforeChat);
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
      if (verifyMessageSearch) {
        const searchProof = await page.evaluate(async (conversationId) => {
          const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
          const result = await supabase.from('whatsapp_messages')
            .select('id,text_content,media_filename,media_caption').eq('conversation_id', conversationId).limit(69);
          if (result.error || !result.data || result.data.length > 68) throw new Error('Histórico próprio não confirmado para a busca.');
          const term = result.data.map(row => row.text_content?.match(/[A-Za-z]{4,24}/)?.[0]).find(Boolean);
          if (!term) throw new Error('Fixture própria sem texto pesquisável.');
          const expectedIds = result.data.filter(row => [row.text_content, row.media_filename, row.media_caption]
            .some(value => value?.toLowerCase().includes(term.toLowerCase()))).map(row => row.id).sort();
          return { term, expectedIds };
        }, ownedReadConversationId!);
        await page.getByRole('button', { name: 'Pesquisar na conversa', exact: true }).click();
        const searchInput = page.getByRole('searchbox', { name: 'Pesquisar nesta conversa', exact: true });
        const searchForm = searchInput.locator('..');
        await searchInput.fill('x'.repeat(101));
        await searchForm.getByRole('button', { name: 'Buscar', exact: true }).click();
        await expect(searchForm.locator('..').getByRole('alert')).toHaveText('A busca deve ter no máximo 100 caracteres.');
        await searchInput.fill(searchProof.term);
        const [searchResponse] = await Promise.all([
          page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname === '/rest/v1/whatsapp_messages' && url.searchParams.has('text_content');
          }),
          searchForm.getByRole('button', { name: 'Buscar', exact: true }).click(),
        ]);
        expect(searchResponse.status()).toBe(200);
        await expect(history.getByRole('status')).toHaveCount(0);
        const moreResults = history.getByRole('button', { name: 'Carregar mais resultados', exact: true });
        for (let pageIndex = 0; pageIndex < 3 && await moreResults.isVisible(); pageIndex++) {
          await moreResults.click();
          await expect(history.getByRole('button', { name: 'Pesquisando mensagens…', exact: true })).toHaveCount(0);
        }
        await expect.poll(async () => (await history.locator('[data-message-id]').evaluateAll(elements =>
          elements.map(element => (element as HTMLElement).dataset.messageId).sort()))).toEqual(searchProof.expectedIds);
        const [repeatedSearch] = await Promise.all([
          page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname === '/rest/v1/whatsapp_messages' && url.searchParams.has('text_content');
          }),
          searchForm.getByRole('button', { name: 'Buscar', exact: true }).click(),
        ]);
        expect(repeatedSearch.status()).toBe(200);
        await expect.poll(async () => (await history.locator('[data-message-id]').evaluateAll(elements =>
          elements.map(element => (element as HTMLElement).dataset.messageId).sort()))).toEqual(searchProof.expectedIds);
        await searchForm.getByRole('button', { name: 'Fechar', exact: true }).click();
        await expect(searchInput).toHaveCount(0);
        test.info().annotations.push({ type: 'message-search-readonly', description: 'Resolver e busca paginada pela UI comparados aos IDs de mensagens da fixture própria sob RLS, com todas as escritas bloqueadas. Não prova uma correspondência além de 80 mensagens.' });
        console.info('[support-readonly] Busca da conversa própria e validação do formulário confirmadas sem escritas.');
      }
      if (verifyHistoryPanels) {
        const persistedCounts = await page.evaluate(async (conversationId) => {
          const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
          const activities = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId).in('message_type', ['internal_note', 'system_event']);
          const attachments = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId).not('media_id', 'is', null);
          if (activities.error || attachments.error) throw new Error('RLS recusou a leitura da timeline ou galeria própria.');
          return { activities: activities.count || 0, attachments: attachments.count || 0 };
        }, ownedReadConversationId!);
        await page.getByRole('button', { name: 'Linha do tempo de atividades', exact: true }).click();
        const timeline = page.getByRole('complementary', { name: 'Linha do tempo de atividades', exact: true });
        await expect(timeline).toBeVisible();
        await expect(timeline.getByText('Atividades persistidas da conversa', { exact: true })).toBeVisible();
        await expect(timeline.locator('h4')).toHaveCount(persistedCounts.activities);
        if (persistedCounts.activities > 0) {
          await expect(timeline.getByText('Comentário interno', { exact: true })).toBeVisible();
          await expect(timeline.getByText('Evento do atendimento', { exact: true }).first()).toBeVisible();
        }
        await page.getByRole('button', { name: 'Fechar linha do tempo', exact: true }).click();
        await page.getByRole('button', { name: 'Painel de informações do cliente', exact: true }).click();
        const panel = page.locator('aside').filter({ has: page.getByRole('heading', { name: /Informações Comerciais/ }) });
        await expect(panel).toBeVisible();
        await panel.getByRole('button', { name: 'Mídias', exact: true }).click();
        await expect(panel.getByText(`Anexos carregados: ${persistedCounts.attachments}`, { exact: true })).toBeVisible();
        if (persistedCounts.attachments === 0) {
          await expect(panel.getByText('Nenhum anexo compartilhado.', { exact: true })).toBeVisible();
        }
        await panel.getByRole('button', { name: 'Fechar painel', exact: true }).click();
        test.info().annotations.push({ type: 'persisted-activity-and-attachments',
          description: `Timeline e galeria abertas pela UI sob RLS; ${persistedCounts.activities} atividades e ${persistedCounts.attachments} anexos persistidos comparados, sem escritas.` });
        console.info('[support-readonly] Timeline e galeria conferidas com a conversa própria.');
      }
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
        const noteCountBefore = await page.evaluate(async (conversationId) => {
          const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
          const result = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId).eq('message_type', 'internal_note');
          if (result.error) throw new Error('RLS recusou a contagem de comentários da conversa própria.');
          return result.count || 0;
        }, ownedReadConversationId!);
        await page.bringToFront();
        await context.grantPermissions(['clipboard-write'], { origin: 'http://localhost:5173' });
        clipboardGranted = true;
        await page.getByTitle('Modelos Rápidos / Snippets', { exact: true }).click();
        const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Orientação de Pagamento via PIX', exact: true }) });
        await expect(dialog.getByText(pixText, { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: /Copiar/ }).first().click();
        await expect(page.getByText('Modelo "Orientação de Pagamento via PIX" copiado para a área de transferência.', { exact: true })).toBeVisible();
        const noteCountAfter = await page.evaluate(async (conversationId) => {
          const { supabase } = await import('/src/pages/utils/supabaseConfig.ts');
          const result = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId).eq('message_type', 'internal_note');
          if (result.error) throw new Error('RLS recusou a conferência dos comentários da conversa própria.');
          return result.count || 0;
        }, ownedReadConversationId!);
        expect(noteCountAfter, 'Copiar um snippet não deve criar comentário interno.').toBe(noteCountBefore);
        console.info('[support-readonly] Cópia nativa do modelo público confirmada pela UI.');
        await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        test.info().annotations.push({ type: 'neutral-snippet-copy', description: 'Modelo público neutro aberto e writeText nativo confirmado pela UI; contagem de comentários ficou igual antes/depois. Conteúdo do clipboard do sistema não relido. Todas as escritas de negócio bloqueadas.' });
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
    await page.goto('about:blank').catch(() => undefined);
    await context.unroute('**/*', guard);
    // Disconnect this runner; the CLI retains its visible browser and session.
    await browser.close();
  }
});
