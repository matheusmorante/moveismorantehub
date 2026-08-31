import React, { useState } from "react";

interface ReturnObservationTagsProps {
    observations: string[];
    onChange: (observations: string[]) => void;
    label: string;
}

const normalizeObservation = (value: string) => value.trim().replace(/\s+/g, " ");

const ReturnObservationTags: React.FC<ReturnObservationTagsProps> = ({ observations, onChange, label }) => {
    const [draft, setDraft] = useState("");

    const addObservation = () => {
        const observation = normalizeObservation(draft);
        if (!observation) return;

        const alreadyAdded = observations.some(
            item => item.localeCompare(observation, undefined, { sensitivity: "accent" }) === 0
        );

        if (!alreadyAdded) {
            onChange([...observations, observation]);
        }

        setDraft("");
    };

    const removeObservation = (index: number) => {
        onChange(observations.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {label}
            </label>
            <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 transition-colors focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
                {observations.map((observation, index) => (
                    <span
                        key={`${observation}-${index}`}
                        className="flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                    >
                        {observation}
                        <button
                            type="button"
                            onClick={() => removeObservation(index)}
                            aria-label={`Remover observação: ${observation}`}
                            className="ml-0.5 text-blue-600 transition-colors hover:text-blue-950 dark:text-blue-300 dark:hover:text-white"
                        >
                            <i className="bi bi-x-lg text-[10px]" />
                        </button>
                    </span>
                ))}
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addObservation();
                        }
                    }}
                    placeholder={observations.length ? "Adicionar outra observação..." : "Digite e pressione Enter"}
                    className="min-w-48 flex-1 bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
            </div>
            <p className="text-[10px] text-slate-400">Pressione Enter para adicionar cada observação.</p>
        </div>
    );
};

export default ReturnObservationTags;
