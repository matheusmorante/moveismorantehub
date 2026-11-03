import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import KpiRow from './KpiRow';

describe('KpiRow', () => {
  it('mostra indicadores do consolidado sem antecipar lucro e CMV detalhados', () => {
    const markup = renderToStaticMarkup(
      <KpiRow
        detailsLoading
        stats={{
          totalSales: 1234,
          saleCount: 4,
          avgTicket: 308.5,
          totalProfit: 734,
          grossMargin: 59.48,
          totalCmv: 500,
          cmvPartial: false,
          paidTrafficSalesValue: 234,
        }}
        prevStats={{
          totalSales: 1000,
          saleCount: 3,
          avgTicket: 333.33,
          totalProfit: 600,
          grossMargin: 60,
          paidTrafficSalesValue: 100,
        }}
      />,
    );

    const normalizedMarkup = markup.replace(/\u00a0/g, ' ');
    expect(normalizedMarkup).toContain('R$ 1.234,00');
    expect(markup).toContain('>4</h3>');
    expect(normalizedMarkup).toContain('R$ 308,50');
    expect(markup).toContain('aria-label="Carregando lucro bruto"');
    expect(markup).toContain('aria-label="Carregando margem bruta"');
    expect(markup).toContain('aria-label="Carregando cmv"');
    expect(normalizedMarkup).not.toContain('R$ 734,00');
    expect(markup).not.toContain('59.5%');
    expect(normalizedMarkup).not.toContain('R$ 500,00');
  });
});
