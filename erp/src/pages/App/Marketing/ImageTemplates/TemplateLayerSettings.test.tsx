// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createImageLayer, type ImageLayer, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { TemplateLayerSettings } from './TemplateLayerSettings';

afterEach(cleanup);
const product: TemplatePreviewProduct = { id: 'p1', images: [], currency: 'BRL', fields: { currentPrice: 79 },
  attributes: { attribute_material: { name: 'Material', value: '' } } };

function Settings({ type = 'text' }: { type?: ImageLayer['type'] }) {
  const [layer, setLayer] = useState(() => createImageLayer(type, '1:1'));
  return <><TemplateLayerSettings layer={layer} product={product} onChange={setLayer} onFile={vi.fn()}
    uploading={false} disabled={false} uploadError="" /><output data-testid="layer">{JSON.stringify(layer)}</output></>;
}

it('digita preços pelos centavos, cola reais e permite mudar para uma regra textual', () => {
  render(<Settings />);
  fireEvent.click(screen.getByRole('switch', { name: /Mostrar apenas esta camada/ }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Campo da regra' }), { target: { value: 'currentPrice' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Condição' }), { target: { value: 'gt' } });
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Valor da regra' });
  fireEvent.change(input, { target: { value: '1' } });
  expect(input.value).toBe('0,01');
  fireEvent.change(input, { target: { value: '012' } });
  expect(input.value).toBe('0,12');
  fireEvent.paste(input, { clipboardData: { getData: () => 'R$ 1.234,56' } });
  expect(input.value).toBe('1.234,56');
  expect(JSON.parse(screen.getByTestId('layer').textContent!).condition.value).toBe('1234.56');
  fireEvent.change(screen.getByRole('combobox', { name: 'Campo da regra' }), { target: { value: 'name' } });
  expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Condição' }).value).toBe('exists');
  expect(screen.queryByRole('textbox', { name: 'Valor da regra' })).toBeNull();
});

it.each(['product', 'catalog', 'text', 'image', 'sticker'] as const)('oferece atributos vazios e desativa a regra em %s', (type) => {
  render(<Settings type={type} />);
  fireEvent.click(screen.getByRole('switch', { name: /Mostrar apenas esta camada/ }));
  const field = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Campo da regra' });
  expect(Array.from(field.options).some((option) => option.value === 'attribute_material')).toBe(true);
  expect(Array.from(field.options).some((option) => option.value === 'stockOrigin')).toBe(true);
  expect(Array.from(field.options).some((option) => option.value === 'color')).toBe(true);
  expect(Array.from(field.options).some((option) => option.value === 'discount')).toBe(true);
  expect(Array.from(field.options).some((option) => option.value === 'custom_label_3')).toBe(true);
  fireEvent.change(field, { target: { value: 'attribute_material' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Condição' }), { target: { value: 'empty' } });
  expect(screen.getByText('Visível para este produto.')).toBeTruthy();
  fireEvent.click(screen.getByRole('switch', { name: /Mostrar apenas esta camada/ }));
  expect(JSON.parse(screen.getByTestId('layer').textContent!).condition).toBeNull();
});

it('limita as dimensões e restaura valores numéricos apagados sem invalidar o modelo', () => {
  render(<Settings />);
  const width = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' });
  fireEvent.change(width, { target: { value: '-10' } }); fireEvent.blur(width);
  expect(width.value).toBe('16');
  fireEvent.change(width, { target: { value: '9999' } }); fireEvent.blur(width);
  expect(width.value).toBe('3840');
  fireEvent.change(width, { target: { value: '' } }); fireEvent.blur(width);
  expect(width.value).toBe('3840');
});

it('permite alterar a cor pelo seletor, código hexadecimal e amostras rápidas, além de escalar o elemento', () => {
  render(<Settings type="sticker" />);
  const hexShape = screen.getByRole<HTMLInputElement>('textbox', { name: 'Código hexadecimal de cor da forma' });
  fireEvent.change(hexShape, { target: { value: '#e3be02' } });
  expect(JSON.parse(screen.getByTestId('layer').textContent!).fill).toBe('#e3be02');

  const hexText = screen.getByRole<HTMLInputElement>('textbox', { name: 'Código hexadecimal de cor do texto' });
  fireEvent.change(hexText, { target: { value: 'abc' } });
  fireEvent.blur(hexText);
  expect(JSON.parse(screen.getByTestId('layer').textContent!).color).toBe('#aabbcc');

  fireEvent.click(screen.getByRole('button', { name: 'Selecionar cor #DC2626 para cor do texto' }));
  expect(JSON.parse(screen.getByTestId('layer').textContent!).color).toBe('#dc2626');

  const before = JSON.parse(screen.getByTestId('layer').textContent!);
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar tamanho do elemento' }));
  const grown = JSON.parse(screen.getByTestId('layer').textContent!);
  expect(grown.width).toBeGreaterThan(before.width);
  expect(grown.height).toBeGreaterThan(before.height);

  fireEvent.click(screen.getByRole('button', { name: 'Diminuir tamanho do elemento' }));
  const shrunk = JSON.parse(screen.getByTestId('layer').textContent!);
  expect(shrunk.width).toBeLessThan(grown.width);
});
