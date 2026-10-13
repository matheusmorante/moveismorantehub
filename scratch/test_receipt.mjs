import { chromium } from '@playwright/test';

async function testReceipt() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.log('[BROWSER PAGEERROR]:', err));
  page.on('request', req => {
    if (!req.url().includes('.js') && !req.url().includes('.css') && !req.url().includes('.svg') && !req.url().includes('.png') && !req.url().includes('@vite') && !req.url().includes('node_modules')) {
      console.log(`[REQUEST]: ${req.method()} ${req.url()}`);
    }
  });

  // Test 1: Load without order in sessionStorage
  console.log('--- Loading /receipt without sessionStorage ---');
  await page.goto('http://localhost:5173/receipt');
  await page.waitForTimeout(2000);

  // Test 2: Load with mock order in sessionStorage
  console.log('--- Loading /receipt with mock order in sessionStorage ---');
  const mockOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    orderNumber: 1001,
    orderIndex: 1001,
    date: '2026-10-13T10:00:00.000Z',
    seller: 'Vendedor Teste',
    customerData: {
      fullName: 'Cliente Teste Recibo',
      phone: '41999999999',
      cpfCnpj: '123.456.789-00',
      fullAddress: {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR'
      }
    },
    items: [
      {
        description: 'Mesa de Jantar',
        quantity: 1,
        unitPrice: 1500,
        fixedDiscount: 0
      }
    ],
    itemsSummary: {
      itemsTotalValue: 1500
    },
    payments: [
      {
        paymentMethod: 'pix',
        amount: 1500
      }
    ],
    paymentsSummary: {
      totalOrderValue: 1500
    },
    shipping: {
      deliveryMethod: 'delivery',
      value: 50,
      scheduling: {
        date: '2026-10-15',
        startTime: '10:00',
        endTime: '12:00'
      }
    }
  };

  await page.evaluate((order) => {
    sessionStorage.setItem('order', JSON.stringify(order));
  }, mockOrder);

  await page.goto('http://localhost:5173/receipt?silent=1');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('--- Done ---');
}

testReceipt().catch(console.error);
