import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import KpiRow from './KpiRow';

describe('KpiRow', () => {
  it('mostra quatro indicadores sem lucro, margem ou CMV e mantém os valores em uma linha', () => {
    const markup = renderToStaticMarkup(
      <KpiRow
        stats={{
          totalSales: 1234,
          saleCount: 4,
          avgTicket: 308.5,
          paidTrafficSalesValue: 234,
        }}
        prevStats={{
          totalSales: 1000,
          saleCount: 3,
          avgTicket: 333.33,
          paidTrafficSalesValue: 100,
        }}
      />,
    );

    const normalizedMarkup = markup.replace(/\u00a0/g, ' ');
    expect(normalizedMarkup).toContain('R$ 1.234,00');
    expect(normalizedMarkup).toContain('R$ 234,00');
    expect(markup).toContain('>4</h3>');
    expect(normalizedMarkup).toContain('R$ 308,50');
    expect(markup).toContain('whitespace-nowrap');
    expect(markup.match(/id="kpi-/g)).toHaveLength(4);
    expect(markup).not.toContain('kpi-lucro');
    expect(markup).not.toContain('kpi-margem');
    expect(markup).not.toContain('kpi-cmv');
    expect(normalizedMarkup).not.toContain('Lucro Bruto');
    expect(normalizedMarkup).not.toContain('Margem Bruta');
    expect(normalizedMarkup).not.toContain('>CMV<');
  });
});
