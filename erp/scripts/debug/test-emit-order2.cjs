const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');


const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function main() {
  console.log('[1] Autenticando com Supabase...');
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await supa.auth.signInWithPassword({
    email: 'matheusmorante002@gmail.com',
    password: 'Morantenho@12345'
  });

  if (authErr || !authData.session) {
    console.error('Falha no login Supabase:', authErr);
    process.exit(1);
  }

  const session = authData.session;
  console.log('✅ Sessão obtida para:', authData.user.email);

  console.log('[2] Iniciando navegador Chrome/Chromium...');
  const browser = await chromium.launch({
    headless: false, // abre o navegador visível para o usuário acompanhar
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('nfe') || text.includes('Nfe') || text.includes('fiscal') || text.includes('Fiscal')) {
      console.log(`[Browser Console ${msg.type()}]:`, text);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/nfe/')) {
      console.log(`\n>>> [API Response ${res.status()}]: ${url}`);
      try {
        const body = await res.text();
        console.log('>>> [API Response Body]:', body);
      } catch (e) {
        console.log('>>> [API Response Body could not be read]');
      }
    }
  });

  console.log('[3] Navegando para o ERP e injetando sessão...');
  await page.goto('http://localhost:5173/login');
  await page.evaluate((sess) => {
    const key = 'sb-hkoxhourxwlddgsfdgws-auth-token';
    window.localStorage.setItem(key, JSON.stringify(sess));
  }, session);

  console.log('[4] Indo para /sales-order...');
  await page.goto('http://localhost:5173/sales-order');

  console.log('[5] Aguardando carregar pedidos...');
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  console.log(`Encontradas ${count} linhas de pedidos na tabela.`);

  if (count < 2) {
    console.error('Menos de 2 pedidos na tabela!');
    await browser.close();
    return;
  }

  // Identificar o segundo pedido
  const secondRow = rows.nth(1);
  const secondRowText = await secondRow.innerText();
  console.log('Segundo pedido (texto da linha):', secondRowText.replace(/\s+/g, ' ').slice(0, 150));

  console.log('[6] Abrindo menu de ações do segundo pedido...');
  const menuBtn = secondRow.locator('button i.bi-three-dots-vertical').locator('..');
  await menuBtn.click();
  await page.waitForTimeout(1000);

  console.log('[7] Clicando em "AÇÕES PÓS-VENDA"...');
  const postSaleBtn = page.locator('button:has-text("Ações pós-venda"), button:has-text("AÇÕES PÓS-VENDA")').first();
  await postSaleBtn.click();
  await page.waitForTimeout(1000);

  console.log('[7.1] Procurando botão de emitir nota fiscal no modal pós-venda...');
  const issueNfeBtn = page.locator('button:has-text("Emitir nota fiscal"), button:has-text("Emitir Nota Fiscal"), button:has-text("Emitir NF-e")').first();
  await issueNfeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await issueNfeBtn.click();
  await page.waitForTimeout(1500);

  const hmlButton = page.locator('button:has-text("Homologação"), button:has-text("homologação"), button:has-text("Homologacao")').first();
  if (await hmlButton.isVisible()) {
    console.log('[8] Selecionando ambiente de Homologação...');
    await hmlButton.click();
    await page.waitForTimeout(2000);
  }

  console.log('[9] Aguardando carregamento do modal de emissão...');
  await page.waitForSelector('text=Carregando dados do cliente e dos produtos', { state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Verificar campo NCM do item 0
  const ncmInput = page.locator('#nfe-item-ncm-0');
  if (await ncmInput.isVisible().catch(() => false)) {
    const currentNcm = await ncmInput.inputValue().catch(() => '');
    console.log(`Valor atual do NCM do item 1: "${currentNcm}"`);
    if (!currentNcm || currentNcm.replace(/\D/g, '').length < 8) {
      console.log('Preenchendo NCM 94035000...');
      await ncmInput.fill('94035000');
      await page.waitForTimeout(500);
      const dropdownOption = page.locator('div:has-text("9403.50.00"), div:has-text("94035000")').first();
      if (await dropdownOption.isVisible().catch(() => false)) {
        await dropdownOption.click();
      } else {
        await ncmInput.press('Enter');
      }
      await page.waitForTimeout(1000);
    }
  }

  console.log('[10] Localizando botão de emissão final...');
  const emitActionBtn = page.locator('button:has-text("Emitir Nota"), button:has-text("Emitir NF-e"), button:has-text("Emitir NFC-e"), button:has-text("Transmitir")').last();
  await emitActionBtn.waitFor({ state: 'visible', timeout: 10000 });
  const emitBtnText = await emitActionBtn.innerText().catch(() => 'N/A');
  console.log('Botão de ação final encontrado:', emitBtnText);

  await page.screenshot({ path: 'scripts/debug-ready-to-emit.png' });
  console.log('[10.1] Clicando no botão de emitir...');
  await emitActionBtn.click();

  console.log('[11] Aguardando processamento e resposta da SEFAZ...');
  // Aguardar até 25s por resultado
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(3000);
    const toasts = await page.locator('.Toastify__toast').allInnerTexts().catch(() => []);
    if (toasts.length > 0) {
      console.log(`[Toasts em t+${(i+1)*3}s]:`, toasts);
    }
    // Verificar se modal fechou ou se há badge de sucesso
    const successCard = await page.locator('text=/Nota Fiscal Emitida|Homologada|Autorizada/i').first().isVisible().catch(() => false);
    if (successCard) {
      console.log('✅ Mensagem de sucesso detectada na tela!');
      break;
    }
  }

  await page.screenshot({ path: 'scripts/debug-final-state.png' });
  console.log('[12] Screenshot salvo em scripts/debug-final-state.png');
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('[Fim do teste de emissão]');
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
