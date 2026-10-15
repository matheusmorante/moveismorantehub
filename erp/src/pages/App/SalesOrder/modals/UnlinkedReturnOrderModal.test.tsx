// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UnlinkedReturnOrderModal from './UnlinkedReturnOrderModal';

const mocks = vi.hoisted(() => ({ save: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/orderHistoryService', () => ({ saveOrder: mocks.save }));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, error: mocks.error, success: vi.fn() } }));
vi.mock('@/pages/App/Registrations/shared/modals/PersonFormModal', () => ({ default: () => null }));
vi.mock('./CustomerSearchModal', () => ({ default: ({ onSelect }: any) => <button onClick={(event) => { event.stopPropagation(); onSelect({ id: 'customer', fullName: '  Cliente  ', phone: '999999999', fullAddress: { street: 'Rua' } }); }}>Escolher cliente</button> }));
vi.mock('../components/ReturnItemsTable', () => ({ default: ({ setItems }: any) => <>
  <button onClick={() => setItems([{ productId: 'product', description: 'Mesa', quantity: 2, unitPrice: 15, unitDiscount: 0, discountType: 'fixed' }])}>Item válido</button>
  <button onClick={() => setItems([{ description: 'Mesa', quantity: 0, unitPrice: 15 }])}>Quantidade inválida</button>
</> }));
vi.mock('../components/ReturnFormTabs', () => ({ default: ({ onChange }: any) => <button onClick={() => onChange('collection')}>Coleta</button> }));
vi.mock('../OrderActions/ReturnCollectionSection', () => ({ default: ({ onCollectChange, onSchedulingChange, onObservationsChange }: any) => <>
  <button onClick={() => { onCollectChange(true); onSchedulingChange('date', '2026-10-16'); onSchedulingChange('startTime', '09:00'); onObservationsChange(['Receber volumes']); }}>Agendar</button>
  <button onClick={() => { onCollectChange(true); onSchedulingChange('startTime', '25:99'); }}>Horário inválido</button>
  <button onClick={() => onCollectChange(false)}>Receber na loja</button>
</> }));

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue('return-order'); });
const mount = () => {
  const onSaveSuccess = vi.fn(); const onClose = vi.fn();
  render(<UnlinkedReturnOrderModal onClose={onClose} onSaveSuccess={onSaveSuccess} />);
  return { onSaveSuccess, onClose };
};
const selectCustomer = () => {
  fireEvent.change(screen.getByPlaceholderText('Digite ao menos 2 caracteres para buscar'), { target: { value: 'Cliente' } });
  fireEvent.click(screen.getByRole('button', { name: 'Escolher cliente' }));
};
const submit = () => screen.getByRole('button', { name: 'Gerar pedido de devolução' });

describe('formulário proprietário da devolução sem venda', () => {
  it('impede cliente ausente e quantidade inválida antes de salvar', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Item válido' })); fireEvent.click(submit());
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe o cliente da devolução.'));
    selectCustomer(); fireEvent.click(screen.getByRole('button', { name: 'Quantidade inválida' })); fireEvent.click(submit());
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe uma quantidade maior que zero.'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('usa cliente parseado, itens e dados de coleta no serviço', async () => {
    const { onSaveSuccess, onClose } = mount(); selectCustomer(); fireEvent.click(screen.getByRole('button', { name: 'Item válido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta' })); fireEvent.click(screen.getByRole('button', { name: 'Agendar' })); fireEvent.click(submit());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ customerData: expect.objectContaining({ fullName: 'Cliente', id: 'customer' }), returnMethod: 'store_collection', collectionObservation: 'Receber volumes', returnedTotalAmount: 30, items: [expect.objectContaining({ quantity: 2, returnedQuantity: 2, unitPrice: 15 })], shipping: expect.objectContaining({ deliveryMethod: 'delivery', scheduling: expect.objectContaining({ date: '2026-10-16', startTime: '09:00' }) }) }));
    expect(onSaveSuccess).toHaveBeenCalledWith('return-order', expect.objectContaining({ id: 'return-order' }));
  });
  it('valida horário apenas da coleta selecionada e deixa retomar na loja', async () => {
    mount(); selectCustomer(); fireEvent.click(screen.getByRole('button', { name: 'Item válido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta' })); fireEvent.click(screen.getByRole('button', { name: 'Horário inválido' })); fireEvent.click(submit());
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe um horário válido.'));
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Receber na loja' })); fireEvent.click(submit());
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0].shipping.scheduling).toMatchObject({ date: '', startTime: '', notInformed: true });
  });
  it('mantém a proteção durante a gravação e libera uma nova tentativa após falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    mocks.save.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { onClose } = mount(); selectCustomer(); fireEvent.click(screen.getByRole('button', { name: 'Item válido' }));
    const button = submit(); act(() => { fireEvent.click(button); fireEvent.click(button); });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(button).toHaveProperty('disabled', true); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Simulada')); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    fireEvent.click(submit()); await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });
});
