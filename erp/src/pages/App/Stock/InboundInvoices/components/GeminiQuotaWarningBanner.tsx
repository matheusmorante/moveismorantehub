import React from 'react';

interface GeminiQuotaWarningBannerProps {
    readonly isUnavailable: boolean;
    readonly reason?: string;
    readonly variant?: 'header' | 'modal';
    readonly onDismiss?: () => void;
}

export const GeminiQuotaWarningBanner: React.FC<GeminiQuotaWarningBannerProps> = ({
    isUnavailable,
    reason,
    variant = 'header',
}) => {
    if (!isUnavailable) return null;

    if (variant === 'modal') {
        return (
            <div 
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in"
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    <i className="bi bi-exclamation-triangle-fill text-base" aria-hidden="true" />
                </div>
                <div className="flex-1 text-xs">
                    <strong className="block font-black text-amber-950 dark:text-amber-100">
                        IA (Gemini) temporariamente indisponível por limite de cota
                    </strong>
                    <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-300">
                        {reason || 'A cota diária de processamento de IA foi atingida no momento.'}{' '}
                        A leitura de fotos e PDFs via IA está suspensa temporariamente. Para continuar imediatamente, envie o arquivo <strong>XML</strong> da nota fiscal.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div 
            role="alert"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in"
        >
            <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 shadow-xs">
                    <i className="bi bi-exclamation-triangle-fill text-lg" aria-hidden="true" />
                </div>
                <div className="text-xs">
                    <span className="inline-flex items-center gap-1.5 font-black text-amber-950 dark:text-amber-100 uppercase tracking-wide text-[11px]">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Aviso de Cota do Gemini
                    </span>
                    <p className="mt-0.5 leading-relaxed text-amber-800 dark:text-amber-300">
                        A cota do Gemini foi atingida. A análise automática de documentos e fotos por IA está indisponível no momento. A importação por <strong>XML</strong> continua funcionando normalmente.
                    </p>
                </div>
            </div>

            <div className="shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300/80 bg-amber-100/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    <i className="bi bi-info-circle text-xs" />
                    Use o arquivo XML
                </span>
            </div>
        </div>
    );
};
