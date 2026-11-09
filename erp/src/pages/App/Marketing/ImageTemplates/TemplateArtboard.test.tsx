// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';
import { TemplateArtboard } from './TemplateArtboard';

vi.mock('./renderImageTemplate', () => ({ renderImageTemplate: vi.fn().mockResolvedValue({ errors: [], notices: [] }) }));

afterEach(cleanup);

it('gira a camada pelo controle no quadro e confirma o ângulo ao soltar', () => {
  const layout = startImageTemplate('blank').formats['1:1'];
  const layer = layout.layers[0];
  const onChange = vi.fn();
  const { container } = render(<TemplateArtboard format="1:1" layout={layout} product={null}
    assets={{ sources: new Map(), loading: false, error: '', retry: vi.fn() }} activeId={layer.id}
    onSelect={vi.fn()} onChange={onChange} getPicture={vi.fn()} disabled={false} />);
  const board = screen.getByLabelText(/Área de edição do modelo/);
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1080, bottom: 1080,
    width: 1080, height: 1080, toJSON: () => ({}) });
  Object.defineProperty(board, 'setPointerCapture', { value: vi.fn() });
  const handle = container.querySelector('[data-rotate="true"]');
  if (!handle) throw new Error('Controle de rotação ausente.');
  expect(fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 540, clientY: -20, cancelable: true })).toBe(false);
  fireEvent.pointerMove(board, { pointerId: 1, isPrimary: true, clientX: 1080, clientY: 540 });
  fireEvent.pointerUp(board, { pointerId: 1, isPrimary: true, clientX: 1080, clientY: 540 });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0]).toMatchObject({ id: layer.id, angle: 90, x: 0, y: 0, width: 1080, height: 1080 });
});

it('preserva a proporção da forma ao redimensionar por um canto', () => {
  const sticker = createImageLayer('sticker', '1:1');
  if (sticker.type !== 'sticker') throw new Error('Camada de forma esperada.');
  const layer = { ...sticker, x: 200, y: 200, width: 100, height: 50, lockAspectRatio: true };
  const layout = { layers: [layer] };
  const onChange = vi.fn();
  const { container } = render(<TemplateArtboard format="1:1" layout={layout} product={null}
    assets={{ sources: new Map(), loading: false, error: '', retry: vi.fn() }} activeId={layer.id}
    onSelect={vi.fn()} onChange={onChange} getPicture={vi.fn()} disabled={false} />);
  const board = screen.getByLabelText(/Área de edição do modelo/);
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1080, bottom: 1080,
    width: 1080, height: 1080, toJSON: () => ({}) });
  Object.defineProperty(board, 'setPointerCapture', { value: vi.fn() });
  const handle = container.querySelector('[data-corner="se"]');
  if (!handle) throw new Error('Controle de redimensionamento ausente.');
  fireEvent.pointerDown(handle, { pointerId: 2, isPrimary: true, button: 0, clientX: 300, clientY: 250 });
  fireEvent.pointerMove(board, { pointerId: 2, isPrimary: true, clientX: 350, clientY: 300 });
  fireEvent.pointerUp(board, { pointerId: 2, isPrimary: true, clientX: 350, clientY: 300 });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ width: 200, height: 100, x: 200, y: 200 }));
});

it('redimensiona a camada pelas alças laterais e controla o zoom da prévia', () => {
  const textLayer = createImageLayer('text', '1:1');
  if (textLayer.type !== 'text') throw new Error('Camada de texto esperada.');
  const layer = { ...textLayer, x: 100, y: 150, width: 300, height: 120, angle: 0 };
  const layout = { layers: [layer] };
  const onChange = vi.fn();
  const { container } = render(<TemplateArtboard format="1:1" layout={layout} product={null}
    assets={{ sources: new Map(), loading: false, error: '', retry: vi.fn() }} activeId={layer.id}
    onSelect={vi.fn()} onChange={onChange} getPicture={vi.fn()} disabled={false} />);
  const board = screen.getByLabelText(/Área de edição do modelo/);
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1080, bottom: 1080,
    width: 1080, height: 1080, toJSON: () => ({}) });
  Object.defineProperty(board, 'setPointerCapture', { value: vi.fn() });

  const eastHandle = container.querySelector('[data-corner="e"]');
  const southHandle = container.querySelector('[data-corner="s"]');
  expect(eastHandle).not.toBeNull();
  expect(southHandle).not.toBeNull();

  fireEvent.pointerDown(eastHandle!, { pointerId: 3, isPrimary: true, button: 0, clientX: 400, clientY: 210 });
  fireEvent.pointerMove(board, { pointerId: 3, isPrimary: true, clientX: 480, clientY: 250 });
  fireEvent.pointerUp(board, { pointerId: 3, isPrimary: true, clientX: 480, clientY: 250 });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ width: 380, height: 120, x: 100, y: 150 }));

  const zoomIn = screen.getByRole('button', { name: 'Aumentar zoom' });
  const zoomOut = screen.getByRole('button', { name: 'Diminuir zoom' });
  fireEvent.click(zoomIn);
  expect(screen.getByRole('button', { name: /Zoom atual 125%/ })).toBeTruthy();
  expect(board.getAttribute('data-zoomed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: /Zoom atual 125%/ }));
  expect(screen.getByRole('button', { name: /Zoom atual 100%/ })).toBeTruthy();
  fireEvent.click(zoomOut);
  expect(screen.getByRole('button', { name: /Zoom atual 75%/ })).toBeTruthy();
});
