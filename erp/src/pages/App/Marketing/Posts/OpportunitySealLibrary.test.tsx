// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OpportunitySealLibrary from './OpportunitySealLibrary';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), update: vi.fn(), error: vi.fn(), query: vi.fn(), eq: vi.fn() }));
vi.mock('@/pages/utils/storageService', () => ({ uploadFile: mocks.upload }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ order: mocks.query }) }), update: mocks.update,
}) } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('./OpportunitySealImageEditor', () => ({ default: ({ onImageChange }: { onImageChange: (file: File) => void }) => <>
  <button onClick={() => onImageChange(new File(['text'], 'text.txt', { type: 'text/plain' }))}>Invalid file</button>
  <button onClick={() => onImageChange(new File(['photo'], 'photo.png', { type: 'image/png' }))}>Image file</button>
</> }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ data: [{ id: 'seal', name: 'Promo', slug: 'promo', badge_color: '#fff', border_color: '#000' }], error: null });
  mocks.upload.mockResolvedValue('https://example.com/seal.png');
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});
async function setup() {
  const select = vi.fn();
  render(<OpportunitySealLibrary open onToggle={vi.fn()} onSelect={select} />);
  fireEvent.click(await screen.findByTitle('Gerenciar imagem do selo Promo'));
  return select;
}
describe('seal upload form owner', () => {
  it('blocks invalid images before upload or persistence', async () => {
    const select = await setup();
    fireEvent.click(screen.getByText('Invalid file'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.'));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('holds the resolver across upload and database write to block duplicate saves', async () => {
    let finish!: (value: string) => void;
    mocks.upload.mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }));
    const select = await setup();
    fireEvent.click(screen.getByText('Image file'));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Image file'));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    await act(async () => { finish('https://example.com/seal.png'); });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ image_url: 'https://example.com/seal.png' }));
    expect(mocks.eq).toHaveBeenCalledWith('id', 'seal');
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'seal', image_url: 'https://example.com/seal.png' }));
  });
});
