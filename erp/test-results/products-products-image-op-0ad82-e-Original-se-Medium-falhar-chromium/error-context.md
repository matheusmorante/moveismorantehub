# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-image-optimization.spec.ts >> Otimização de Imagens de Produtos (Egress Guard) >> Fallback de Imagens: Recupera Medium se Thumb falhar e Original se Medium falhar
- Location: tests\e2e\products\products-image-optimization.spec.ts:44:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('img') to be visible

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Otimização de Imagens de Produtos (Egress Guard)', () => {
  4  |   
  5  |   test('Garante que a listagem de produtos só carrega miniaturas (thumb.webp) e nunca as originais pesadas', async ({ page }) => {
  6  |     let requestsOriginais = 0;
  7  |     let requestsThumbnails = 0;
  8  | 
  9  |     // Intercepta e analisa os requests de imagens de produtos
  10 |     await page.route('**/*', (route) => {
  11 |       const request = route.request();
  12 |       const url = request.url();
  13 |       const resourceType = request.resourceType();
  14 | 
  15 |       if (resourceType === 'image' && url.includes('products/') && url.includes('media.moveismorante')) {
  16 |         // As URLs otimizadas terminam em _thumb.webp ou _medium.webp.
  17 |         // Qualquer outra terminação (ex: .jpg, .jpeg, .png, .webp sem sufixo) é a original pesada.
  18 |         if (url.includes('_thumb.webp')) {
  19 |           requestsThumbnails++;
  20 |         } else if (url.includes('_medium.webp')) {
  21 |           // Permite medium em listagens, embora thumbnail seja preferível.
  22 |           // Neste teste estrito de listagem, só queremos thumbs, 
  23 |           // mas como fallback pode pedir medium, não vamos contar como "Original Vazado".
  24 |           // Vamos adicionar uma contagem se quiser, mas aqui ignoramos.
  25 |         } else {
  26 |           // Se não é thumb e não é medium, é a imagem original pesada!
  27 |           requestsOriginais++;
  28 |         }
  29 |       }
  30 |       route.continue();
  31 |     });
  32 | 
  33 |     await page.goto('/app/products', { waitUntil: 'networkidle' });
  34 | 
  35 |     // Espera a listagem renderizar
  36 |     await page.waitForSelector('img');
  37 | 
  38 |     // A regra de egress estrita: NENHUMA imagem original pode ser carregada na listagem.
  39 |     expect(requestsOriginais).toBe(0);
  40 |     // Deve ter carregado algumas miniaturas
  41 |     expect(requestsThumbnails).toBeGreaterThan(0);
  42 |   });
  43 | 
  44 |   test('Fallback de Imagens: Recupera Medium se Thumb falhar e Original se Medium falhar', async ({ page }) => {
  45 |     // Vamos simular que o servidor R2 deu 404 para _thumb.webp,
  46 |     // para ver se a aplicação pede o _medium.webp automaticamente.
  47 |     
  48 |     let requestedMediumFallback = false;
  49 | 
  50 |     await page.route('**/*', (route) => {
  51 |       const request = route.request();
  52 |       const url = request.url();
  53 | 
  54 |       if (url.includes('_thumb.webp')) {
  55 |         // Simula a falha da miniatura
  56 |         route.fulfill({
  57 |           status: 404,
  58 |           contentType: 'text/plain',
  59 |           body: 'Not Found',
  60 |         });
  61 |         return;
  62 |       }
  63 | 
  64 |       if (url.includes('_medium.webp')) {
  65 |         requestedMediumFallback = true;
  66 |       }
  67 |       
  68 |       route.continue();
  69 |     });
  70 | 
  71 |     await page.goto('/app/products', { waitUntil: 'networkidle' });
> 72 |     await page.waitForSelector('img');
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  73 | 
  74 |     // O fallback deve ter sido acionado pelo componente <ProductImage />
  75 |     expect(requestedMediumFallback).toBeTruthy();
  76 |   });
  77 | });
  78 | 
```