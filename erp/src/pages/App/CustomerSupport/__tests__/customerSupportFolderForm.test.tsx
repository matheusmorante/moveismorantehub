// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddCustomInboxModal } from '../components/inbox/AddCustomInboxModal';
import { DEFAULT_SUPPORT_FOLDER_CRITERIA } from '@/pages/utils/customerSupport/customerSupportInboxService';
import type { CustomerSupportFolder } from '../types';

afterEach(cleanup);

describe('Formulário de pasta compartilhada', () => {
  it('renderiza o diálogo fora da camada da fila e remove o portal ao fechar', () => {
    const props = { onClose: vi.fn(), agents: [], canViewCommercialInfo: false, onSave: vi.fn() };
    const view = render(<aside aria-label="Fila"><AddCustomInboxModal {...props} isOpen /></aside>);
    const dialog = screen.getByRole('dialog', { name: 'Nova pasta compartilhada' });
    expect(dialog.parentElement === document.body).toBe(true);
    expect(view.container.contains(dialog)).toBe(false);
    view.rerender(<aside aria-label="Fila"><AddCustomInboxModal {...props} isOpen={false} /></aside>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('edita pasta de outro autor preservando o critério comercial existente sem consultar pedidos', async () => {
    const save = vi.fn().mockResolvedValue(null);
    const folder: CustomerSupportFolder = { id: '581e4614-b7e9-4b14-8013-8f35924335f5', name: 'Fila compartilhada',
      criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, orders: 'with_orders' },
      createdBy: 'b3a15cd2-ee03-46d3-8e28-d6835e20eed9', createdAt: '', updatedAt: '' };
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} agents={[]} canViewCommercialInfo={false} folder={folder} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: 'Fila revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Fila revisada', { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, orders: 'with_orders' }, folder.id));
    expect(folder.createdBy).toBe('b3a15cd2-ee03-46d3-8e28-d6835e20eed9');
  });

  const identity = { runId: '831efec0-724b-49d5-aadc-10b7c2e793df', ownerId: 'b3a15cd2-ee03-46d3-8e28-d6835e20eed9', scenarioKey: 'support_inbox' };
  it('rejeita um identificador de atendente inválido antes de persistir', async () => {
    const save = vi.fn();
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} canViewCommercialInfo onSave={save}
      agents={[{ id: 'invalid', fullName: 'Atendente inválido', role: 'atendente' }]} />);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: 'Retornos' } });
    fireEvent.change(screen.getByLabelText('Atendente'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar pasta' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Selecione um atendente válido.'));
    expect(save).not.toHaveBeenCalled();
  });

  it('envia nome e busca parseados com o critério do atendente', async () => {
    const save = vi.fn().mockResolvedValue(null);
    const close = vi.fn();
    const id = 'b3a15cd2-ee03-46d3-8e28-d6835e20eed9';
    render(<AddCustomInboxModal isOpen onClose={close} canViewCommercialInfo onSave={save}
      agents={[{ id, fullName: 'Atendente', role: 'atendente' }]} />);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: '  Retornos  ' } });
    fireEvent.change(screen.getByLabelText('Busca textual'), { target: { value: '  prazo  ' } });
    fireEvent.change(screen.getByLabelText('Atendente'), { target: { value: id } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar pasta' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Retornos', {
      status: 'all', assigneeId: id, unread: false, customerLink: 'all', orders: 'all', search: 'prazo',
    }, undefined));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('apresenta nome duplicado sem fechar o formulário', async () => {
    const close = vi.fn();
    const save = vi.fn().mockResolvedValue('Já existe uma pasta com esse nome.');
    render(<AddCustomInboxModal isOpen onClose={close} agents={[]} canViewCommercialInfo={false} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: 'Retornos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar pasta' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Já existe uma pasta com esse nome.'));
    expect(close).not.toHaveBeenCalled();
  });

  it('bloqueia submissão duplicada e fechamento durante a gravação', async () => {
    let finish!: (value: null) => void;
    const save = vi.fn().mockImplementation(() => new Promise<null>((resolve) => { finish = resolve; }));
    const close = vi.fn();
    render(<AddCustomInboxModal isOpen onClose={close} agents={[]} canViewCommercialInfo={false} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: 'Retornos' } });
    const button = screen.getByRole('button', { name: 'Criar pasta' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Fechar' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancelar' }).closest('fieldset')?.disabled).toBe(true);
    await act(async () => finish(null));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('começa sem marcador mesmo com contexto autorizado e só marca após escolha explícita', async () => {
    const save = vi.fn().mockResolvedValue(null);
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} agents={[]} canViewCommercialInfo testIdentity={identity} onSave={save} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Pasta de teste desta execução' }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.change(screen.getByLabelText('Nome da pasta'), { target: { value: 'Pasta de prova' } });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Criar pasta' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1].testArtifact).toEqual({ is_test: true, ...identity });
  });

  it('mantém a identidade ao editar a pasta própria sem oferecer reclassificação', async () => {
    const save = vi.fn().mockResolvedValue(null);
    const folder: CustomerSupportFolder = { id: '581e4614-b7e9-4b14-8013-8f35924335f5', name: 'Pasta de prova',
      criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, testArtifact: { is_test: true, ...identity } },
      createdBy: identity.ownerId, createdAt: '', updatedAt: '' };
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} agents={[]} canViewCommercialInfo testIdentity={identity} folder={folder} onSave={save} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Pasta de teste desta execução' }) as HTMLInputElement;
    expect(checkbox.checked && checkbox.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1].testArtifact).toEqual(folder.criteria.testArtifact);
  });

  it('impede editar uma pasta de outra execução antes do serviço', async () => {
    const save = vi.fn();
    const folder: CustomerSupportFolder = { id: '581e4614-b7e9-4b14-8013-8f35924335f5', name: 'Pasta de prova',
      criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, testArtifact: { is_test: true, ...identity,
        runId: '6bba8bd4-c2df-485a-af50-5e3a9ad53d0b' } }, createdBy: identity.ownerId, createdAt: '', updatedAt: '' };
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} agents={[]} canViewCommercialInfo testIdentity={identity} folder={folder} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/mesma execução/));
    expect(save).not.toHaveBeenCalled();
  });
});
