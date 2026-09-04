const OrderPrintStyles = () => {
    return (
        <style>{`
            @media print {
                @page { margin: 0.5cm; }
                body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px !important; }
                
                /* Reduzir espaçamento geral */
                .min-h-screen { min-height: auto !important; }
                .flex.flex-col.gap-2 { gap: 0.25rem !important; }
                
                /* Cabeçalho */
                .bg-slate-800.text-white.shadow-xl,
                .bg-emerald-700.text-white.shadow-xl,
                .bg-orange-500.text-white.shadow-xl,
                .bg-purple-700.text-white.shadow-xl {
                    padding: 0.75rem 1rem !important;
                    margin-bottom: 0.5rem !important;
                    border-radius: 1rem !important;
                }
                .header-logo-container {
                    width: 13rem !important;
                    height: 13rem !important;
                    padding: 0.5rem !important;
                    border-radius: 1.25rem !important;
                }
                .header-logo-container img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: contain !important;
                }
                h1.text-3xl { font-size: 1.5rem !important; }
                
                /* Atendente / Validade */
                .bg-slate-50.rounded-2xl {
                    border-radius: 0.75rem !important;
                    margin-bottom: 0.25rem !important;
                    padding-top: 0.25rem !important;
                    padding-bottom: 0.25rem !important;
                }
                
                /* Informações do Cliente */
                .rounded-\\[2rem\\] { border-radius: 1rem !important; }
                .px-6 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
                .py-2 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
                .pb-4 { padding-bottom: 0.25rem !important; }
                .pt-2 { padding-top: 0.15rem !important; }
                .pt-4 { padding-top: 0.25rem !important; }
                .my-2 { margin-top: 0.25rem !important; margin-bottom: 0.25rem !important; }
                .gap-y-4 { row-gap: 0.25rem !important; }
                .text-lg { font-size: 1rem !important; }
                .text-base { font-size: 0.85rem !important; }
                
                /* Tabela de Itens */
                th { padding: 0.25rem 0.5rem !important; font-size: 10px !important; }
                td { padding: 0.25rem 0.5rem !important; font-size: 11px !important; }
                .text-\\[13px\\] { font-size: 11px !important; }
                tfoot tr.text-base td { font-size: 12px !important; padding: 0.25rem 0.5rem !important; }
                
                /* Grid de pagamento/logística */
                .mt-6 { margin-top: 0.5rem !important; }
                .pt-4 { padding-top: 0.25rem !important; }
                .bg-slate-50.border.border-slate-200.rounded-3xl.p-5 {
                    padding: 0.5rem 0.75rem !important;
                    border-radius: 1rem !important;
                    gap: 0.5rem !important;
                }
                .rounded-3xl { border-radius: 1rem !important; }
                .p-3 { padding: 0.5rem !important; }
                .rounded-2xl { border-radius: 0.75rem !important; }
                
                /* Avisos e Termos */
                .mt-8 { margin-top: 0.5rem !important; }
                .pt-6 { padding-top: 0.25rem !important; }
                .bg-amber-50 {
                    padding: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                    border-radius: 0.75rem !important;
                }
                .space-y-4 > * + * { margin-top: 0.25rem !important; }
                
                /* Rodapé */
                .mt-auto { margin-top: 0.5rem !important; }
                .pt-8 { padding-top: 0.25rem !important; }
                .pb-4 { padding-bottom: 0.25rem !important; }
                
                .print-exact-bg-light { background-color: #fef2f2 !important; }
                .print-exact-bg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .bg-slate-50 { background-color: #f8fafc !important; }
                .bg-slate-800 { background-color: #1e293b !important; }
                .bg-amber-50 { background-color: #fffbeb !important; }
                .border-slate-100 { border-color: #f1f5f9 !important; }
                .border-slate-200 { border-color: #e2e8f0 !important; }
            }
        `}</style>
    );
};

export default OrderPrintStyles;
