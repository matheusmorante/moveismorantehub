const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');


const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function main() {
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData } = await supa.auth.signInWithPassword({
    email: 'matheusmorante002@gmail.com',
    password: 'Morantenho@12345'
  });

  const session = authData.session;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  await page.goto('http://localhost:5173/login');
  await page.evaluate((sess) => {
    const key = 'sb-hkoxhourxwlddgsfdgws-auth-token';
    window.localStorage.setItem(key, JSON.stringify(sess));
  }, session);

  await page.goto('http://localhost:5173/sales-order');
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const rows = page.locator('table tbody tr');
  const secondRow = rows.nth(1);
  const secondRowText = await secondRow.innerText();
  console.log('Linha do pedido 2:', secondRowText.replace(/\s+/g, ' '));

  await page.screenshot({ path: 'scripts/order2-authorized-list.png' });

  // Abrir o menu de ações do segundo pedido
  const menuBtn = secondRow.locator('button i.bi-three-dots-vertical').locator('..');
  await menuBtn.click();
  await page.waitForTimeout(1000);

  // Clicar em Ações Pós-Venda
  const postSaleBtn = page.locator('button:has-text("Ações pós-venda"), button:has-text("AÇÕES PÓS-VENDA")').first();
  await postSaleBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'scripts/order2-post-sale-modal.png' });

  console.log('Verificando se o modal de pós-venda exibe a nota homologada...');
  const postSaleContent = await page.locator('.modal, [role="dialog"], div.fixed').first().innerText().catch(() => '');
  console.log('Conteúdo do modal pós-venda:', postSaleContent.slice(0, 300));

  await page.waitForTimeout(4000);
  await browser.close();
  console.log('Concluído com sucesso!');
}

main().catch(console.error);
