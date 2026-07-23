import React from "react";
import Order from "../../types/order.type";
import { subscribeToPeople } from "../../utils/personService";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import Person from "../../types/person.type";
import { toast } from "react-toastify";

interface FormHeaderProps {
    currentOrder?: Order | null;
    onClearForm: () => void;
    currentOrderId?: string | null;
    orderDate: string;
    setOrderDate: (date: string) => void;
    seller: string;
    setSeller: (seller: string) => void;
    isSavingDraft: boolean;
    errors: Record<string, string>;
    deliveryMethod: 'delivery' | 'pickup';
    setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
    onMainAction?: (e?: React.MouseEvent) => void;
    isSaving?: boolean;
    status: string;
    isBudget?: boolean;
    onLoadJSON?: (data: any) => void;
}

const JSON_TEMPLATE = {
  client: {
    personType: "PF",
    fullName: "João da Silva",
    cpfCnpj: "123.456.789-00",
    phone: "(11) 99999-9999",
    email: "joao.silva@example.com",
    marketingOrigin: "paid",
    fullAddress: {
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      complement: "Apto 52",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      observation: "Próximo ao MASP"
    }
  },
  order: {
    seller: "Vendedor Exemplo",
    date: "2026-07-23T10:15:00.000Z",
    observation: "Observações do pedido realizadas via JSON",
    shipping: {
      deliveryMethod: "delivery",
      value: 15.00,
      scheduling: {
        notInformed: false,
        dateType: "range",
        date: "2026-07-23",
        endDate: "2026-07-25",
        type: "range",
        time: "",
        startTime: "09:00",
        endTime: "10:00"
      }
    },
    items: [
      {
        code: "PROD-001",
        description: "Cadeira de Escritório Ergonômica",
        unitPrice: 350.00,
        quantity: 2,
        costPrice: 200.00,
        handlingType: "Execução no local",
        condition: "novo"
      }
    ],
    payments: [
      {
        method: "Pix",
        amount: 715.00,
        status: "Pago"
      }
    ]
  }
};

const PROMPT_INSTRUCTIONS = `Você é uma inteligência artificial responsável por extrair informações de pedidos de vendas a partir de áudios, mensagens de texto ou anotações e formatá-las no formato JSON do ERP.

Regras e Campos Obrigatórios:
1. "client" (Chave Opcional):
   - Envie se for necessário cadastrar o cliente. "fullName" e "phone" são recomendados.
   - "marketingOrigin": Deve ser "paid" ou "organic".
   - "fullAddress": Objeto contendo "cep", "street", "number", "neighborhood", "city", "state" (Ex: "SP"), "complement", "observation".
   - IMPORTANTE: "noPhone" ou "noAddress" devem ser true APENAS se informado explicitamente que o cliente não os possui. Senão, deixe-os como false/omitidos.

2. "order" (Chave do Pedido):
   - "seller": Nome do vendedor (Obrigatório).
   - "observation": Observações do pedido.
   - "shipping": Objeto com "deliveryMethod" ("delivery"|"pickup"), "value" (frete, numérico) e "scheduling" (agendamento).
     * Agendamento ("scheduling"):
       - "notInformed": true se não houver agendamento, senão false.
       - "dateType": "fixed" (data específica) ou "range" (período).
       - "date": data YYYY-MM-DD (ou data de início se for período).
       - "endDate": data de fim YYYY-MM-DD (obrigatório se "dateType" for "range").
       - "type": "fixed" (horário fixo) ou "range" (período).
       - "time": horário HH:MM (se "type" for "fixed").
       - "startTime"/"endTime": horários HH:MM (se "type" for "range").
   - "items": Lista de itens. Cada item deve conter:
     * "code": Código SKU.
     * "description": Nome do produto.
     * "unitPrice": Preço unitário numérico.
     * "quantity": Quantidade numérica.
     * "costPrice": Preço de custo (opcional).
     * "handlingType": Escolha exatamente um: "Na caixa > Montagem no deposito > Entregue montado", "De mostruário montado > Entregue montado", "Na caixa > Montagem no local da entrega", "De mostruário > Desmontagem do mostruário > Montagem na entrega", "Na caixa > Montagem por conta do cliente", "Item não necessita de montagem" ou "De mostruario > Entregue desmontado para o cliente montar".
     * "condition": Condição do item ("novo", "salvado", "outlet").
   - "payments": Lista de pagamentos. Cada pagamento contém:
     * "method": Forma de pagamento (Ex: "Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Promissória").
}`;

