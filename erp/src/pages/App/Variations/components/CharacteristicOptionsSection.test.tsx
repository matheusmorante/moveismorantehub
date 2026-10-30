// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { VariationOption } from '../../../types/variation.type';
import { CharacteristicOptionsSection } from './CharacteristicOptionsSection';

const options: VariationOption[] = [
  { id: 'blue', value: 'Azul', active: true },
  { id: 'green', value: 'Verde', active: true },
];

const renderOptions = (initialOptions: VariationOption[] = options) => {
  const onOptionsChange = vi.fn();
  render(
    <CharacteristicOptionsSection
      options={initialOptions}
      onOptionsChange={onOptionsChange}
      disabled={false}
      characteristicName="Cor"
    />
  );
  return onOptionsChange;
};

describe('CharacteristicOptionsSection', () => {
  afterEach(cleanup);

  it('abre a edição ao clicar no texto e confirma com Enter ou ao perder o foco', () => {
    const onOptionsChange = renderOptions();
    fireEvent.click(screen.getByRole('button', { name: 'Editar opção Azul' }));

    const azulInput = screen.getByRole('textbox', { name: 'Editar opção Azul' });
    fireEvent.change(azulInput, { target: { value: 'Azul-marinho' } });
    fireEvent.keyDown(azulInput, { key: 'Enter' });

    expect(onOptionsChange).toHaveBeenLastCalledWith([
      { id: 'blue', value: 'Azul-marinho', active: true, sortOrder: 0 },
      { id: 'green', value: 'Verde', active: true, sortOrder: 1 },
    ]);
    expect(screen.queryByText('Editar')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Editar opção Verde' }));
    const verdeInput = screen.getByRole('textbox', { name: 'Editar opção Verde' });
    fireEvent.change(verdeInput, { target: { value: 'Verde-escuro' } });
    fireEvent.blur(verdeInput);

    expect(onOptionsChange).toHaveBeenLastCalledWith([
      { id: 'blue', value: 'Azul', active: true, sortOrder: 0 },
      { id: 'green', value: 'Verde-escuro', active: true, sortOrder: 1 },
    ]);
  });

  it('remove uma opção e preserva ao menos uma opção cadastrada', () => {
    const onOptionsChange = renderOptions();
    fireEvent.click(screen.getByRole('button', { name: 'Remover opção Azul' }));
    expect(onOptionsChange).toHaveBeenCalledWith([
      { id: 'green', value: 'Verde', active: true, sortOrder: 0 },
    ]);

    cleanup();
    renderOptions([{ id: 'single', value: 'Única', active: true }]);
    expect((screen.getByRole('button', { name: 'Remover opção Única' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('marca a opção recém-adicionada como temporária até o salvamento', () => {
    const onOptionsChange = renderOptions();
    fireEvent.change(screen.getByPlaceholderText('Digite uma opção'), {
      target: { value: 'cedar/cinza soft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    const addedOption = onOptionsChange.mock.calls[0][0].find(
      (option: VariationOption) => option.value === 'cedar/cinza soft'
    );
    expect(addedOption.id).toMatch(/^new-option-/);
  });
});
