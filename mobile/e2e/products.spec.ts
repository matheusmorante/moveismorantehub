import { test, expect } from '@playwright/test';

const START_URL = '/?auth_email=matheusmorante002@gmail.com&tab=produtos';

test.describe('Módulo de Produtos - E2E (Mobile on Web)', () => {
  test('renderiza lista, filtros e formulário de edição', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByPlaceholder(/Buscar por nome, código, SKU|Buscar composições/i)).toBeVisible();
    await expect(page.getByText(/Variações \(/i).first()).toBeVisible();

    await page.getByLabel('Opções de produtos').click();
    await page.getByText('Filtros avançados', { exact: true }).click();
    await expect(page.getByText('Filtros de produtos', { exact: true })).toBeVisible();
    await expect(page.getByText('Situação no ERP', { exact: true })).toBeVisible();
    await page.getByText('Aplicar filtros', { exact: true }).click();

    const editButton = page.getByLabel(/Editar .+/).first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    await expect(page.getByText('Editar Produto', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /ESTOQUE E PRECIFICAÇÃO/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /VARIAÇÕES/i })).toBeVisible();

    await page.getByRole('tab', { name: /ESTOQUE E PRECIFICAÇÃO/i }).click();
    await expect(page.getByText('Custo de Compra', { exact: true })).toBeVisible();
    await expect(page.getByText('Custo final de compra', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /TRIBUTÁRIO \/ NF/i }).click();
    await expect(page.getByText('Classificação Fiscal (NCM)', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /VARIAÇÕES/i }).click();
    await expect(page.getByText('VARIAÇÕES DO PRODUTO', { exact: true })).toBeVisible();
    await expect(page.getByText('Adicionar variação', { exact: true })).toBeVisible();
  });

  test('abre o cadastro de novo produto com validação inicial', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await page.getByLabel('Opções de produtos').click();
    await page.getByText('Novo Produto', { exact: true }).click();

    await expect(page.getByText('Cadastro de Produto', { exact: true })).toBeVisible();
    await expect(page.getByText('NOME *', { exact: true })).toBeVisible();
    await expect(page.getByText('CADASTRO GERAL', { exact: true })).toBeVisible();
    await expect(page.getByText('Salvar rascunho', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /PRÓXIMA ETAPA/i })).toBeVisible();
  });

  test('expõe configurações de categorias, atributos, ambientes e tipos de produto', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await page.getByLabel('Opções de produtos').click();
    await page.getByText('Configurações de Produto', { exact: true }).click();

    const configDialog = page.getByText('Configurações de Produto', { exact: true }).last();
    await expect(configDialog).toBeVisible();
    await expect(page.getByText('Categorias', { exact: true })).toBeVisible();
    await expect(page.getByText('Atributos e Variações', { exact: true })).toBeVisible();
    await expect(page.getByText('Ambientes e vínculos', { exact: true })).toBeVisible();
    await expect(page.getByText('Tipos de Produto', { exact: true })).toBeVisible();
  });

  test('abre o modo de composições e exibe a configuração de componentes', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });

    await page.getByText('Composições', { exact: true }).click();
    await expect(page.getByText('Composições', { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Buscar composições...')).toBeVisible();

    await page.getByLabel('Opções de produtos').click();
    await page.getByText('Nova Composição', { exact: true }).click();

    await expect(page.getByText('Cadastro de Produto', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /CADASTRO GERAL/i }).click();
    await page.getByPlaceholder('Digite o nome interno do produto (ex: SOFA 3 LUG)...').fill('Kit de teste');
    await page.getByRole('tab', { name: /VARIAÇÕES/i }).click();
    await page.getByText('Adicionar variação', { exact: true }).click();
    await page.getByText(/Produtos Componentes/i).click();
    await expect(page.getByPlaceholder('Buscar por nome ou código...')).toBeVisible();
    await expect(page.getByText(/Nenhum item na composição/i)).toBeVisible();
  });

  test('reabre uma composição existente com seus componentes persistidos', async ({ page }) => {
    await page.goto(START_URL);
    await expect(page.getByText('Produtos', { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await page.getByText('Composições', { exact: true }).click();
    await expect(page.getByPlaceholder('Buscar composições...')).toBeVisible();

    const editButtons = page.getByLabel(/Editar .+/);
    await expect(editButtons.first()).toBeVisible({ timeout: 60000 });
    await editButtons.first().click();
    await expect(page.getByText(/Editar Produto|Cadastro de Produto/i).first()).toBeVisible();
    await page.getByRole('tab', { name: /VARIAÇÕES/i }).click();
    await expect(page.getByText(/Variações \(/i).first()).toBeVisible();
    await page.getByLabel(/Editar detalhes da variação/i).first().click();
    const compositionTab = page.getByText(/Produtos Componentes/i).first();
    await expect(compositionTab).toBeVisible();
    await compositionTab.click();
    await expect(page.getByText(/Itens do Kit \(|Componentes/i).first()).toBeVisible();
  });

});
