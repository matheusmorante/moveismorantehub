// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseNfcePrintFormat } from '../danfe/nfcePrintFormatDialog';

const createPrintWindow = (): Window => ({
  document: {
    open: vi.fn(),
    write: vi.fn(),
    close: vi.fn(),
  } as unknown as Document,
  focus: vi.fn(),
  close: vi.fn(),
  closed: false,
}) as unknown as Window;

afterEach(() => {
  document.querySelectorAll('dialog.nfce-format-dialog').forEach((dialog) => dialog.remove());
  vi.restoreAllMocks();
});

describe('seletor de impressão NFC-e', () => {
  it('apresenta duas opções acessíveis e abre o formato A4 escolhido', async () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, 'open').mockReturnValue(printWindow);

    const result = chooseNfcePrintFormat({ a4Available: true });
    const dialog = document.querySelector<HTMLDialogElement>('dialog.nfce-format-dialog')!;

    expect(dialog.getAttribute('aria-labelledby')).toBe('nfce-format-title');
    expect(dialog.textContent).toContain('Cupom 80 mm');
    expect(dialog.textContent).toContain('DANFE A4');
    expect(dialog.textContent).toContain('Impressão em folha A4');
    dialog.querySelector<HTMLButtonElement>('[data-format="a4"]')!.click();

    await expect(result).resolves.toEqual({ format: 'a4', printWindow });
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('Preparando o DANFE NFC-e'));
    expect(document.querySelector('dialog.nfce-format-dialog')).toBeNull();
  });

  it('mantém A4 indisponível quando o XML não tem QR Code e fecha por Escape', async () => {
    const result = chooseNfcePrintFormat({
      a4Available: false,
      a4UnavailableReason: 'O QR Code do XML autorizado está ausente ou inválido.',
    });
    const dialog = document.querySelector<HTMLDialogElement>('dialog.nfce-format-dialog')!;
    const a4 = dialog.querySelector<HTMLButtonElement>('[data-format="a4"]')!;

    expect(a4.disabled).toBe(true);
    expect(dialog.textContent).toContain('O QR Code do XML autorizado está ausente ou inválido.');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    await expect(result).resolves.toBeNull();
    expect(document.querySelector('dialog.nfce-format-dialog')).toBeNull();
  });

  it('permite tentar novamente quando o navegador bloqueia a janela de impressão', async () => {
    const printWindow = createPrintWindow();
    vi.spyOn(window, 'open').mockReturnValueOnce(null).mockReturnValueOnce(printWindow);

    const result = chooseNfcePrintFormat({ a4Available: true });
    const dialog = document.querySelector<HTMLDialogElement>('dialog.nfce-format-dialog')!;
    dialog.querySelector<HTMLButtonElement>('[data-format="a4"]')!.click();

    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('bloqueou a janela');
    expect(dialog.open).toBe(true);

    dialog.querySelector<HTMLButtonElement>('[data-format="thermal_80mm"]')!.click();
    await expect(result).resolves.toEqual({ format: 'thermal_80mm', printWindow });
  });

  it('fecha ao clicar fora do seletor', async () => {
    const result = chooseNfcePrintFormat({ a4Available: true });
    const dialog = document.querySelector<HTMLDialogElement>('dialog.nfce-format-dialog')!;
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await expect(result).resolves.toBeNull();
    expect(document.querySelector('dialog.nfce-format-dialog')).toBeNull();
  });
});
