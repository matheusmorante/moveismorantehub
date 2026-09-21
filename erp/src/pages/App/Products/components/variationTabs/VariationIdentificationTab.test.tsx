// @vitest-environment jsdom
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Product, { Variation } from '../../../../types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';
import { VariationIdentificationTab } from './VariationIdentificationTab';

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn() }
}));

vi.mock('@/pages/utils/variationService', () => ({
    saveAttributeValue: vi.fn()
}));

const parentProduct = {
    name: 'Guarda-Roupa',
    description: '',
    categoryIds: []
} as Product;

const initialVariation = {
    id: 'variation-1',
    name: 'Guarda-Roupa Branco 6 Portas',
    title: 'Guarda-Roupa Branco 6 Portas',
    marketplaceTitle: 'Guarda-Roupa Branco 6 Portas',
    attributes: [
        { name: 'Cor', value: 'Branco' },
        { name: 'Quantidade de portas', value: '6 portas' }
    ]
} as Variation;

const Harness = () => {
    const [formData, setFormData] = useState<Variation>(initialVariation);
    const buildName = (attributes: Variation['attributes'] = []) => computeVariationName(
        parentProduct.name,
        attributes
    );

    return (
        <>
            <output data-testid="attribute-state">{JSON.stringify(formData.attributes)}</output>
            <VariationIdentificationTab
                formData={formData}
                setFormData={setFormData}
                parentProduct={parentProduct}
                diferenciarTitulo={false}
                setDiferenciarTitulo={vi.fn()}
                dbAttributes={[
                    { id: 'attr-cor', name: 'Cor' },
                    { id: 'attr-portas', name: 'Quantidade de portas' }
                ]}
                dbAttributeValues={[]}
                setIsManageAttributesOpen={vi.fn()}
                getDefaultVariationName={buildName}
                getDefaultVariationTitle={buildName}
            />
        </>
    );
};

describe('VariationIdentificationTab - visibilidade no nome', () => {
    it('considera atributos legados visíveis e alterna ocultar/mostrar pelo botão de olho', () => {
        render(<Harness />);

        const hideButton = screen.getByRole('button', {
            name: 'Ocultar valor de Quantidade de portas no nome da variação'
        });
        expect(hideButton.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByDisplayValue('Guarda-Roupa Branco 6 Portas')).toBeDefined();

        fireEvent.click(hideButton);

        expect(screen.getByDisplayValue('Guarda-Roupa Branco')).toBeDefined();
        expect(screen.getByTestId('attribute-state').textContent).toContain('"showName":false');

        fireEvent.click(screen.getByRole('button', {
            name: 'Mostrar valor de Quantidade de portas no nome da variação'
        }));

        expect(screen.getByDisplayValue('Guarda-Roupa Branco 6 Portas')).toBeDefined();
        expect(screen.getByTestId('attribute-state').textContent).toContain('"showName":true');
    });
});
