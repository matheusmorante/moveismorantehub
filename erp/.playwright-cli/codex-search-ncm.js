async (page) => {
  const input = page.getByRole('textbox', { name: 'NCM' });
  const results = [];
  for (const term of ['madeira', '94035000']) {
    await input.fill(term);
    await page.waitForTimeout(1400);
    const data = await page.evaluate(() => {
      const pop = [...document.querySelectorAll('div')].find((e) => typeof e.className === 'string' && e.classList.contains('fixed') && e.className.includes('z-[100000000]') && e.className.includes('max-h-56') && e.getClientRects().length > 0);
      return pop ? [...pop.children].map((row) => ({ code: row.querySelector('span')?.textContent?.trim() || '', alias: row.querySelectorAll('p')[1]?.textContent?.replace(/[\uE000-\uF8FF]/g, '').trim() || null })).filter((row) => row.code) : [];
    });
    results.push({ term, rows: data });
  }
  return results;
}
