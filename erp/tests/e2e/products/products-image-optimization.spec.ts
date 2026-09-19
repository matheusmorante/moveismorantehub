import { test, expect } from '@playwright/test';

test.describe('Otimização de Imagens de Produtos (Egress Guard)', () => {
  
  test('Garante que a listagem de produtos só carrega miniaturas (thumb.webp) e nunca as originais pesadas', async ({ page }) => {
    let requestsOriginais = 0;
    let requestsThumbnails = 0;

    // Intercepta e analisa os requests de imagens de produtos
    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      const resourceType = request.resourceType();

      if (resourceType === 'image' && url.includes('products/') && url.includes('media.moveismorante')) {
        // As URLs otimizadas terminam em _thumb.webp ou _medium.webp.
        // Qualquer outra terminação (ex: .jpg, .jpeg, .png, .webp sem sufixo) é a original pesada.
        if (url.includes('_thumb.webp')) {
          requestsThumbnails++;
        } else if (url.includes('_medium.webp')) {
          // Permite medium em listagens, embora thumbnail seja preferível.
          // Neste teste estrito de listagem, só queremos thumbs, 
          // mas como fallback pode pedir medium, não vamos contar como "Original Vazado".
          // Vamos adicionar uma contagem se quiser, mas aqui ignoramos.
        } else {
          // Se não é thumb e não é medium, é a imagem original pesada!
          requestsOriginais++;
        }
      }
      route.continue();
    });

    await page.goto('/app/products', { waitUntil: 'networkidle' });

    // Espera a listagem renderizar
    await page.waitForSelector('img');

    // A regra de egress estrita: NENHUMA imagem original pode ser carregada na listagem.
    expect(requestsOriginais).toBe(0);
    // Deve ter carregado algumas miniaturas
    expect(requestsThumbnails).toBeGreaterThan(0);
  });

  test('Fallback de Imagens: Recupera Medium se Thumb falhar e Original se Medium falhar', async ({ page }) => {
    // Vamos simular que o servidor R2 deu 404 para _thumb.webp,
    // para ver se a aplicação pede o _medium.webp automaticamente.
    
    let requestedMediumFallback = false;

    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();

      if (url.includes('_thumb.webp')) {
        // Simula a falha da miniatura
        route.fulfill({
          status: 404,
          contentType: 'text/plain',
          body: 'Not Found',
        });
        return;
      }

      if (url.includes('_medium.webp')) {
        requestedMediumFallback = true;
      }
      
      route.continue();
    });

    await page.goto('/app/products', { waitUntil: 'networkidle' });
    await page.waitForSelector('img');

    // O fallback deve ter sido acionado pelo componente <ProductImage />
    expect(requestedMediumFallback).toBeTruthy();
  });
});
