const CHANNEL_NAME = 'morante-price-label-template-sync';

export interface PriceLabelTemplateUpdate {
    layoutId: string;
    artConfig: Record<string, unknown>;
}

export const publishPriceLabelTemplateUpdate = (update: PriceLabelTemplateUpdate) => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(update);
    channel.close();
};

export const subscribeToPriceLabelTemplateUpdates = (
    onUpdate: (update: PriceLabelTemplateUpdate) => void,
) => {
    if (typeof BroadcastChannel === 'undefined') return () => undefined;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = ({ data }: MessageEvent<PriceLabelTemplateUpdate>) => {
        if (!data?.layoutId || !data.artConfig) return;
        onUpdate(data);
    };

    return () => channel.close();
};
