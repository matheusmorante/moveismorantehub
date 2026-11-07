// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';
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
  fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 540, clientY: -20 });
  fireEvent.pointerMove(board, { pointerId: 1, isPrimary: true, clientX: 1080, clientY: 540 });
  fireEvent.pointerUp(board, { pointerId: 1, isPrimary: true, clientX: 1080, clientY: 540 });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0]).toMatchObject({ id: layer.id, angle: 90, x: 0, y: 0, width: 1080, height: 1080 });
});
