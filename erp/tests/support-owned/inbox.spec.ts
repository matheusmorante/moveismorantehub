import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect, test, type Route } from '@playwright/test';
import { supportFixtureProvisionSchema } from '../../../shared-utils/customerSupportFormSchemas';

test('pasta persistida, paginação de conversas e mensagens da própria execução', async () => {
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development'
    || !process.env.SUPPORT_FIXTURE_PROVISION_INPUT || !process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT) {
    throw new Error('Harness exige o launcher oficial e o manifesto da operação autorizada.');
  }
  const envelope = JSON.parse(readFileSync(resolve(process.env.SUPPORT_FIXTURE_PROVISION_INPUT), 'utf8'));
  const request = supportFixtureProvisionSchema.parse(envelope.request);
  const manifest = JSON.parse(readFileSync(resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT), 'utf8'));
  if (manifest.projectRef !== 'hkoxhourxwlddgsfdgws' || manifest.runId !== request.runId
    || manifest.scenarioKey !== request.scenarioKey || manifest.negativeGatesPassed !== true
    || manifest.businessWritesAuthorized !== true || manifest.conversationIds.length !== request.contactNames.length) {
    throw new Error('Manifesto não corresponde à massa previamente autorizada.');
  }
  if (manifest.cleanupCompleted || manifest.uiProof?.folderDeleted) throw new Error('Execução encerrada; não recriar a pasta nem alterar o histórico retido.');
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('Credenciais oficiais do operador ausentes.');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) throw new Error('Navegador visível da porta 5173 ausente.');
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.setViewportSize({ width: 1440, height: 960 });
  const conversationIds = new Set<string>(manifest.conversationIds);
  const folderIds = new Set<string>();
  let verified = false;
  let unauthorizedCentralWrites = 0;
  let noteCalls = 0;
  const readRPCs = new Set(['customer_support_list_conversations', 'customer_support_conversation_counts',
    'customer_support_list_agents', 'customer_support_list_customer_summaries', 'customer_support_count_customer_orders',
    'customer_support_can_view', 'customer_support_can_view_commercial_info', 'customer_support_test_fixture_manifest']);
  const writeRPCs = new Set(['customer_support_assign_conversation', 'customer_support_set_conversation_status',
    'customer_support_add_internal_note', 'customer_support_set_internal_notes', 'customer_support_update_tag']);
  const guard = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue();
    if (method === 'POST' && (url.pathname === '/auth/v1/token'
      || (url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local')
      || (url.origin === 'http://localhost:5173' && url.pathname === '/api/testing/test-artifact-operator'))) return route.continue();
    let body: Record<string, any> = {};
    try { body = req.postDataJSON() || {}; } catch { /* A non-JSON write is never authorized here. */ }
    const rpc = url.pathname.startsWith('/rest/v1/rpc/') ? url.pathname.split('/').pop()! : '';
    if (method === 'POST' && readRPCs.has(rpc)) return route.continue();
    if (verified && method === 'POST' && writeRPCs.has(rpc) && conversationIds.has(body.p_conversation_id)
      && (rpc !== 'customer_support_assign_conversation' || body.p_assignee_id === null || body.p_assignee_id === manifest.ownerId)) {
      if (rpc === 'customer_support_add_internal_note') noteCalls++;
      return route.continue();
    }
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (verified && method === 'PATCH' && url.pathname === '/rest/v1/whatsapp_conversations' && id && conversationIds.has(id)
      && Object.keys(body).every((key) => ['unread_count', 'is_archived', 'updated_at'].includes(key))) return route.continue();
    if (verified && url.pathname === '/rest/v1/customer_support_inboxes') {
      const meta = body.criteria?.testArtifact;
      if (method === 'POST' && !Array.isArray(body) && body.created_by === manifest.ownerId
        && meta?.is_test === true && meta.runId === manifest.runId && meta.ownerId === manifest.ownerId
        && meta.scenarioKey === manifest.scenarioKey) return route.continue();
      if (id && folderIds.has(id) && ['PATCH', 'DELETE'].includes(method)) return route.continue();
    }
    if (url.pathname.includes('/whatsapp_') || url.pathname.includes('/customer_support_')) unauthorizedCentralWrites++;
    return route.abort('blockedbyclient');
  };
  await context.route('**/*', guard);
  try {
    console.info('[support-owned] autenticar operador');
    await page.goto('http://localhost:5173/login');
    try {
      const sameOperator = await page.evaluate(async (expected) => {
        const path = '/src/pages/utils/supabaseConfig.ts';
        const { supabase } = await import(path);
        const result = await supabase.auth.getUser();
        const same = !result.error && result.data.user?.email?.trim().toLowerCase() === expected.toLowerCase();
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
      throw new Error('Login do operador não concluiu; credenciais não serão registradas.');
    }
    console.info('[support-owned] conferir vínculos remotos');
    const ownership = await page.evaluate(async ({ runId, ownerId, ids, principalId, scenarioKey }) => {
      const path = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(path);
      const user = await supabase.auth.getUser();
      const session = await supabase.auth.getSession();
      if (user.data.user?.id !== ownerId || !session.data.session) return { verified: false, folderIds: [], principalMessages: 0, totalMessages: 0 };
      const gate = await fetch('/api/testing/test-artifact-operator', { method: 'POST',
        headers: { Authorization: `Bearer ${session.data.session.access_token}` } });
      if (gate.status !== 204) return { verified: false, folderIds: [], principalMessages: 0, totalMessages: 0 };
      const remote = await supabase.rpc('customer_support_test_fixture_manifest', { p_run_id: runId });
      const rows = await supabase.from('whatsapp_messages').select('conversation_id, raw_payload').in('conversation_id', ids);
      const folders = await supabase.from('customer_support_inboxes').select('id, criteria')
        .eq('created_by', ownerId).contains('criteria', { testArtifact: { runId, ownerId } });
      const sameIds = !remote.error && remote.data.principalConversationId === principalId
        && JSON.stringify([...remote.data.conversationIds].sort()) === JSON.stringify([...ids].sort());
      const sameOwner = !rows.error && (rows.data?.length || 0) >= 131 && rows.data?.every((row: any) =>
        row.raw_payload?.testArtifact?.is_test === true && row.raw_payload?.testArtifact?.runId === runId
        && row.raw_payload?.testArtifact?.ownerId === ownerId && row.raw_payload?.testArtifact?.scenarioKey === scenarioKey);
      return { verified: Boolean(sameIds && sameOwner && !folders.error), folderIds: folders.data?.map((row: any) => row.id) || [],
        principalMessages: rows.data?.filter((row: any) => row.conversation_id === principalId).length || 0,
        totalMessages: rows.data?.length || 0 };
    }, { runId: manifest.runId, ownerId: manifest.ownerId, ids: manifest.conversationIds,
      principalId: manifest.principalConversationId, scenarioKey: manifest.scenarioKey });
    expect(ownership.verified, 'Os vínculos reais devem passar antes de qualquer escrita.').toBe(true);
    expect(ownership.totalMessages || 0).toBeLessThanOrEqual(145);
    ownership.folderIds.forEach((id: string) => folderIds.add(id));
    verified = true;
    console.info('[support-owned] vincular contexto da execução');
    await page.goto('http://localhost:5173/atendimento');
    await expect(page.getByText('Pastas compartilhadas', { exact: true })).toBeVisible();
    const contextModulePath = '/@fs/' + resolve('../shared-utils/testArtifactContext.ts').replaceAll('\\', '/');
    await page.evaluate(async ({ path, identity }) => {
      const { bindTestArtifactContext } = await import(path);
      bindTestArtifactContext(identity);
    }, { path: contextModulePath, identity: { runId: manifest.runId, ownerId: manifest.ownerId, scenarioKey: manifest.scenarioKey } });
    console.info('[support-owned] criar ou reabrir pasta');
    const folderName = `Inbox ${request.runId.slice(0, 8)}`;
    if (folderIds.size === 0) {
      await page.getByRole('button', { name: 'Criar pasta compartilhada', exact: true }).click();
      console.info('[support-owned] formulário de pasta aberto');
      const dialog = page.getByRole('dialog', { name: 'Nova pasta compartilhada' });
      const marker = dialog.getByRole('checkbox', { name: 'Pasta de teste desta execução' });
      await expect(marker).not.toBeChecked();
      await marker.check();
      await dialog.getByLabel('Nome da pasta').fill(folderName);
      await dialog.getByLabel('Busca textual').fill(request.runId.slice(0, 8));
      const [saved] = await Promise.all([page.waitForResponse((response) =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === '/rest/v1/customer_support_inboxes'),
      dialog.getByRole('button', { name: 'Criar pasta', exact: true }).click()]);
      expect(saved.status()).toBe(201);
      const row = await saved.json();
      expect(row.created_by === manifest.ownerId && row.criteria?.testArtifact?.runId === manifest.runId).toBe(true);
      folderIds.add(row.id);
      console.info('[support-owned] pasta persistida');
      await expect(dialog).toHaveCount(0);
    } else {
      await page.getByTitle(`Pasta compartilhada: ${folderName}`, { exact: true }).click();
    }
    const list = page.getByRole('region', { name: 'Lista de conversas', exact: true });
    const count = list.getByText(/^\d+ de \d+ conversas$/);
    await expect(count).toHaveText('50 de 51 conversas');
    const [secondPage] = await Promise.all([page.waitForResponse((response) => {
      if (!response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')) return false;
      const body = response.request().postDataJSON();
      return body?.p_page === 2 && body?.p_criteria?.testArtifact?.runId === manifest.runId;
    }), list.evaluate((element) => { element.scrollTop = element.scrollHeight; })]);
    expect(secondPage.status()).toBe(200);
    const more = await secondPage.json();
    expect(more.length === 1 && conversationIds.has(more[0].id)).toBe(true);
    await expect(count).toHaveText('51 de 51 conversas');
    console.info('[support-owned] duas páginas de conversas conferidas');

    await page.reload();
    await page.getByTitle(`Pasta compartilhada: ${folderName}`, { exact: true }).click();
    await expect(count).toHaveText('50 de 51 conversas');
    // The principal can be on either page because identical timestamps use the UUID tie-breaker.
    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(count).toHaveText('51 de 51 conversas');
    await list.getByText(request.contactNames[0], { exact: true }).click();
    const timeline = page.getByRole('region', { name: 'Histórico da conversa', exact: true });
    const notes = timeline.getByText(new RegExp(`^Histórico ${request.runId.slice(0, 8)}: \\d{3}$`));
    const messageRows = timeline.locator('[data-message-id]');
    await expect(messageRows).toHaveCount(80);
    const [previousMessages] = await Promise.all([page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/rest/v1/whatsapp_messages' && url.searchParams.get('conversation_id') === `eq.${manifest.principalConversationId}`
        && url.searchParams.has('or');
    }), timeline.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); })]);
    expect(previousMessages.status()).toBe(200);
    expect((await previousMessages.json()).length).toBe((ownership.principalMessages || 0) - 80);
    await expect(messageRows).toHaveCount(ownership.principalMessages || 0);
    await expect(notes).toHaveCount(81);
    expect(unauthorizedCentralWrites).toBe(0);
    expect(noteCalls).toBe(0);
    console.info('[support-owned] histórico anterior conferido; copiar snippet sem gravar nota');
    await page.bringToFront();
    await context.grantPermissions(['clipboard-write'], { origin: 'http://localhost:5173' });
    await page.getByRole('button', { name: 'Respostas rápidas', exact: true }).click();
    const snippets = page.getByRole('dialog', { name: 'Respostas Rápidas & Modelos' });
    await snippets.getByRole('button', { name: /Copiar/ }).first().click();
    await expect(page.getByText(/copiado para a área de transferência\./)).toBeVisible();
    // The UI confirms the actual writeText promise; exact payload is covered by RTL.
    // Reading the OS clipboard is unnecessary and can leave a native prompt pending.
    console.info('[support-owned] cópia confirmada pela interface, sem chamada de comentário');
    await snippets.getByRole('button', { name: 'Fechar', exact: true }).click();
    expect(noteCalls).toBe(0);
    await expect(messageRows).toHaveCount(ownership.principalMessages || 0);

    console.info('[support-owned] comentário e comandos de atendimento');
    const comment = `Prova de comentário ${request.runId.slice(0, 8)}`;
    if (await timeline.getByText(comment, { exact: true }).count() === 0) {
      await page.getByRole('button', { name: /Add Comment/ }).click();
      await page.getByPlaceholder(/Escreva uma anotação interna/).fill(comment);
      const [savedComment] = await Promise.all([page.waitForResponse((response) =>
        response.url().endsWith('/rest/v1/rpc/customer_support_add_internal_note')),
      page.getByRole('button', { name: /Salvar Comentário/ }).click()]);
      expect(savedComment.status()).toBe(200);
      const row = (await savedComment.json())[0];
      expect(row.raw_payload?.author_id === manifest.ownerId && row.raw_payload?.testArtifact?.runId === manifest.runId).toBe(true);
    }
    await expect(timeline.getByText(comment, { exact: true })).toHaveCount(1);
    await page.getByTitle('Atendente responsável pelo atendimento', { exact: true }).click();
    const [assigned] = await Promise.all([page.waitForResponse((response) =>
      response.url().endsWith('/rest/v1/rpc/customer_support_assign_conversation')),
    page.getByRole('button', { name: /Atribuir a mim/ }).click()]);
    expect(assigned.status()).toBe(200);
    const close = page.getByRole('button', { name: /Close/ }).first();
    if (await close.count()) {
      const [closed] = await Promise.all([page.waitForResponse((response) =>
        response.url().endsWith('/rest/v1/rpc/customer_support_set_conversation_status')
        && response.request().postDataJSON()?.p_status === 'closed'), close.click()]);
      expect(closed.status()).toBe(200);
    }
    const [reopened] = await Promise.all([page.waitForResponse((response) =>
      response.url().endsWith('/rest/v1/rpc/customer_support_set_conversation_status')
      && response.request().postDataJSON()?.p_status === 'open'), page.getByRole('button', { name: /Reopen/ }).click()]);
    expect(reopened.status()).toBe(200);
    const persisted = await page.evaluate(async ({ id, ownerId, runId, commentText }) => {
      const path = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(path);
      const conversation = await supabase.from('whatsapp_conversations').select('assigned_to, is_archived').eq('id', id).single();
      const messages = await supabase.from('whatsapp_messages').select('id, raw_payload, text_content').eq('conversation_id', id);
      return { correctConversation: !conversation.error && conversation.data.assigned_to === ownerId && !conversation.data.is_archived,
        correctAuthors: !messages.error && messages.data.every((row: any) => row.raw_payload?.author_id === ownerId
          && row.raw_payload?.testArtifact?.runId === runId), comments: messages.data?.filter((row: any) => row.text_content === commentText).length,
        messageCount: messages.data?.length || 0 };
    }, { id: manifest.principalConversationId, ownerId: manifest.ownerId, runId: manifest.runId, commentText: comment });
    expect(persisted.correctConversation && persisted.correctAuthors && persisted.comments === 1).toBe(true);
    await expect(messageRows).toHaveCount(persisted.messageCount, { timeout: 15_000 });
    const uniqueTimeline = await messageRows.evaluateAll((nodes) => new Set(nodes.map((node) => node.getAttribute('data-message-id'))).size === nodes.length);
    expect(uniqueTimeline).toBe(true);
    expect(unauthorizedCentralWrites).toBe(0);
    console.info('[support-owned] tags, notas e edição da pasta');
    await page.getByRole('button', { name: 'Painel de informações do cliente', exact: true }).click();
    await page.getByRole('button', { name: 'Atendimento', exact: true }).click();
    const teamNotes = page.getByPlaceholder('Observações visíveis somente para a equipe interna...');
    const savedNotes = `Resumo validado ${request.runId.slice(0, 8)}`;
    await teamNotes.fill(savedNotes);
    const tagInput = page.getByPlaceholder('Adicionar marcador');
    await tagInput.fill('STATUS:closed');
    await tagInput.press('Enter');
    await expect(page.getByText('Marcadores de status são gerenciados pelas ações do atendimento.', { exact: true })).toBeVisible();
    const tag = `prova-${request.runId.slice(0, 8)}`;
    await tagInput.fill(tag);
    const [tagSaved] = await Promise.all([page.waitForResponse((response) =>
      response.url().endsWith('/rest/v1/rpc/customer_support_update_tag')
      && response.request().postDataJSON()?.p_tag === tag && response.request().postDataJSON()?.p_remove === false),
    tagInput.press('Enter')]);
    expect(tagSaved.status()).toBe(200);
    await expect(teamNotes).toHaveValue(savedNotes);
    const [notesSaved] = await Promise.all([page.waitForResponse((response) =>
      response.url().endsWith('/rest/v1/rpc/customer_support_set_internal_notes')),
    page.getByRole('button', { name: 'Salvar Notas', exact: true }).click()]);
    expect(notesSaved.status()).toBe(200);
    const notesAndTagsPersisted = await page.evaluate(async ({ id, expectedNotes, expectedTag }) => {
      const path = '/src/pages/utils/supabaseConfig.ts';
      const { supabase } = await import(path);
      const response = await supabase.from('whatsapp_conversations').select('internal_notes, tags').eq('id', id).single();
      return !response.error && response.data.internal_notes === expectedNotes && response.data.tags.includes(expectedTag);
    }, { id: manifest.principalConversationId, expectedNotes: savedNotes, expectedTag: tag });
    expect(notesAndTagsPersisted).toBe(true);
    const [tagRemoved] = await Promise.all([page.waitForResponse((response) =>
      response.url().endsWith('/rest/v1/rpc/customer_support_update_tag')
      && response.request().postDataJSON()?.p_tag === tag && response.request().postDataJSON()?.p_remove === true),
    page.getByRole('button', { name: `Remover tag ${tag}`, exact: true }).click()]);
    expect(tagRemoved.status()).toBe(200);
    await page.getByRole('button', { name: 'Fechar painel', exact: true }).click();

    await page.evaluate(async ({ path, identity }) => {
      const { bindTestArtifactContext } = await import(path);
      bindTestArtifactContext(identity);
    }, { path: contextModulePath, identity: { runId: manifest.runId, ownerId: manifest.ownerId, scenarioKey: manifest.scenarioKey } });
    await page.getByRole('button', { name: `Editar pasta ${folderName}`, exact: true }).click();
    const editFolder = page.getByRole('dialog', { name: 'Editar pasta compartilhada' });
    await editFolder.getByLabel('Busca textual').fill(`Inbox ${request.runId.slice(0, 8)}`);
    const [folderUpdated] = await Promise.all([page.waitForResponse((response) =>
      response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/rest/v1/customer_support_inboxes'),
    editFolder.getByRole('button', { name: 'Salvar alterações', exact: true }).click()]);
    expect(folderUpdated.status()).toBe(200);
    const updatedFolder = await folderUpdated.json();
    expect(updatedFolder.criteria.search === `Inbox ${request.runId.slice(0, 8)}`
      && updatedFolder.criteria.testArtifact.ownerId === manifest.ownerId && updatedFolder.criteria.testArtifact.runId === manifest.runId).toBe(true);
    await expect(editFolder).toHaveCount(0);
    console.info('[support-owned] excluir somente a pasta própria');
    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'confirm' && dialog.message().includes(folderName)) await dialog.accept();
      else await dialog.dismiss();
    });
    const [folderDeleted] = await Promise.all([page.waitForResponse((response) =>
      response.request().method() === 'DELETE' && new URL(response.url()).pathname === '/rest/v1/customer_support_inboxes'),
    page.getByRole('button', { name: `Excluir pasta ${folderName}`, exact: true }).click()]);
    expect(folderDeleted.status()).toBe(200);
    await expect(page.getByTitle(`Pasta compartilhada: ${folderName}`, { exact: true })).toHaveCount(0);
    expect(unauthorizedCentralWrites).toBe(0);
    writeFileSync(resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT!), JSON.stringify({ ...manifest,
      folderId: [...folderIds][0], uiProof: { folderReopened: true, conversationPages: 2,
        conversations: 51, historyMessages: 81, snippetCopiedWithoutNote: true, commentPersisted: true,
        assignmentAndStatus: true, timelineUnique: true, tagsAndNotes: true, folderEdited: true, folderDeleted: true,
        completedAt: new Date().toISOString() },
    }, null, 2) + '\n', 'utf8');
  } finally {
    await context.clearPermissions();
    await context.unroute('**/*', guard);
    await browser.close();
  }
});
