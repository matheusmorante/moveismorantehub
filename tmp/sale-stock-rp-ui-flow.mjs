import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(workspaceRoot, 'erp/package.json'));
const { chromium } = require('playwright');
const identity = {
  runId: '7b70cd0c-54f0-49a3-8c46-c2b8ab045a82',
  ownerId: '13eab361-be48-4e49-be4b-4ad79813b812',
  scenarioKey: 'sale-stock-adjustment',
};
const baseUrl = 'http://localhost:5173';
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
  key: 'morante:test-artifact-context',
  value: identity,
});
const page = await context.newPage();

const report = (name, value) => process.stdout.write(`${name} ${JSON.stringify(value)}\n`);
page.on('pageerror', (error) => report('PAGE_ERROR', { type: error.name }));

try {
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('operator_environment_unavailable');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.count()) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.locator('input[type="password"]').waitFor({ state: 'hidden', timeout: 30000 });
  }

  await page.goto(`${baseUrl}/sales-order`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Nova Venda', exact: true }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Nova Venda', exact: true }).click();
  const testMode = page.getByRole('switch', { name: 'Modo teste' });
  await testMode.waitFor({ timeout: 30000 });
  const storedIdentity = await page.evaluate(() => {
    try { return JSON.parse(sessionStorage.getItem('morante:test-artifact-context') || 'null'); }
    catch { return null; }
  });
  if (storedIdentity?.runId !== identity.runId || storedIdentity?.ownerId !== identity.ownerId) {
    throw new Error('test_artifact_context_not_bound');
  }
  if ((await testMode.getAttribute('aria-checked')) !== 'true') await testMode.click();
  if ((await testMode.getAttribute('aria-checked')) !== 'true') throw new Error('test_mode_not_enabled');
  report('ERP_UI_READY', { authenticated: true, testContextBound: true, testMode: true });
} catch (error) {
  report('ERP_UI_SETUP', { result: 'failed', type: error instanceof Error ? error.name : 'Error' });
}

const describePage = async () => {
  const structure = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    };
    const controls = [...document.querySelectorAll('input,textarea')].filter(visible).map((el, index) => ({
      index,
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      labels: [...(el.labels || [])].map((label) => label.textContent?.trim()).filter(Boolean),
    }));
    const selects = [...document.querySelectorAll('select')].filter(visible).map((el, index) => ({
      index,
      name: el.getAttribute('name') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      labels: [...(el.labels || [])].map((label) => label.textContent?.trim()).filter(Boolean),
      options: [...el.options].map((option) => option.textContent?.trim()).filter(Boolean),
    }));
    const buttons = [...document.querySelectorAll('button')].filter(visible).map((el) => ({
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 90),
      role: el.getAttribute('role') || 'button',
      checked: el.getAttribute('aria-checked') || undefined,
    })).filter((button) => button.text);
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map((el) => el.textContent?.trim()).filter(Boolean);
    const options = [...document.querySelectorAll('[role="option"], [role="listbox"]')].filter(visible).map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140)).filter(Boolean);
    return { path: location.pathname, headings, controls, selects, buttons, options };
  });
  report('ERP_UI_STATE', structure);
};

report('READY_FOR_COMMANDS', { commands: 'inspect, click:<button text>, text:<exact text>, fill:<input index>|<value>, select:<select index>|<option label>, press:<input index>|<key>, goto:<path>, close-form' });
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  const [command, ...parts] = line.trim().split(':');
  const value = parts.join(':');
  try {
    if (command === 'inspect') await describePage();
    else if (command === 'click') await page.getByRole('button', { name: value, exact: true }).first().click();
    else if (command === 'text') await page.getByText(value, { exact: true }).first().click();
    else if (command === 'fill') {
      const divider = value.indexOf('|');
      const index = Number(value.slice(0, divider));
      await page.locator('input:visible,textarea:visible').nth(index).fill(value.slice(divider + 1));
    } else if (command === 'select') {
      const divider = value.indexOf('|');
      const index = Number(value.slice(0, divider));
      await page.locator('select:visible').nth(index).selectOption({ label: value.slice(divider + 1) });
    } else if (command === 'press') {
      const divider = value.indexOf('|');
      const index = Number(value.slice(0, divider));
      await page.locator('input:visible,textarea:visible').nth(index).press(value.slice(divider + 1));
    } else if (command === 'goto') await page.goto(`${baseUrl}${value.startsWith('/') ? value : `/${value}`}`, { waitUntil: 'domcontentloaded' });
    else if (command === 'close-form') await page.getByRole('button', { name: 'Fechar pedido' }).click();
    else throw new Error('unsupported_command');
    report('COMMAND_OK', { command });
  } catch (error) {
    report('COMMAND_ERROR', { command, type: error instanceof Error ? error.name : 'Error' });
  }
}
