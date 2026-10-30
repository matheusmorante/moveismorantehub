// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { saveAttributeValueMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  saveAttributeValueMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/pages/utils/variationService', () => ({
  saveAttributeValue: saveAttributeValueMock,
}));
vi.mock('react-toastify', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

import { TechnicalFieldInput } from './TechnicalFieldInput';

describe('TechnicalFieldInput para Cor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('salva, seleciona e confirma a cor nova', async () => {
    saveAttributeValueMock.mockResolvedValue({
      id: 'color-green',
      attribute_id: 'attribute-color',
      value: 'Cedar/Cinza Soft',
    });
    const onChange = vi.fn();

    render(
      <TechnicalFieldInput
        field={{
          id: 'attribute-color',
          name: 'Cor',
          dataType: 'radio',
          options: [{ id: 'color-blue', value: 'Azul' }],
        }}
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText('Digite pelo menos 2 caracteres para pesquisar...');
    fireEvent.change(input, { target: { value: 'Cedar/Cinza Soft' } });
    fireEvent.blur(input);
    fireEvent.click(await screen.findByRole('button', { name: 'Cadastrar cor' }));

    await waitFor(() => expect(saveAttributeValueMock).toHaveBeenCalledWith(
      'attribute-color',
      'Cedar/Cinza Soft'
    ));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Cedar/Cinza Soft'));
    expect(toastSuccessMock).toHaveBeenCalledWith('Cor "Cedar/Cinza Soft" cadastrada e selecionada.');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
