const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../erp/node_modules/playwright'));
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  // Using a mobile or small screen viewport first, or desktop then resize
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/products...');
  await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Current page URL:', page.url());

  // Look for a product or "Novo Produto" or variation edit button
  // Let's check what buttons exist on the page
  const buttons = await page.$$eval('button', els => els.map(b => ({
    text: b.innerText.trim(),
    ariaLabel: b.getAttribute('aria-label'),
    title: b.getAttribute('title')
  })));
  console.log('Some buttons found:', buttons.slice(0, 15));

  // Let's see if there is "Novo Produto" button
  const novoProdutoBtn = await page.$('button:has-text("Novo Produto"), button:has-text("Adicionar Produto"), button:has-text("Novo")');
  if (novoProdutoBtn) {
    console.log('Clicking "Novo Produto"...');
    await novoProdutoBtn.click();
    await page.waitForTimeout(1500);
  } else {
    // Check if there are products with variations or edit buttons
    const editBtn = await page.$('button[title*="Editar"], button[aria-label*="Editar"]');
    if (editBtn) {
      console.log('Clicking edit button on product...');
      await editBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // Check if we are in Product modal
  const modalHeader = await page.$eval('body', b => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [data-variation-modal], [data-product-modal]'));
    return dialogs.map(d => d.innerText.slice(0, 100));
  });
  console.log('Dialogs present:', modalHeader);

  // If we are in Product modal, let's navigate to "Variações" tab or look for "Adicionar Variação"
  const tabVariacoes = await page.$('button[role="tab"]:has-text("Variações"), button:has-text("Variações")');
  if (tabVariacoes) {
    console.log('Clicking "Variações" tab...');
    await tabVariacoes.click();
    await page.waitForTimeout(1000);
  }

  // Look for button to add or edit variation
  const addVarBtn = await page.$('button:has-text("Adicionar Variação"), button:has-text("Nova Variação"), button[title*="Editar variação"], button[aria-label*="Editar variação"]');
  if (addVarBtn) {
    console.log('Clicking add/edit variation button...');
    await addVarBtn.click();
    await page.waitForTimeout(1500);
  }

  // Now take screenshot on desktop
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  await page.screenshot({ path: path.join(screenshotDir, 'desktop_variation.png') });
  console.log('Desktop screenshot saved');

  // Now resize viewport to mobile screen (e.g. 375px width)
  console.log('Resizing to mobile viewport (375x700)...');
  await page.setViewportSize({ width: 375, height: 700 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(screenshotDir, 'mobile_375_variation.png') });
  console.log('Mobile 375 screenshot saved');

  // Let's inspect the variation name input and container bounding box
  const nameInput = await page.$('input[aria-label="Nome da variação"]');
  if (nameInput) {
    const box = await nameInput.boundingBox();
    console.log('Input bounding box on 375px viewport:', box);
    const parentBox = await nameInput.evaluate(el => {
      const container = el.parentElement;
      return {
        containerClass: container.className,
        containerScrollWidth: container.scrollWidth,
        containerClientWidth: container.clientWidth,
        badgeText: container.querySelector('span')?.innerText,
        badgeWidth: container.querySelector('span')?.offsetWidth,
        inputWidth: el.offsetWidth
      };
    });
    console.log('Parent container info:', parentBox);
  } else {
    console.log('Input[aria-label="Nome da variação"] not found yet on page.');
  }

  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => {
  console.error('Error during execution:', e);
  process.exit(1);
});
