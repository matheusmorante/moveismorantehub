import logo from '../../assets/logo.jpeg';
import { getSettings } from '@/pages/utils/settingsService';

interface Props {
    seller: string;
}

const Header = ({ seller }: Props) => {
    const settings = getSettings();
    const companyName = settings.companyName || "Móveis Morante";
    const companyCnpj = settings.companyCnpj || "44.512.248.0001/07";
    const companyAddress = settings.companyAddress || "Rua Cascavel, 306, Guaraituba, Colombo-PR, CEP 83410270.";
    const companyPhone = settings.companyPhone || "41997493547 | 41992244631";

    return (
        <header className='flex justify-between items-start pb-4 border-b-2 border-slate-100 text-slate-800 transition-colors duration-300 shrink-0'>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-1 shadow-sm border border-slate-50 overflow-hidden flex items-center justify-center">
                        <img src={logo} alt={`Logo ${companyName}`} className='w-full h-full object-contain rounded-xl' />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">{companyName}</h1>
                    </div>
                </div>
            </div>
            
            <div className='flex flex-col items-end text-right gap-1 max-w-[50%]'>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsável</p>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-tight">{seller}</p>
                </div>
                
                <div className="space-y-0.5 mt-1">
                    <p className="text-[10px] text-slate-500 font-medium">
                        <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">CNPJ:</span> {companyCnpj}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                        <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Endereço:</span> {companyAddress}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                        <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Contato:</span> {companyPhone}
                    </p>
                </div>
            </div>
        </header>
    )
}

export default Header;