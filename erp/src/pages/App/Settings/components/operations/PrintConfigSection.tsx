export default function PrintConfigSection() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl text-blue-600 dark:text-blue-400">
          <i className="bi bi-printer-fill" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
            Impressão pelo navegador
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Os documentos são abertos na janela padrão de impressão. Nela, escolha a impressora,
            o tamanho do papel e as demais opções disponíveis no navegador ou no Windows.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700/80 dark:bg-slate-800/30">
        <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">
          Como imprimir
        </h5>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <li>Abra a impressão do pedido, recibo, DANFE ou etiqueta desejada.</li>
          <li>Na janela de impressão, selecione a impressora ou escolha salvar como PDF.</li>
          <li>Revise as opções e confirme a impressão nessa janela.</li>
        </ol>
      </div>
    </div>
  );
}
