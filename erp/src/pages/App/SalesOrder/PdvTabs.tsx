import React from "react";
type PdvTabsProps = {
    activeTab: "pdv" | "history" | "schedule";
    setActiveTab: (tab: "pdv" | "history" | "schedule") => void;
};

const PdvTabs = ({ activeTab, setActiveTab }: PdvTabsProps) => {
    const tabs = [
        { key: "pdv", label: "Adicionar Pedido" },
        { key: "history", label: "Histórico de Pedidos" },
        { key: "schedule", label: "Agenda" },
    ] as const;

    return (
        <div className="flex gap-4 mt-4 w-[900px]">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === tab.key
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300"
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default PdvTabs;
