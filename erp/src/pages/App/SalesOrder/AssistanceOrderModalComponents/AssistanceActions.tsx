import React from "react";

interface AssistanceActionsProps {
    onClose: () => void;
    isLoading: boolean;
    isEditing: boolean;
}

const AssistanceActions = ({ onClose, isLoading, isEditing }: AssistanceActionsProps) => (
    <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900"
        >
            Cancelar
        </button>
        <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-200 dark:shadow-amber-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
            {isLoading ? (
                <i className="bi bi-hourglass-split animate-spin" />
            ) : (
                <i className="bi bi-check-lg" />
            )}
            {isLoading ? "Salvando..." : "Finalizar Assistência"}
        </button>
    </div>
);

export default AssistanceActions;
