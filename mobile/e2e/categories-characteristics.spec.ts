import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const START_URL = '/?auth_email=matheusmorante002@gmail.com&tab=produtos';

test.describe('Menu e Ambiente de Categorias e Características (Mobile App)', () => {
  test('1. Navega para a tela de Ambientes e Categorias e alterna entre as visualizações', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    // Alterna modo para Ambientes e Categorias no topo
    await page.locator('#root').getByText('Ambientes e Categorias').first().click();

    // Valida alternância entre visualização Por ambiente e Por categoria
    const envViewBtn = page.getByText('Por ambiente', { exact: true }).first();
    const catViewBtn = page.getByText('Por categoria', { exact: true }).first();

    await expect(envViewBtn).toBeVisible();
    await expect(catViewBtn).toBeVisible();

    // Clica na visão Por categoria
    await catViewBtn.click();
    await expect(page.getByText(/Todas \(/i).first()).toBeVisible();
    await expect(page.getByText(/Com ambiente \(/i).first()).toBeVisible();
    await expect(page.getByText(/Sem ambiente \(/i).first()).toBeVisible();
  });

  test('2. Filtra categorias por órfãs (Sem ambiente) e aplica busca textual', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    // Acessa Ambientes e Categorias
    await page.locator('#root').getByText('Ambientes e Categorias').first().click();

    // Alterna para Categoria
    await page.getByText('Por categoria', { exact: true }).first().click();

    // Filtra por Sem ambiente (órfãs)
    const orphanFilterBtn = page.getByText(/Sem ambiente \(/i).first();
    await orphanFilterBtn.click();

    // Testa campo de pesquisa
    const searchInput = page.getByPlaceholder(/Buscar categoria\.\.\./i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('SOFA');
    await expect(searchInput).toHaveValue('SOFA');
    await searchInput.fill('');
  });

  test('3. Abre o modal de criação de Ambiente e comprova que cancelamento descarta dados sem persistir', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    await page.locator('#root').getByText('Ambientes e Categorias').first().click();

    // Clica no botão de Novo ambiente
    const newEnvBtn = page.getByText('Novo ambiente', { exact: true }).first();
    await expect(newEnvBtn).toBeVisible();
    await newEnvBtn.click();

    await expect(page.getByText('Novo Ambiente', { exact: true })).toBeVisible();
    const envInput = page.getByPlaceholder(/EX: SALA DE ESTAR/i);
    await expect(envInput).toBeVisible();

    // Digita um nome de teste no formulário
    await envInput.fill('AMBIENTE TEMPORARIO DESCARTAR');

    // Cancela o modal
    await page.getByText('Cancelar', { exact: true }).last().click();
    await expect(page.getByText('Novo Ambiente', { exact: true })).not.toBeVisible();

    // Reabre o modal e comprova que o estado anterior foi limpo e descartado
    await newEnvBtn.click();
    await expect(page.getByPlaceholder(/EX: SALA DE ESTAR/i)).toHaveValue('');
    await page.getByText('Cancelar', { exact: true }).last().click();
  });

  test('4. Abre o modal de Categoria, verifica Características da Categoria e cancela sem efeitos', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    await page.locator('#root').getByText('Ambientes e Categorias').first().click();

    // Alterna para visão Por categoria
    await page.getByText('Por categoria', { exact: true }).first().click();

    // Clica no botão Nova categoria
    const newCatBtn = page.getByText('Nova categoria', { exact: true }).first();
    await expect(newCatBtn).toBeVisible();
    await newCatBtn.click();

    await expect(page.getByText('Nova Categoria', { exact: true })).toBeVisible();
    const catInput = page.getByPlaceholder(/EX: SOFÁ RETRÁTIL/i);
    await expect(catInput).toBeVisible();

    // Verifica se a seção de Características da Categoria está renderizada
    await expect(page.getByText(/Características da Categoria/i)).toBeVisible();
    await expect(page.getByText(/Defina as características aplicáveis/i)).toBeVisible();

    // Digita e cancela, comprovando que alterações são descartadas
    await catInput.fill('CATEGORIA TEMPORARIA DESCARTAR');
    await page.getByText('Cancelar', { exact: true }).last().click();
    await expect(page.getByText('Nova Categoria', { exact: true })).not.toBeVisible();

    // Reabre e confirma limpeza
    await newCatBtn.click();
    await expect(page.getByPlaceholder(/EX: SOFÁ RETRÁTIL/i)).toHaveValue('');
    await page.getByText('Cancelar', { exact: true }).last().click();
  });

  test('5. Abre o menu de Configurações de Produto e interage com tipos de dados de Atributos e Características', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    // Abre opções de produtos
    await page.getByLabel('Opções de produtos').click();
    await page.getByText('Configurações de Produto', { exact: true }).click();

    // Clica na opção Atributos e Variações
    await expect(page.getByText('Atributos e Variações', { exact: true })).toBeVisible();
    await page.getByText('Atributos e Variações', { exact: true }).click();

    // Verifica que o modal de Atributos e Variações abriu com os seletores de tipos de dados
    await expect(page.getByPlaceholder(/Novo atributo/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Unidade \(opcional\)/i)).toBeVisible();

    // Interage com os botões de tipo de dados
    const intTypeBtn = page.getByText('Inteiro', { exact: true });
    await expect(intTypeBtn).toBeVisible();
    await intTypeBtn.click();

    const decTypeBtn = page.getByText('Decimal', { exact: true });
    await expect(decTypeBtn).toBeVisible();
    await decTypeBtn.click();

    // Testa alternância de obrigatoriedade global
    const reqBtn = page.getByText(/Opcional|Obrigatória/i).first();
    await expect(reqBtn).toBeVisible();
    await reqBtn.click();
    await expect(page.getByText(/Obrigatória/i).first()).toBeVisible();
  });

  test('6. Fluxo de UI com API simulada — criação, vínculo, edição e exclusão', async ({ page }) => {
    const runId = `E2E_${Date.now()}_${randomUUID()}`;
    const testEnvName = `${runId}_ENV`;
    const testCatName = `${runId}_CAT`;
    const testCatEditedName = `${runId}_CAT_EDIT`;

    // Store em memória para isolamento determinístico e proteção contra RLS de produção
    let environments: any[] = [];
    let categories: any[] = [];
    let relationships: { parent_id: string; child_id: string }[] = [];

    await page.route('**/rest/v1/categories*', async route => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const url = req.url();

      if (method === 'GET' || method === 'HEAD') {
        if (url.includes('type=eq.environment')) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(environments) });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...environments, ...categories]) });
        }
      } else if (method === 'POST') {
        const body = req.postDataJSON();
        const items = Array.isArray(body) ? body : [body];
        const created = items.map((item: any, idx: number) => ({
          id: `node-${Date.now()}-${idx}`,
          name: item.name,
          type: item.type || 'category'
        }));
        created.forEach((item: any) => {
          if (item.type === 'environment') environments.push(item);
          else categories.push(item);
        });
        const accept = req.headers()['accept'] || '';
        const isSingle = accept.includes('vnd.pgrst.object+json');
        await route.fulfill({
          status: 201,
          contentType: isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
          body: JSON.stringify(isSingle ? created[0] : created)
        });
      } else if (method === 'PATCH') {
        const patchData = req.postDataJSON();
        const matchId = url.match(/id=eq\.([^&]+)/);
        let updated: any = null;
        if (matchId) {
          const targetId = decodeURIComponent(matchId[1]);
          const env = environments.find(e => e.id === targetId);
          if (env) { Object.assign(env, patchData); updated = env; }
          const cat = categories.find(c => c.id === targetId);
          if (cat) { Object.assign(cat, patchData); updated = cat; }
        }
        const accept = req.headers()['accept'] || '';
        const isSingle = accept.includes('vnd.pgrst.object+json');
        await route.fulfill({
          status: 200,
          contentType: isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
          body: JSON.stringify(isSingle ? updated : (updated ? [updated] : []))
        });
      } else if (method === 'DELETE') {
        const matchId = url.match(/id=eq\.([^&]+)/);
        if (matchId) {
          const targetId = decodeURIComponent(matchId[1]);
          environments = environments.filter(e => e.id !== targetId);
          categories = categories.filter(c => c.id !== targetId);
          relationships = relationships.filter(r => r.parent_id !== targetId && r.child_id !== targetId);
        }
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.continue();
      }
    });

    await page.route('**/rest/v1/category_relationships*', async route => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const url = req.url();

      if (method === 'GET' || method === 'HEAD') {
        let filtered = relationships;
        const parentMatch = url.match(/parent_id=eq\.([^&]+)/);
        if (parentMatch) {
          filtered = filtered.filter(r => r.parent_id === decodeURIComponent(parentMatch[1]));
        }
        const childMatch = url.match(/child_id=eq\.([^&]+)/);
        if (childMatch) {
          filtered = filtered.filter(r => r.child_id === decodeURIComponent(childMatch[1]));
        }
        const total = filtered.length;
        const range = total > 0 ? `0-${total - 1}/${total}` : '*/0';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': range },
          body: method === 'HEAD' ? '' : JSON.stringify(filtered)
        });
      } else if (method === 'POST') {
        const body = req.postDataJSON();
        const items = Array.isArray(body) ? body : [body];
        relationships.push(...items);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(items) });
      } else if (method === 'DELETE') {
        const parentMatch = url.match(/parent_id=eq\.([^&]+)/);
        const childMatch = url.match(/child_id=eq\.([^&]+)/);
        if (parentMatch && childMatch) {
          relationships = relationships.filter(r => !(r.parent_id === decodeURIComponent(parentMatch[1]) && r.child_id === decodeURIComponent(childMatch[1])));
        } else if (parentMatch) {
          relationships = relationships.filter(r => r.parent_id !== decodeURIComponent(parentMatch[1]));
        } else if (childMatch) {
          relationships = relationships.filter(r => r.child_id !== decodeURIComponent(childMatch[1]));
        }
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.continue();
      }
    });

    await page.route('**/rest/v1/product_categories*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '*/0' },
        body: route.request().method() === 'HEAD' ? '' : JSON.stringify([])
      });
    });

    await page.route('**/rest/v1/products*', async route => {
      const req = route.request();
      if (req.method() === 'HEAD' || req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '*/0' },
          body: req.method() === 'HEAD' ? '' : JSON.stringify([])
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/rest/v1/category_attributes*', async route => {
      const req = route.request();
      const method = req.method().toUpperCase();
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (method === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.continue();
      }
    });

    try {
      await page.goto(START_URL);
      await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

      // 1. Acessa Ambientes e Categorias
      await page.locator('#root').getByText('Ambientes e Categorias').first().click();

      // Garante visão Por ambiente
      await page.getByText('Por ambiente', { exact: true }).first().click();

      // 2. Criação de Ambiente via UI
      await page.getByText('Novo ambiente', { exact: true }).first().click();
      await expect(page.getByText('Novo Ambiente', { exact: true })).toBeVisible();
      await page.getByPlaceholder(/EX: SALA DE ESTAR/i).fill(testEnvName);
      await page.getByText('Criar Ambiente', { exact: true }).click();
      await expect(page.getByText('Novo Ambiente', { exact: true })).not.toBeVisible();
      await expect(page.getByText(testEnvName, { exact: true })).toBeVisible({ timeout: 15000 });

      // Registra confirmação automática de diálogos nativos (Alert.alert / confirm)
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // 3. Criação de Categoria vinculada ao Ambiente via UI
      await page.getByText('Por categoria', { exact: true }).first().click();
      await page.getByText('Nova categoria', { exact: true }).first().click();
      await expect(page.getByText('Nova Categoria', { exact: true })).toBeVisible();
      await page.getByPlaceholder(/EX: SOFÁ RETRÁTIL/i).fill(testCatName);

      // Marca o vínculo com o ambiente criado clicando na opção dentro do modal
      await page.getByText(testEnvName, { exact: true }).last().click();
      await page.getByText('Criar Categoria', { exact: true }).click();
      await expect(page.getByText('Nova Categoria', { exact: true })).not.toBeVisible();
      await expect(page.getByText(testCatName, { exact: true })).toBeVisible({ timeout: 15000 });

      // 4. Comprova visualização da categoria dentro do ambiente
      await page.getByText('Por ambiente', { exact: true }).first().click();
      await expect(page.getByText(testCatName, { exact: true })).toBeVisible({ timeout: 10000 });

      // 5. Edição da Categoria via UI
      await page.getByText('Por categoria', { exact: true }).first().click();
      const editCatBtn = page.getByRole('button', { name: `Editar categoria ${testCatName}` });
      await editCatBtn.click();
      await expect(page.getByText('Editar Categoria', { exact: true })).toBeVisible();
      const catInput = page.getByPlaceholder(/EX: SOFÁ RETRÁTIL/i);
      await catInput.fill(testCatEditedName);
      await page.getByText('Salvar Alterações', { exact: true }).click();
      await expect(page.getByText('Editar Categoria', { exact: true })).not.toBeVisible();
      await expect(page.getByText(testCatEditedName, { exact: true })).toBeVisible({ timeout: 15000 });

      // 6. Exclusão e Teardown via UI com confirmação de diálogo nativo
      const deleteCatBtn = page.getByRole('button', { name: `Excluir categoria ${testCatEditedName}` });
      await deleteCatBtn.click();
      await expect(page.getByText(testCatEditedName, { exact: true })).not.toBeVisible({ timeout: 15000 });

      // Alterna para ambientes e exclui o ambiente (agora vazio)
      await page.getByText('Por ambiente', { exact: true }).first().click();
      const deleteEnvBtn = page.getByRole('button', { name: `Excluir ambiente ${testEnvName}` });
      await deleteEnvBtn.click();
      await expect(page.getByText(testEnvName, { exact: true })).not.toBeVisible({ timeout: 15000 });
    } finally {
      // Descarta somente o estado local simulado; nenhuma chamada ao banco é feita.
      environments.length = 0;
      categories.length = 0;
      relationships.length = 0;
    }
  });
});
