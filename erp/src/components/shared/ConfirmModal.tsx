import React from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
    countdownSeconds?: number;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    type = 'info',
    countdownSeconds
}) => {
    const [timeLeft, setTimeLeft] = React.useState(countdownSeconds ?? 0);

    React.useEffect(() => {
        if (!isOpen) return;
        if (!countdownSeconds) {
            setTimeLeft(0);
            return;
        }
        setTimeLeft(countdownSeconds);
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, countdownSeconds]);

    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: 'bi-exclamation-triangle-fill text-red-600 dark:text-red-400',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'bi-exclamation-circle-fill text-amber-600 dark:text-amber-400',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'bi-info-circle-fill text-blue-600 dark:text-blue-400',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
        }
    }[type];

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className={`p-8 ${colors.bg} flex flex-col items-center text-center gap-4`}>
                    <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-premium-sm">
                        <i className={`bi ${colors.icon} text-3xl`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {title}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="p-8 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 bg-slate-50 dark:bg-slate-800/50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        disabled={timeLeft > 0}
                        onClick={() => {
                            if (timeLeft > 0) return;
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-xl ${
                            timeLeft > 0
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                                : `active:scale-95 ${colors.button}`
                        }`}
                    >
                        {timeLeft > 0 ? `${confirmLabel} (${timeLeft}s)` : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
