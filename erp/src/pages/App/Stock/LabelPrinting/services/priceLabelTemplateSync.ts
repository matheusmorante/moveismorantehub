const CHANNEL_NAME = 'morante-price-label-template-sync';

export interface PriceLabelTemplateUpdate {
    readonly layoutId: string;
    readonly artConfig: Readonly<Record<string, unknown>>;
}

/**
 * Publica uma atualização de template de etiqueta de preço para todas as abas abertas no navegador
 * utilizando a API nativa BroadcastChannel.
 */
export const publishPriceLabelTemplateUpdate = (update: PriceLabelTemplateUpdate): void => {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage(update);
        channel.close();
    } catch (err: unknown) {
        console.warn('Não foi possível sincronizar template via BroadcastChannel:', err);
    }
};

/**
 * Escuta atualizações de template de etiqueta de preço transmitidas por outras abas do sistema.
 */
export const subscribeToPriceLabelTemplateUpdates = (
    onUpdate: (update: PriceLabelTemplateUpdate) => void,
): (() => void) => {
    if (typeof BroadcastChannel === 'undefined') return () => undefined;

    try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = ({ data }: MessageEvent<PriceLabelTemplateUpdate>) => {
            if (!data?.layoutId || !data.artConfig) return;
            onUpdate(data);
        };

        return () => {
            try {
                channel.close();
            } catch {
                // Silencioso no encerramento
            }
        };
    } catch {
        return () => undefined;
    }
};