const FormHeader = ({ 
    currentOrder, 
    onClearForm, 
    orderDate, 
    setOrderDate, 
    seller, 
    setSeller, 
    isSavingDraft,
    errors,
    currentOrderId,
    deliveryMethod,
    setDeliveryMethod,
    onMainAction,
    isSaving,
    status,
    isBudget,
    onLoadJSON
}: FormHeaderProps) => {
    const [employeeNames, setEmployeeNames] = React.useState<string[]>([]);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = React.useState(false);
    const [isManualOpen, setIsManualOpen] = React.useState(false);
    const [isJSONModalOpen, setIsJSONModalOpen] = React.useState(false);
    const [manualJSON, setManualJSON] = React.useState("");

    React.useEffect(() => {
        const unsubscribe = subscribeToPeople('employees', (people) => {
            const names = people
                .map(p => p.fullName)
                .filter(name => name && name.trim() !== "");
            setEmployeeNames(names);
        });
        return unsubscribe;
    }, []);

    const handleEmployeeSuccess = (person: Person) => {
        if (person.fullName) {
            setSeller(person.fullName);
        }
        setIsEmployeeModalOpen(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (onLoadJSON) {
                    onLoadJSON(parsed);
                    setIsJSONModalOpen(false);
                }
            } catch (err: any) {
                toast.error("Arquivo JSON inválido: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleProcessManualJSON = () => {
        try {
            const parsed = JSON.parse(manualJSON);
            if (onLoadJSON) {
                onLoadJSON(parsed);
                setIsJSONModalOpen(false);
                setManualJSON("");
            }
        } catch (err: any) {
            toast.error("JSON inválido: " + err.message);
        }
    };

    return (
        <div className="flex flex-col gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-8 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {currentOrderId && (
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm">
                                #{currentOrderId.slice(-6).toUpperCase()}
                            </div>
                        </div>
                    )}

                    {!isBudget && (
                        <div className="flex items-center flex-wrap gap-3">
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod('delivery')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'delivery'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <i className="bi bi-truck text-xs" /> Entrega
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod('pickup')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'pickup'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-105'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <i className="bi bi-hand-index-thumb-fill text-xs" /> Retirada
                                </button>
                            </div>

                            {onLoadJSON && (
                                <button
                                    type="button"
                                    onClick={() => setIsJSONModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/35 border border-blue-200/50 dark:border-blue-800/80 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 transition-all shadow-premium-sm hover:scale-105"
                                >
                                    <i className="bi bi-filetype-json text-xs" /> Preenchimento Inteligente
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dedicated Unified JSON Import Modal */}
            {isJSONModalOpen && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                    onClick={() => {
                        setIsJSONModalOpen(false);
                        setIsPromptInstructionsOpen(false);
                    }}
                >
                    <div 
                        className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800/80 max-h-[85vh] animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                                    <i className="bi bi-filetype-json text-lg" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Preenchimento Inteligente via JSON</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsJSONModalOpen(false);
                                    setIsPromptInstructionsOpen(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                            >
                                <i className="bi bi-x-lg text-sm" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-4">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                Escolha uma das opções abaixo para preencher o formulário automaticamente. Se o JSON contiver a chave <code className="text-blue-500 font-mono">client</code>, o cadastro de cliente abrirá automaticamente primeiro.
                            </p>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* File Upload Button */}
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800/80 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-premium-sm">
                                    <i className="bi bi-cloud-upload-fill text-xs" /> Carregar Arquivo JSON
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>

                                {/* Toggle Manual Text Area Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsManualOpen(!isManualOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-premium-sm ${
                                        isManualOpen 
                                        ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    <i className="bi bi-pencil-fill text-xs" /> Colar JSON Manualmente
                                </button>
                            </div>

                            {isManualOpen && (
                                <div className="flex flex-col gap-2 animate-fade-in">
                                    <textarea
                                        value={manualJSON}
                                        onChange={(e) => setManualJSON(e.target.value)}
                                        placeholder="Cole a estrutura JSON do seu pedido aqui..."
                                        className="w-full h-32 p-3 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 custom-scrollbar text-slate-700 dark:text-slate-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleProcessManualJSON}
                                        className="self-end px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                                    >
                                        Processar e Preencher
                                    </button>
                                </div>
                            )}

                            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2">Instruções de Prompt e Template de Exemplo para a IA:</h4>
                                <div className="relative">
                                    <textarea
                                        readOnly
                                        value={`${PROMPT_INSTRUCTIONS}\n\n--------------------------------------------------\nTEMPLATE JSON DE EXEMPLO PARA A IA RETORNAR:\n--------------------------------------------------\n${JSON.stringify(JSON_TEMPLATE, null, 2)}`}
                                        className="w-full h-80 p-4 text-[10px] font-medium bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 focus:ring-0 custom-scrollbar resize-none font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const combinedText = `${PROMPT_INSTRUCTIONS}\n\n--------------------------------------------------\nTEMPLATE JSON DE EXEMPLO PARA A IA RETORNAR:\n--------------------------------------------------\n${JSON.stringify(JSON_TEMPLATE, null, 2)}`;
                                            navigator.clipboard.writeText(combinedText);
                                            toast.success("Prompt e Template copiados para a área de transferência!");
                                        }}
                                        className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                                    >
                                        <i className="bi bi-clipboard text-xs" /> Copiar Prompt + Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormHeader;
