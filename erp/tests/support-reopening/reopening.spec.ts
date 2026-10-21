import { chromium, expect, test, type Route } from '@playwright/test';
import { expectedOrigin, expectedOwnerId, expectedRunId, readRequest, readManifest, saveManifest } from './context';

test('nova mensagem reabre Fechados e Adiados pela mesma Inbox e mantém timeline única', async () => {
  const request = readRequest();
  const manifest = readManifest();
  if (!manifest?.backendProof?.passed || manifest.uiStarted) throw new Error('Prova backend ausente ou UI já iniciada; conferir antes de repetir.');
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('Credenciais oficiais ausentes.');
  const development = await fetch('http://localhost:5173', { signal: AbortSignal.timeout(10_000) });
  if (!development.ok || !(await development.text()).includes('/@vite/client')) throw new Error('Inicie primeiro o ERP de desenvolvimento na porta 5173 com strictPort.');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0]; const page = context?.pages()[0];
  if (!page) throw new Error('Navegador visível de desenvolvimento não encontrado.');
  const ids = new Set(manifest.conversationIds);
  const id = manifest.initialIds[0];
  const resumeAfterOpen = manifest.uiResumeAfterOpenVerified === true;
  let verified = false;
  let unauthorizedWrites = 0;
  const readRPCs = new Set(['customer_support_list_conversations', 'customer_support_conversation_counts',
    'customer_support_list_agents', 'customer_support_can_view', 'customer_support_can_view_commercial_info',
    'customer_support_list_customer_summaries', 'customer_support_count_customer_orders', 'customer_support_test_fixture_manifest']);
  const guard = async (route: Route) => {
    const req = route.request(); const url = new URL(req.url()); const method = req.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue();
    if (url.origin === expectedOrigin && method === 'POST' && (url.pathname === '/auth/v1/token'
      || (url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local'))) return route.continue();
    if (url.origin === 'http://localhost:5173' && url.pathname === '/api/testing/test-artifact-operator' && method === 'POST') return route.continue();
    let body: Record<string, unknown> = {};
    try { body = req.postDataJSON() || {}; } catch { /* Unknown writes stay blocked. */ }
    const rpc = url.pathname.startsWith('/rest/v1/rpc/') ? url.pathname.split('/').pop() || '' : '';
    if (url.origin === expectedOrigin && method === 'POST' && readRPCs.has(rpc)) return route.continue();
    if (verified && url.origin === expectedOrigin && method === 'POST'
      && rpc === 'customer_support_set_conversation_status' && body.p_conversation_id === id
      && ['open', 'closed', 'snoozed'].includes(String(body.p_status))) return route.continue();
    if (verified && url.origin === expectedOrigin && method === 'POST' && rpc === 'customer_support_test_receive_message'
      && body.p_anchor_conversation_id === id && ['ui-closed', 'ui-snoozed'].includes(String(body.p_message_key))
      && body.p_new_contact === false && body.p_rollback === false) return route.continue();
    const conversationId = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (verified && url.origin === expectedOrigin && method === 'PATCH' && url.pathname === '/rest/v1/whatsapp_conversations'
      && conversationId && ids.has(conversationId) && Object.keys(body).length === 1 && body.unread_count === 0) return route.continue();
    if (/whatsapp_|customer_support_|\/messages\b/.test(url.pathname)) unauthorizedWrites++;
    return route.abort('blockedbyclient');
  };
  await context.route('**/*', guard);
  page.setDefaultTimeout(15_000);
  try {
    await page.goto('http://localhost:5173/login');
    try {
      const same = await page.evaluate(async expected => {
        const path = '/src/pages/utils/supabaseConfig.ts'; const { supabase } = await import(path);
        const user = await supabase.auth.getUser();
        if (user.data.user?.id === expected) return true;
        await supabase.auth.signOut({ scope: 'local' }); return false;
      }, expectedOwnerId);
      if (!same) {
        await page.goto('http://localhost:5173/login');
        await page.getByRole('textbox', { name: 'exemplo@email.com' }).fill(email);
        await page.getByRole('textbox', { name: '••••••••' }).fill(password);
        await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
        await page.waitForURL(url => url.pathname !== '/login', { timeout: 30_000 });
      }
    } catch {
      await page.locator('input[type="email"], input[type="password"]').evaluateAll(inputs => {
        for (const input of inputs) if (input instanceof HTMLInputElement) input.value = '';
      }).catch(() => undefined);
      throw new Error('Login não concluiu; credenciais não serão registradas.');
    }
    verified = await page.evaluate(async ({ runId, ownerId, expectedIds }) => {
      const path = '/src/pages/utils/supabaseConfig.ts'; const { supabase } = await import(path);
      const auth = await supabase.auth.getSession(); const user = await supabase.auth.getUser();
      if (user.data.user?.id !== ownerId || !auth.data.session) return false;
      const gate = await fetch('/api/testing/test-artifact-operator', { method: 'POST',
        headers: { Authorization: 'Bearer ' + auth.data.session.access_token } });
      const remote = await supabase.rpc('customer_support_test_fixture_manifest', { p_run_id: runId });
      const conversations = await supabase.from('whatsapp_conversations').select('id, customer_id, business_phone_number_id').in('id', expectedIds);
      return gate.status === 204 && !remote.error && remote.data.ownerId === ownerId
        && JSON.stringify([...remote.data.conversationIds].sort()) === JSON.stringify([...expectedIds].sort())
        && !conversations.error && conversations.data.length === expectedIds.length
        && conversations.data.every((row: { customer_id: string | null; business_phone_number_id: string }) =>
          row.customer_id === null && row.business_phone_number_id === `test-artifact:${runId}`);
    }, { runId: expectedRunId, ownerId: expectedOwnerId, expectedIds: [...ids] });
    expect(verified).toBe(true);
    manifest.uiStarted = true;
    delete manifest.uiResumeAfterOpenVerified;
    saveManifest(manifest);
    await page.goto('http://localhost:5173/atendimento');
    await expect(page.getByText('Pastas compartilhadas', { exact: true })).toBeVisible();
    await page.getByTitle('Alternar campo de busca', { exact: true }).click();
    await page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...').fill(request.contactNames[0]);
    if (!resumeAfterOpen) {
      await page.getByRole('button', { name: /^[^A-Za-z]*All[^A-Za-z]*$/ }).click();
      await page.getByRole('button', { name: /Closed \(Fechadas\)/ }).click();
    }
    const list = page.getByRole('region', { name: 'Lista de conversas', exact: true });
    await list.getByText(request.contactNames[0], { exact: true }).click();
    const changeStatus = async (next: 'open' | 'closed' | 'snoozed') => {
      const response = page.waitForResponse(res => res.url().endsWith('/rest/v1/rpc/customer_support_set_conversation_status')
        && res.request().postDataJSON()?.p_conversation_id === id && res.request().postDataJSON()?.p_status === next);
      if (next === 'open') await page.getByRole('button', { name: /\bReopen\b/ }).click();
      else if (next === 'closed') await page.getByRole('button', { name: /\bClose\b/ }).click();
      else { await page.getByTitle('Mais opções de status', { exact: true }).click(); await page.getByRole('button', { name: /Adiar \(Snooze\)/ }).click(); }
      expect((await response).status()).toBe(200);
    };
    if (!resumeAfterOpen) {
      await changeStatus('open');
      await page.getByRole('button', { name: /^[^A-Za-z]*Closed[^A-Za-z]*$/ }).click();
      await page.getByRole('button', { name: /All \(Todas\)/ }).click();
      await list.getByText(request.contactNames[0], { exact: true }).click();
    }
    for (const state of ['closed', 'snoozed'] as const) {
      await changeStatus(state);
      const receipt = await page.evaluate(async ({ id, key }) => {
        const path = '/src/pages/utils/supabaseConfig.ts'; const { supabase } = await import(path);
        const response = await supabase.rpc('customer_support_test_receive_message', { p_anchor_conversation_id: id,
          p_message_key: key, p_text: 'Mensagem sintética pela prova da UI ' + key, p_timestamp: new Date().toISOString(),
          p_new_contact: false, p_rollback: false });
        return { ok: !response.error, receipt: response.data };
      }, { id, key: `ui-${state}` });
      expect(receipt.ok && receipt.receipt.inserted && receipt.receipt.reopened).toBe(true);
      await expect(page.getByRole('button', { name: /\bClose\b/ })).toBeVisible();
      await expect(list.getByText(request.contactNames[0], { exact: true })).toBeVisible();
      const history = page.getByRole('region', { name: 'Histórico da conversa', exact: true });
      await expect(history.locator(`[data-message-id="${receipt.receipt.message_id}"]`)).toHaveCount(1);
      const rows = history.locator('[data-message-id]');
      expect(await rows.evaluateAll(nodes => new Set(nodes.map(node => node.getAttribute('data-message-id'))).size === nodes.length)).toBe(true);
    }
    const messageCount = await page.evaluate(async ids => {
      const path = '/src/pages/utils/supabaseConfig.ts'; const { supabase } = await import(path);
      const result = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true }).in('conversation_id', ids);
      return result.error ? -1 : result.count;
    }, [...ids]);
    expect(messageCount).toBeGreaterThan(0); expect(messageCount).toBeLessThanOrEqual(63);
    expect(unauthorizedWrites).toBe(0);
    manifest.uiProof = { passed: true, messageCount: messageCount!, completedAt: new Date().toISOString() }; saveManifest(manifest);
  } finally {
    await context.unroute('**/*', guard);
    await browser.close(); // CDP disconnect: leave the CLI's visible window open.
  }
});
