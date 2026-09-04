interface OrderOperationalNoticesProps {
    tags: string[];
    isBudget: boolean;
}

const OrderOperationalNotices = ({ tags, isBudget }: OrderOperationalNoticesProps) => {
    if (tags.length === 0 || isBudget) return null;

    return (
        <div className="border-2 border-red-500/20 rounded-2xl p-3 bg-red-50/30 mb-2 print-exact-bg-light">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-2">
                <i className="bi bi-exclamation-octagon-fill"></i>
                OBSERVAÇÕES OPERACIONAIS
            </h2>
            <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white border border-red-100 text-[11px] font-bold rounded-lg text-red-700 uppercase tracking-tight shadow-sm">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default OrderOperationalNotices;
