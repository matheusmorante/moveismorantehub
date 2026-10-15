// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VariationDescriptionTab } from './VariationDescriptionTab';
import { VariationTechnicalDescriptionSection } from './VariationTechnicalDescriptionSection';
import type { Product, Variation } from '@/pages/types/product.type';
const mocks = vi.hoisted(() => ({ improve: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { improveProductDescription: mocks.improve } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.improve.mockResolvedValue({ improvedDescription: 'Descrição revisada' }); });
const variation: Variation = { id: 'variation', sku: 'SKU-1', name: '  Armário Azul  ', stock: 0, unitPrice: 100, active: true, attributes: [], description: 'Descrição original', syncDescription: false, syncWidth: true, width: 50, technicalValues: { Cor: 'Azul', Portas: 2 } };
const parent: Product = { id: 'parent', name: 'Armário', description: 'Descrição do pai', unitPrice: 100, unit: 'UN', itemType: 'product', active: true, width: 80, material: 'Madeira', brand: 'Morante' };
const mount = (kind: string, value = variation, product = parent) => {
  const change = vi.fn();
  if (kind === 'aba') render(<VariationDescriptionTab formData={value} parentProduct={product} setFormData={vi.fn()} handleChange={change} showAiImprove />);
  else render(<VariationTechnicalDescriptionSection formData={value} parentProduct={product} parentNormalizedValues={{ Material: 'Madeira', Cor: 'Branco' }} handleChange={change} showAiImprove />);
  return change;
};
describe.each(['aba', 'seção técnica'])('resolver de descrição na %s', (kind) => {
  it.each(['título', 'medida', 'peso'])('bloqueia %s inválido antes da IA', async (field) => {
    const invalid = { ...variation, ...(field === 'título' ? { name: '' } : field === 'medida' ? { width: -1, syncWidth: false } : { weight: Number.NaN }) };
    const change = mount(kind, invalid, field === 'título' ? { ...parent, name: '', description: '' } : parent);
    fireEvent.click(screen.getByRole('button', { name: 'Aperfeiçoar com IA' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled()); expect(mocks.improve).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
  });
  it('entrega título parseado, medidas efetivas e valores técnicos ao serviço', async () => {
    const change = mount(kind); fireEvent.click(screen.getByRole('button', { name: 'Aperfeiçoar com IA' }));
    await waitFor(() => expect(change).toHaveBeenCalledWith('description', 'Descrição revisada'));
    expect(mocks.improve).toHaveBeenCalledWith(expect.objectContaining({ title: 'Armário Azul', currentDescription: 'Descrição original', width: 80, technicalValues: expect.objectContaining({ Cor: 'Azul', Portas: 2 }) }));
    if (kind === 'seção técnica') expect(mocks.improve).toHaveBeenCalledWith(expect.objectContaining({ material: 'Madeira', brand: 'Morante', technicalValues: { Material: 'Madeira', Cor: 'Azul', Portas: 2 } }));
  });
  it('conserva a trava e o indicador até terminar e permite retomar após erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    mocks.improve.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const change = mount(kind); const submit = screen.getByRole('button', { name: 'Aperfeiçoar com IA' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(mocks.improve).toHaveBeenCalledTimes(1)); expect(submit).toHaveProperty('disabled', true); expect(change).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha simulada')); }); await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(submit).toHaveProperty('disabled', false); fireEvent.click(submit);
    await waitFor(() => expect(change).toHaveBeenCalledTimes(1)); expect(mocks.improve).toHaveBeenCalledTimes(2);
  });
});
