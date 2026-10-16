// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { WarrantyReaderFooter } from '../WarrantyReaderFooter';

afterEach(() => {
  cleanup();
});

describe('WarrantyReaderFooter', () => {
  it('renderiza os botões Imprimir, Enviar pelo WhatsApp e Enviar diretamente (Cloud WhatsApp) com badge BETA', () => {
    render(
      <WarrantyReaderFooter
        version={1}
        sha256="abc1234567890def1234567890"
        actionLoading={false}
        isAdministrator={true}
        onPrint={vi.fn()}
        onSendWhatsApp={vi.fn()}
        onSendDirectCloudApi={vi.fn()}
      />
    );

    const printBtn = screen.getByRole('button', { name: /imprimir/i }) as HTMLButtonElement;
    expect(printBtn).toBeDefined();
    expect(printBtn.disabled).toBe(false);

    const waBtn = screen.getByRole('button', { name: /enviar pelo whatsapp/i }) as HTMLButtonElement;
    expect(waBtn).toBeDefined();
    expect(waBtn.disabled).toBe(false);

    const cloudBtn = screen.getByRole('button', {
      name: /enviar diretamente \(cloud whatsapp\)/i,
    }) as HTMLButtonElement;
    expect(cloudBtn).toBeDefined();
    expect(screen.getByText('BETA')).toBeDefined();
    expect(cloudBtn.disabled).toBe(false);
  });

  it('aciona onSendDirectCloudApi ao clicar no botão de Cloud WhatsApp sendo administrador', () => {
    const handleSendDirect = vi.fn();
    render(
      <WarrantyReaderFooter
        version={1}
        actionLoading={false}
        isAdministrator={true}
        onPrint={vi.fn()}
        onSendWhatsApp={vi.fn()}
        onSendDirectCloudApi={handleSendDirect}
      />
    );

    const cloudBtn = screen.getByRole('button', {
      name: /enviar diretamente \(cloud whatsapp\)/i,
    });
    fireEvent.click(cloudBtn);

    expect(handleSendDirect).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão de Cloud WhatsApp com aviso se o usuário não for administrador', () => {
    const handleSendDirect = vi.fn();
    render(
      <WarrantyReaderFooter
        version={1}
        actionLoading={false}
        isAdministrator={false}
        onPrint={vi.fn()}
        onSendWhatsApp={vi.fn()}
        onSendDirectCloudApi={handleSendDirect}
      />
    );

    const cloudBtn = screen.getByRole('button', {
      name: /enviar diretamente \(cloud whatsapp\)/i,
    }) as HTMLButtonElement;
    expect(cloudBtn.disabled).toBe(true);
    expect(cloudBtn.getAttribute('title')).toContain('Disponível apenas para administradores');

    fireEvent.click(cloudBtn);
    expect(handleSendDirect).not.toHaveBeenCalled();
  });

  it('desabilita todos os botões quando actionLoading estiver ativo', () => {
    render(
      <WarrantyReaderFooter
        version={1}
        actionLoading={true}
        isAdministrator={true}
        onPrint={vi.fn()}
        onSendWhatsApp={vi.fn()}
        onSendDirectCloudApi={vi.fn()}
      />
    );

    const printBtn = screen.getByRole('button', { name: /imprimir/i }) as HTMLButtonElement;
    expect(printBtn.disabled).toBe(true);

    const waBtn = screen.getByRole('button', { name: /enviar pelo whatsapp/i }) as HTMLButtonElement;
    expect(waBtn.disabled).toBe(true);

    const cloudBtn = screen.getByRole('button', {
      name: /enviar diretamente \(cloud whatsapp\)/i,
    }) as HTMLButtonElement;
    expect(cloudBtn.disabled).toBe(true);
  });
});
