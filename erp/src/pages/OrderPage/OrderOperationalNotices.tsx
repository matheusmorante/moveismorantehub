interface OrderOperationalNoticesProps {
  tags: string[];
  isBudget: boolean;
  instructions?: string;
}

const OrderOperationalNotices = ({ tags, isBudget, instructions }: OrderOperationalNoticesProps) => {
  if ((tags.length === 0 && !instructions) || isBudget) return null;

  return (
    <div className="border-2 border-red-500/20 rounded-2xl p-3 bg-red-50/30 mb-2 print-exact-bg-light">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-2">
        <i className="bi bi-exclamation-octagon-fill"></i>
        AVISOS IMPORTANTES
      </h2>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag: string, i: number) => (
            <span
              key={i}
              className="px-3 py-1 bg-white border border-red-100 text-[11px] font-bold rounded-lg text-red-700 uppercase tracking-tight shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {instructions && (
        <p className="mt-2 whitespace-pre-wrap text-xs font-medium leading-relaxed text-red-800">
          {instructions}
        </p>
      )}
    </div>
  );
};

export default OrderOperationalNotices;
