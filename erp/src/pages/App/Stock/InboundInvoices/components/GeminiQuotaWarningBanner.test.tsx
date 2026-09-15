// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeminiQuotaWarningBanner } from './GeminiQuotaWarningBanner';

describe('GeminiQuotaWarningBanner', () => {
    it('não deve renderizar nada quando a cota estiver disponível (isUnavailable = false)', () => {
        const { container } = render(
            <GeminiQuotaWarningBanner isUnavailable={false} variant="header" />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar o banner de cabeçalho em amarelo alertando sobre o uso de XML', () => {
        render(
            <GeminiQuotaWarningBanner isUnavailable={true} variant="header" reason="Cota diária esgotada" />
        );

        expect(screen.getByText(/Aviso de Cota do Gemini/i)).toBeDefined();
        expect(screen.getByText(/Use o arquivo XML/i)).toBeDefined();
    });

    it('deve renderizar a variante de modal em amarelo orientando sobre arquivo XML', () => {
        render(
            <GeminiQuotaWarningBanner isUnavailable={true} variant="modal" />
        );

        expect(screen.getByText(/IA \(Gemini\) temporariamente indisponível por limite de cota/i)).toBeDefined();
        expect(screen.getByText(/envie o arquivo/i)).toBeDefined();
    });
});
