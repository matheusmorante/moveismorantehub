export const REPORT_PRINT_STYLES = `
                    @media print {
                        @page {
                            size: landscape;
                            margin: 0.5cm;
                        }
                        body {
                            background: white !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        nav, aside, .print\\:hidden, button, header, .custom-scrollbar::-webkit-scrollbar, .translate-x-full {
                            display: none !important;
                        }
                        main {
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                        .flex-1 {
                            height: auto !important;
                            flex: none !important;
                            overflow: visible !important;
                        }
                        .overflow-y-auto {
                            overflow: visible !important;
                            max-height: none !important;
                        }
                        .max-h-[500px] {
                            max-height: none !important;
                        }
                        .shadow-premium, .shadow-2xl, .shadow-inner, .shadow-sm {
                            box-shadow: none !important;
                            border: 1px solid #f1f5f9 !important;
                        }
                        .bg-slate-950, .dark\\:bg-slate-950, .dark\\:bg-slate-900 {
                            background-color: white !important;
                        }
                        .text-slate-100, .dark\\:text-slate-100, .dark\\:text-white {
                            color: #1e293b !important;
                        }
                        
                        /* Forçar Insights visíveis na impressão */
                        .group-hover\\/insight\\:opacity-100 {
                            opacity: 1 !important;
                            visibility: visible !important;
                            position: relative !important;
                            display: block !important;
                            width: 100% !important;
                            bottom: auto !important;
                            left: auto !important;
                            margin-top: 10px !important;
                            transform: none !important;
                            box-shadow: none !important;
                            border: 1px dashed #cbd5e1 !important;
                            background: #f8fafc !important;
                        }
                        .group\\/insight button {
                            display: none !important;
                        }
                        .group\\/insight::before {
                            content: 'ANÁLISE DE POTENCIAL (INSIGHT)';
                            display: block;
                            font-size: 8px;
                            font-weight: 900;
                            color: #6366f1;
                            letter-spacing: 0.1em;
                            margin-bottom: 5px;
                        }
                    }
                `;
