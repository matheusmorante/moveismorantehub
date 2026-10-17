// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ prompt: vi.fn(), generate: vi.fn(), save: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../services/ambientationService', () => ({ ambientationService: { generateAmbientationPrompt: mocks.prompt, saveAmbientedImage: mocks.save } }));
vi.mock('../../services/compositionAi', () => ({ generateRoom: mocks.generate }));
import { AmbientationStudioModal } from './AmbientationStudioModal';
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
const original = 'https://images.example/product.png', ambiented = 'https://images.example/room.png';
const props = () => ({ isOpen: true, onClose: vi.fn(), productId: ' product ', productName: ' Mesa ', originalImageUrl: original, onSelectAmbientedImage: vi.fn().mockResolvedValue(true) });
const generate = () => fireEvent.click(screen.getByRole('button', { name: 'Gerar Ambiente por IA' }));
const select = () => fireEvent.click(screen.getByRole('button', { name: 'Usar Foto Ambientada' }));
const saved = () => screen.findByRole('button', { name: 'Usar Foto Ambientada' });
beforeEach(() => { vi.resetAllMocks(); mocks.user = { id: 'operator' }; mocks.prompt.mockResolvedValue(' Quarto claro '); mocks.generate.mockResolvedValue(ambiented); mocks.save.mockImplementation(async (values) => ({ ...values, createdAt: '2026-10-16T12:00:00Z', persistence: 'remote' })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('ambientation form owner retained as a library', () => {
  it('uses a distinct prompt contract without requiring an image', async () => {
    render(<AmbientationStudioModal {...props()} originalImageUrl="" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar sugestão/ }));
    await waitFor(() => expect((screen.getByLabelText('Instrução do ambiente') as HTMLTextAreaElement).value).toBe('Quarto claro'));
    expect(mocks.prompt).toHaveBeenCalledWith('Mesa'); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('blocks invalid source values before generation or persistence', async () => {
    render(<AmbientationStudioModal {...props()} originalImageUrl="" />); generate(); await screen.findByRole('alert');
    expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('shares a guard across suggestion, generation and closing', async () => {
    const pending = deferred(); mocks.prompt.mockReturnValue(pending.promise); const values = props(); render(<AmbientationStudioModal {...values} />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Gerar sugestão/ })); generate(); fireEvent.click(screen.getByLabelText('Fechar estúdio')); });
    await waitFor(() => expect(mocks.prompt).toHaveBeenCalledOnce()); expect(mocks.generate).not.toHaveBeenCalled(); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { pending.resolve('Quarto'); });
  });
  it('keeps the resolver busy through the same image receipt before allowing apply', async () => {
    const pending = deferred(); mocks.save.mockReturnValue(pending.promise); const values = props(); render(<AmbientationStudioModal {...values} />);
    fireEvent.change(screen.getByLabelText('Instrução do ambiente'), { target: { value: ' Quarto claro ' } }); generate();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(mocks.generate).toHaveBeenCalledWith(original, 'Mesa', 'vermelho e dourado', 'Quarto claro');
    expect(screen.queryByRole('button', { name: 'Usar Foto Ambientada' })).toBeNull(); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ ...mocks.save.mock.calls[0][0], persistence: 'remote' }); }); await saved();
  });
  it('retries a known save refusal with the same image and id instead of regenerating', async () => {
    mocks.save.mockRejectedValueOnce(Object.assign(new Error('Armazenamento local indisponível'), { knownFailure: true }));
    render(<AmbientationStudioModal {...props()} />); generate(); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ambiente gerado' })); await saved();
    expect(mocks.generate).toHaveBeenCalledOnce(); expect(mocks.save.mock.calls[1][0]).toEqual(mocks.save.mock.calls[0][0]);
  });
  it('blocks apply and replay after an uncertain save', async () => {
    mocks.save.mockRejectedValue(Object.assign(new Error('Sem confirmação'), { uncertain: true })); render(<AmbientationStudioModal {...props()} />);
    generate(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Salvar ambiente gerado' }));
    expect(mocks.save).toHaveBeenCalledOnce(); expect(screen.queryByRole('button', { name: 'Usar Foto Ambientada' })).toBeNull();
  });
  it('awaits the apply callback and prevents duplicate application or closing', async () => {
    const pending = deferred(); const values = props(); values.onSelectAmbientedImage.mockReturnValue(pending.promise);
    render(<AmbientationStudioModal {...values} />); generate(); await saved();
    act(() => { select(); select(); fireEvent.click(screen.getByLabelText('Fechar estúdio')); });
    await waitFor(() => expect(values.onSelectAmbientedImage).toHaveBeenCalledOnce()); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(true); }); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce());
    expect(values.onSelectAmbientedImage).toHaveBeenCalledWith(ambiented);
  });
  it('preserves a confirmed image after an explicit callback refusal', async () => {
    const values = props(); values.onSelectAmbientedImage.mockResolvedValueOnce(false); render(<AmbientationStudioModal {...values} />); generate(); await saved();
    select(); await screen.findByRole('alert'); expect(values.onClose).not.toHaveBeenCalled(); select();
    await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce()); expect(mocks.generate).toHaveBeenCalledOnce(); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('ignores a generated response for the previous product', async () => {
    const pending = deferred(); mocks.generate.mockReturnValue(pending.promise); const values = props(); const view = render(<AmbientationStudioModal {...values} />);
    generate(); await waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce()); view.rerender(<AmbientationStudioModal {...values} productId="other" productName="Sofá" />);
    await act(async () => { pending.resolve(ambiented); }); expect(mocks.save).not.toHaveBeenCalled(); expect(screen.queryByAltText('Ambientado')).toBeNull();
  });
  it('bounds generation and ignores a late response without persisting it', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.generate.mockReturnValue(pending.promise); render(<AmbientationStudioModal {...props()} />);
    await act(async () => { generate(); await vi.advanceTimersByTimeAsync(90_001); }); expect(screen.getByRole('alert').textContent).toMatch(/geração não foi confirmada/);
    await act(async () => { pending.resolve(ambiented); }); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('blocks callback replay after its deadline', async () => {
    const values = props(); values.onSelectAmbientedImage.mockReturnValue(new Promise(() => {})); render(<AmbientationStudioModal {...values} />); generate(); await saved();
    vi.useFakeTimers(); await act(async () => { select(); await vi.advanceTimersByTimeAsync(30_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/aplicação não foi confirmada/); select(); expect(values.onSelectAmbientedImage).toHaveBeenCalledOnce(); expect(values.onClose).not.toHaveBeenCalled();
  });
  it('rejects an invalid generated image before saving it', async () => {
    mocks.generate.mockResolvedValue('invalid-image'); render(<AmbientationStudioModal {...props()} />); generate(); await screen.findByRole('alert');
    expect(mocks.save).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'Usar Foto Ambientada' })).toBeNull();
  });
  it('labels a local-only save explicitly before allowing apply', async () => {
    mocks.save.mockImplementation(async (values) => ({ ...values, persistence: 'local' })); render(<AmbientationStudioModal {...props()} />); generate(); await saved();
    expect(screen.getByRole('status').textContent).toBe('Imagem salva somente neste navegador.');
  });
});
