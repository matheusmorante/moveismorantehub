const brlCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatBrlCurrency = (value: number): string => brlCurrencyFormatter.format(value);
