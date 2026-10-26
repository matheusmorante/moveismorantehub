import logo from '../../assets/logo-morante.svg';
import { getSettings } from '@/pages/utils/settingsService';

interface Props {
  seller: string;
}

const Header = ({ seller }: Props) => {
  const settings = getSettings();
  const companyName = settings.companyName || 'Móveis Morante';
  const companyCnpj = settings.companyCnpj || '44.512.248.0001/07';
  const companyAddress =
    settings.companyAddress || 'Rua Cascavel, 306, Guaraituba, Colombo-PR, CEP 83410270.';
  const companyPhone = settings.companyPhone || '41997493547 | 41992244631';

  return (
    <header className="receipt-print-header flex justify-between items-center py-1 pb-1.5 text-slate-800 transition-colors duration-300 shrink-0 mb-1">
      <div className="flex items-center">
        <div className="header-logo-container w-48 h-24 border-0 shadow-none flex items-center justify-start shrink-0">
          <img
            src={logo}
            alt={`Logo ${companyName}`}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex flex-col items-end text-right gap-0.5 max-w-[55%]">
        <div className="bg-slate-50 px-2 py-0.5 rounded-lg mb-0.5 flex items-center gap-1.5">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Responsável
          </span>
          <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight leading-none">
            {seller}
          </span>
        </div>

        <div className="space-y-0 text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight">
          <p>
            <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">CNPJ:</span>{' '}
            {companyCnpj}
          </p>
          <p>
            <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">
              Endereço:
            </span>{' '}
            {companyAddress}
          </p>
          <p>
            <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">
              Contato:
            </span>{' '}
            {companyPhone}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
