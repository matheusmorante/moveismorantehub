export type NfcePrintFormat = 'thermal_80mm' | 'a4';

export interface NfcePrintSelection {
  format: NfcePrintFormat;
  printWindow: Window;
}

const dialogStyles = `
  .nfce-format-dialog {
    width: min(440px, calc(100vw - 32px));
    max-width: none;
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    color: #0f172a;
    background: #fff;
    box-shadow: 0 24px 80px rgba(15, 23, 42, .24);
    font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow: auto;
  }
  .nfce-format-dialog::backdrop { background: rgba(15, 23, 42, .52); }
  .nfce-format-content { padding: 24px; }
  .nfce-format-title { margin: 0; font-size: 18px; line-height: 1.3; font-weight: 750; }
  .nfce-format-description { margin: 7px 0 18px; color: #475569; }
  .nfce-format-options { display: grid; gap: 10px; }
  .nfce-format-choice {
    display: flex;
    width: 100%;
    min-height: 72px;
    align-items: center;
    gap: 14px;
    padding: 13px 15px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    color: #0f172a;
    background: #fff;
    text-align: left;
    cursor: pointer;
    transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
  }
  .nfce-format-choice:hover:not(:disabled) { border-color: #2563eb; background: #eff6ff; }
  .nfce-format-choice:focus-visible, .nfce-format-cancel:focus-visible {
    outline: 3px solid #60a5fa;
    outline-offset: 2px;
  }
  .nfce-format-choice:disabled { color: #64748b; background: #f8fafc; cursor: not-allowed; }
  .nfce-format-icon { width: 28px; height: 28px; flex: 0 0 28px; color: #2563eb; }
  .nfce-format-choice:disabled .nfce-format-icon { color: #94a3b8; }
  .nfce-format-copy { display: grid; gap: 2px; }
  .nfce-format-copy strong { font-size: 14px; }
  .nfce-format-copy small { color: #64748b; font-size: 12px; }
  .nfce-format-status { min-height: 20px; margin: 12px 0 0; color: #475569; font-size: 12px; }
  .nfce-format-status[role="alert"] { color: #b91c1c; }
  .nfce-format-cancel {
    display: block;
    margin: 12px 0 0 auto;
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    color: #334155;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }
  .nfce-format-cancel:hover { background: #f1f5f9; }
  @media (max-width: 480px) {
    .nfce-format-content { padding: 20px; }
    .nfce-format-dialog { border-radius: 14px; }
    .nfce-format-choice { min-height: 68px; padding: 12px; }
  }
`;

const receiptIcon = `
  <svg class="nfce-format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path stroke-linecap="round" d="M9 8h6M9 12h6M9 16h3" />
  </svg>
`;

const pageIcon = `
  <svg class="nfce-format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 3h8l4 4v14H6V3Z" />
    <path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
`;

function showPreparingPage(printWindow: Window): void {
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Preparando DANFE NFC-e</title>
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#334155;font:16px system-ui,-apple-system,"Segoe UI",sans-serif}main{text-align:center;padding:24px}p{margin:12px 0 0}</style>
    </head><body><main role="status" aria-live="polite"><strong>Preparando o DANFE NFC-e…</strong><p>A impressão abrirá nesta janela.</p></main></body></html>`);
  printWindow.document.close();
}

/** Abre o seletor acessível e cria a janela de impressão na ativação do clique. */
export function chooseNfcePrintFormat(options: {
  a4Available: boolean;
  a4UnavailableReason?: string;
}): Promise<NfcePrintSelection | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'nfce-format-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'nfce-format-title');
    dialog.setAttribute('aria-describedby', 'nfce-format-description nfce-format-status');
    dialog.innerHTML = `
      <style>${dialogStyles}</style>
      <div class="nfce-format-content">
        <h2 class="nfce-format-title" id="nfce-format-title">Como deseja imprimir esta NFC-e?</h2>
        <p class="nfce-format-description" id="nfce-format-description">Escolha o formato do DANFE NFC-e.</p>
        <div class="nfce-format-options" role="group" aria-label="Formato de impressão">
          <button class="nfce-format-choice" type="button" data-format="thermal_80mm" aria-describedby="nfce-format-80mm-description">
            ${receiptIcon}<span class="nfce-format-copy"><strong>Cupom 80 mm</strong><small id="nfce-format-80mm-description">Impressão em bobina térmica de 80 mm</small></span>
          </button>
          <button class="nfce-format-choice" type="button" data-format="a4" aria-describedby="nfce-format-a4-description" ${options.a4Available ? '' : 'disabled'}>
            ${pageIcon}<span class="nfce-format-copy"><strong>DANFE A4</strong><small id="nfce-format-a4-description">Impressão em folha A4</small></span>
          </button>
        </div>
        <p class="nfce-format-status" id="nfce-format-status" role="status" aria-live="polite">${options.a4Available ? 'Os dois formatos estão disponíveis.' : 'DANFE A4 indisponível. Verifique os dados fiscais do XML autorizado.'}</p>
        <button class="nfce-format-cancel" type="button">Cancelar</button>
      </div>
    `;

    let settled = false;
    const finish = (selection: NfcePrintSelection | null) => {
      if (settled) return;
      settled = true;
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      dialog.remove();
      resolve(selection);
    };

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) finish(null);
    });
    dialog.querySelector('.nfce-format-cancel')?.addEventListener('click', () => finish(null));

    const status = dialog.querySelector<HTMLElement>('#nfce-format-status');
    if (!options.a4Available && status && options.a4UnavailableReason) {
      status.textContent = `DANFE A4 indisponível: ${options.a4UnavailableReason}`;
    }
    dialog.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((button) => {
      button.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          if (status) {
            status.textContent = 'O navegador bloqueou a janela de impressão. Permita pop-ups para este ERP e tente novamente.';
            status.setAttribute('role', 'alert');
          }
          return;
        }

        try {
          showPreparingPage(printWindow);
          finish({ format: button.dataset.format as NfcePrintFormat, printWindow });
        } catch {
          printWindow.close();
          if (status) {
            status.textContent = 'Não foi possível abrir a janela de impressão. Tente novamente.';
            status.setAttribute('role', 'alert');
          }
        }
      });
    });

    document.body.appendChild(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector<HTMLButtonElement>('[data-format]:not(:disabled)')?.focus();
  });
}
