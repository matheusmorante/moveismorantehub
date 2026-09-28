import Service, { ServiceVisibilitySettings } from '../../types/service.type';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ServiceTableProps {
  services: Service[];
  visibility: ServiceVisibilitySettings;
  onEdit: (service: Service) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  searchTerm: string;
}

const ServiceTable = ({
  services,
  visibility,
  onEdit,
  onDelete,
  searchTerm,
}: ServiceTableProps) => {
  if (services.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm font-bold">
          <div className="flex flex-col items-center justify-center gap-3">
            <i className="bi bi-tools text-5xl opacity-20" />
            {searchTerm
              ? 'Nenhum serviço encontrado para esta busca.'
              : 'Nenhum serviço cadastrado.'}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {services.map((service) => (
        <tr
          key={service.id}
          onClick={() => onEdit(service)}
          className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
        >
          {visibility.id && (
            <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              #{service.id}
            </td>
          )}
          {visibility.description && (
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    service.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {service.description}
                </span>
              </div>
            </td>
          )}
          {visibility.unitPrice && (
            <td className="px-6 py-4 text-right">
              <span className="inline-flex px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl font-black text-xs tracking-wide border border-blue-100 dark:border-blue-800/30">
                {formatCurrency(service.unitPrice)}
              </span>
            </td>
          )}
          {visibility.actions && (
            <td className="px-6 py-4 text-center">
              <div className="flex items-center justify-center">
                <button
                  onClick={(e) => onDelete(service.id!, e)}
                  className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors flex items-center justify-center active:scale-95"
                  title="Apagar Serviço"
                >
                  <i className="bi bi-trash" />
                </button>
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  );
};

export default ServiceTable;
