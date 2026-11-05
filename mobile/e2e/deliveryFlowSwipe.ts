import { expect, Page } from '@playwright/test';

/**
 * Executa o gesto físico de deslize no componente SlideHoldToStart no navegador.
 */
async function slideActionButton(
  page: Page,
  labelSubstring: string,
  direction: 'left' | 'right'
) {
  const sliderTrack = page.locator(`[aria-label*="${labelSubstring}"]`).first();
  await expect(sliderTrack).toBeVisible({ timeout: 10000 });
  await sliderTrack.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const box = await sliderTrack.boundingBox();
  if (!box) {
    throw new Error(`BoundingBox não encontrada para o slider: ${labelSubstring}`);
  }

  const centerY = box.y + box.height / 2;
  const startX = direction === 'left' ? box.x + box.width - 29 : box.x + 29;
  const endX = direction === 'left' ? box.x + 8 : box.x + box.width - 8;

  await page.mouse.move(startX, centerY);
  await page.waitForTimeout(60);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.move((startX + endX) / 2, centerY, { steps: 10 });
  await page.mouse.move(endX, centerY, { steps: 15 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(150);
}

export { slideActionButton };
