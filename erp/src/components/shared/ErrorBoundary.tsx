import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-8 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-[2rem] text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
            <i className="bi bi-exclamation-triangle text-2xl" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-rose-600">Erro de Interface</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
              O componente {this.props.name} falhou ao carregar.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
          >
            Tentar Recuperar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
