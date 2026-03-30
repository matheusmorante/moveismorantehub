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
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl" 
          style={{ zIndex: 1000000 }}
        >
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-rose-500/30 text-center flex flex-col items-center gap-6 max-w-lg w-full animate-slide-up">
            <div className="p-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
                <i className="bi bi-bug-fill text-2xl" />
            </div>
            <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-rose-600">Erro Crítico de Sensor</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                Falha ao carregar {this.props.name || 'componente'}:
                </p>
            </div>
            
            <div className="w-full bg-black/80 p-4 rounded-xl border border-rose-500/20 max-h-[150px] overflow-auto">
                <p className="text-[10px] font-mono text-rose-300 select-all leading-relaxed ltr text-left break-all">
                {this.state.error?.message || "Erro desconhecido"}
                </p>
            </div>

            <div className="flex gap-3 w-full">
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(this.state.error?.message || "Sem detalhes");
                        const btn = document.activeElement as HTMLButtonElement;
                        if (btn) btn.innerText = "COPIADO!";
                        setTimeout(() => { if (btn) btn.innerText = "COPIAR ERRO"; }, 2000);
                    }}
                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 active:scale-95 transition-all shadow-md"
                >
                    COPIAR ERRO
                </button>
                <button
                    onClick={() => this.setState({ hasError: false })}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
                >
                    REBIPAR
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
