// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SellerInput from './SellerInput';

const { people } = vi.hoisted(() => ({
  people: [
    {
      id: 'seller-1',
      type: 'employees',
      fullName: 'João da Silva',
      nickname: 'Joca',
      active: true,
    },
    {
      id: 'seller-2',
      type: 'employees',
      fullName: 'Joana Costa',
      nickname: 'Joana',
      active: true,
    },
    {
      id: 'seller-3',
      type: 'employees',
      fullName: 'Matheus Morante',
      active: true,
    },
  ],
}));

vi.mock('@/pages/utils/personService', () => ({
  subscribeToPeople: (_collection: string, callback: (people: unknown[]) => void) => {
    callback(people);
    return vi.fn();
  },
}));

vi.mock('@/pages/utils/accessRoles', () => ({
  isValidEmployee: (person: { type?: string }) => person.type === 'employees',
}));

const SellerInputHarness = ({
  initialValue = '',
  initialSellerId,
}: {
  initialValue?: string;
  initialSellerId?: string;
}) => {
  const [value, setValue] = useState(initialValue);
  const [sellerId, setSellerId] = useState<string | undefined>(initialSellerId);

  return (
    <>
      <SellerInput
        value={value}
        sellerId={sellerId}
        onChange={setValue}
        onSelectSeller={({ name, id }) => {
          setValue(name);
          setSellerId(id);
        }}
      />
      <output data-testid="seller-id">{sellerId || ''}</output>
    </>
  );
};

afterEach(cleanup);

describe('SellerInput', () => {
  it('shows Matheus Morante when searching with the prefix Mathe without selecting him yet', async () => {
    render(<SellerInputHarness />);

    const input = screen.getByPlaceholderText('Digite para buscar vendedor...');
    fireEvent.change(input, { target: { value: 'Mathe' } });

    expect(await screen.findByRole('button', { name: /Matheus Morante/ })).toBeInTheDocument();
    expect(screen.getByTestId('seller-id')).toBeEmptyDOMElement();
    expect(screen.queryByTestId('seller-selected-check')).not.toBeInTheDocument();
  });

  it('finds a full name without accents and selects it only after an exact name is entered', async () => {
    render(<SellerInputHarness />);

    const input = screen.getByPlaceholderText('Digite para buscar vendedor...');
    fireEvent.change(input, { target: { value: 'silv' } });

    const matchingSeller = await screen.findByRole('button', { name: /João da Silva/ });
    expect(matchingSeller.className).not.toContain('emerald');
    expect(screen.queryByTestId('seller-selected-check')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'joao da silva' } });

    await waitFor(() => expect(input).toHaveValue('Joca'));
    expect(screen.getByTestId('seller-id')).toHaveTextContent('seller-1');
    expect(screen.getByTestId('seller-selected-check')).toBeInTheDocument();
    expect(input.className).toContain('border-emerald-500');
    expect(input.className).toContain('text-emerald-700');
    expect(screen.getByRole('button', { name: /João da Silva/ }).className).toContain('emerald');
  });

  it('clears the previous seller selection when the entered text is no longer an exact match', async () => {
    render(<SellerInputHarness initialValue="Joca" initialSellerId="seller-1" />);

    const input = screen.getByPlaceholderText('Digite para buscar vendedor...');
    fireEvent.change(input, { target: { value: 'silv' } });

    const matchingSeller = await screen.findByRole('button', { name: /João da Silva/ });
    expect(matchingSeller.className).not.toContain('emerald');
    expect(screen.getByTestId('seller-id')).toBeEmptyDOMElement();
    expect(input.className).not.toContain('border-emerald-500');
    expect(screen.queryByTestId('seller-selected-check')).not.toBeInTheDocument();
  });

  it('links an exact prefilled seller name to the employee record', async () => {
    render(<SellerInputHarness initialValue="Joao da Silva" />);

    await waitFor(() => {
      expect(screen.getByTestId('seller-id')).toHaveTextContent('seller-1');
      expect(screen.getByPlaceholderText('Digite para buscar vendedor...')).toHaveValue('Joca');
    });
  });

  it('marks an employee selected after choosing the dropdown option', async () => {
    render(<SellerInputHarness />);

    const input = screen.getByPlaceholderText('Digite para buscar vendedor...');
    fireEvent.change(input, { target: { value: 'silv' } });
    const matchingSeller = await screen.findByRole('button', { name: /João da Silva/ });

    await act(async () => {
      fireEvent.click(matchingSeller);
    });

    await waitFor(() => expect(input).toHaveValue('Joca'));
    expect(screen.getByTestId('seller-id')).toHaveTextContent('seller-1');
    expect(screen.getByTestId('seller-selected-check')).toBeInTheDocument();
    expect(input.className).toContain('border-emerald-500');
  });
});
