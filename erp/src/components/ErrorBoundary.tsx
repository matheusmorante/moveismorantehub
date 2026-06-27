import React, { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 font-sans">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-8 md:p-12 text-center border border-slate-100 dark:border-slate-700 animate-slide-up">
                        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="bi bi-exclamation-triangle-fill text-4xl text-rose-500"></i>
                        </div>
                        
                        <h1 className="text-2xl md:text-3xl font-black mb-4 tracking-tight">Ops! Algo deu errado</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
                            Encontramos um problema inesperado ao carregar esta página. Nossa equipe já deve ter sido notificada.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-arrow-clockwise text-lg"></i>
                                Tentar Novamente
                            </button>
                            <Link
                                to="/"
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={() => this.setState({ hasError: false })}
                            >
                                <i className="bi bi-house-door-fill text-lg"></i>
                                Voltar ao Início
                            </Link>
                        </div>

                        {/* Optional: Error details for debugging */}
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-950 rounded-xl text-left overflow-x-auto">
                                <p className="text-xs font-bold text-rose-500 mb-2 font-mono">{this.state.error.toString()}</p>
                                <pre className="text-[10px] text-slate-500 font-mono opacity-80">{this.state.error.stack}</pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
