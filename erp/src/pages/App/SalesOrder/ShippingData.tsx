import React from "react";
import DropdownPortal from "@/components/shared/DropdownPortal";
import Shipping from "../../types/Shipping.type";
import CustomerData from "../../types/customerData.type";
import { getShippingRouteUrl, getAddressByCep, searchAddressSuggestions } from "../../utils/maps";
import { ValidationErrors } from "../../utils/validations";
import { getSettings } from '@/pages/utils/settingsService';
import FreteDistancia from "./ShippingComponents/FreteDistancia";
import Agendamento from "./ShippingComponents/Agendamento";
import MapRoute from "./ShippingComponents/MapRoute";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;
import SmartInput from "../../../components/SmartInput";

interface Props {
    shipping: Shipping;
    setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
    customerData: CustomerData;
    isCalculatingDistance?: boolean;
    onAutoCalculateDistance?: () => void;
    errors: ValidationErrors;
}

const ShippingData = ({ shipping, setShipping, customerData, isCalculatingDistance, onAutoCalculateDistance, errors }: Props) => {
    const [streetSuggestions, setStreetSuggestions] = React.useState<any[]>([]);
    const [isStreetSuggestionsOpen, setIsStreetSuggestionsOpen] = React.useState(false);
    const streetWrapperRef = React.useRef<HTMLDivElement>(null);

    const activeAddress = shipping.useCustomerAddress === false && shipping.deliveryAddress
        ? shipping.deliveryAddress
        : customerData.fullAddress;

    const route = getShippingRouteUrl(activeAddress);
    const settings = getSettings();

    const onChangeShippingValue = (newValue: number) => {
        setShipping((prev: Shipping) => ({ ...prev, value: newValue }));
    };

    const onChangeDistance = (newValue: string) => {
        const numValue = parseFloat(newValue.replace(',', '.'));
        setShipping((prev: Shipping) => {
            const distance = isNaN(numValue) ? undefined : numValue;
            let value = prev.value;

            // Auto-calculate freight if distance is valid, rate is configured AND auto-calculate is enabled
            if (prev.autoCalculateValue && distance !== undefined && settings.freightPerKm > 0) {
                value = distance * settings.freightPerKm;
            }

            return { ...prev, distance, value };
        });
    };

    const onChangeScheduling = (
        key: keyof Shipping["scheduling"],
        value: string | Date
    ) => {
        setShipping((prev: Shipping) => {
            const newScheduling = { ...prev.scheduling, [key]: value };

            if (newScheduling.type === 'fixed') {
                newScheduling.time = newScheduling.startTime || '';
            } else {
                newScheduling.time = `${newScheduling.startTime || ''} às ${newScheduling.endTime || ''}`;
            }

            return {
                ...prev,
                scheduling: newScheduling as Shipping["scheduling"],
            };
        });
    };

    const handleStreetChange = async (val: string) => {
        updateDeliveryAddress('street', val);
        if (val.length >= 3) {
            const suggestions = await searchAddressSuggestions(val);
            setStreetSuggestions(suggestions);
            setIsStreetSuggestionsOpen(true);
        } else {
            setStreetSuggestions([]);
            setIsStreetSuggestionsOpen(false);
        }
    };

    const handleSelectAddressSuggestion = (suggestion: any) => {
        const addr = suggestion.address;
        setShipping(prev => ({
            ...prev,
            deliveryAddress: {
                ...prev.deliveryAddress!,
                street: addr.road || addr.pedestrian || addr.suburb || suggestion.display_name.split(',')[0],
                neighborhood: addr.neighbourhood || addr.suburb || "",
                city: addr.city || addr.town || addr.village || "",
                cep: addr.postcode ? addr.postcode.replace(/\D/g, '') : prev.deliveryAddress?.cep || ""
            }
        }));
        setIsStreetSuggestionsOpen(false);
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cepValue = e.target.value.replace(/\D/g, "");
        if (cepValue.length === 8) {
            try {
                const data = await getAddressByCep(cepValue);
                if (data && !(data as any).error) {
                    setShipping(prev => ({
                        ...prev,
                        deliveryAddress: {
                            ...prev.deliveryAddress!,
                            street: data.street || "",
                            neighborhood: data.neighborhood || "",
                            city: data.city || "",
                        }
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            }
        }
    };

    const updateDeliveryAddress = (field: keyof NonNullable<Shipping['deliveryAddress']>, value: string) => {
        setShipping(prev => ({
            ...prev,
            deliveryAddress: {
                ...prev.deliveryAddress!,
                [field]: value
            }
        }));
    };

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="flex flex-col gap-10 w-full lg:gap-12">
                {shipping.deliveryMethod !== 'pickup' && (
                    <div className="flex flex-col gap-10">
                        {/* Custom Delivery Address Toggle */}
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                            <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={shipping.useCustomerAddress !== false}
                                        onChange={(e) => setShipping(prev => ({ ...prev, useCustomerAddress: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    Entregar no endereço cadastrado do cliente
                                </span>
                            </label>

                            {shipping.useCustomerAddress === false && (
                                <div className="mt-6 flex flex-col gap-4 animate-slide-up">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Endereço de Entrega Alternativo</h4>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-[1]">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">CEP</label>
                                            <PatternFormat
                                                format="#####-###"
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="00000-000"
                                                value={shipping.deliveryAddress?.cep || ""}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDeliveryAddress('cep', e.target.value)}
                                                onBlur={handleCepBlur}
                                            />
                                        </div>
                                        <div className="flex-[3] relative group/field" ref={streetWrapperRef}>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Rua/Avenida <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`w-full bg-white dark:bg-slate-950 border px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 transition-all ${errors['deliveryAddress_street'] ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'}`}
                                                placeholder="Nome da rua"
                                                value={shipping.deliveryAddress?.street || ""}
                                                onChange={e => handleStreetChange(e.target.value)}
                                                onFocus={() => { if (streetSuggestions.length > 0) setIsStreetSuggestionsOpen(true); }}
                                            />
                                            <DropdownPortal anchorRef={streetWrapperRef} isOpen={isStreetSuggestionsOpen && streetSuggestions.length > 0}>
                                                <div className="mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                                                    {streetSuggestions.map((s, i) => (
                                                        <button key={i} type="button"
                                                            onClick={() => handleSelectAddressSuggestion(s)}
                                                            className="w-full text-left p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors last:border-0"
                                                        >
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.display_name}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </DropdownPortal>
                                            {errors['deliveryAddress_street'] && (
                                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                                    {errors['deliveryAddress_street']}
                                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-[1] relative group/field">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Número <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`w-full bg-white dark:bg-slate-950 border px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 transition-all ${errors['deliveryAddress_number'] ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'}`}
                                                placeholder="Ex: 123"
                                                value={shipping.deliveryAddress?.number || ""}
                                                onChange={e => updateDeliveryAddress('number', e.target.value)}
                                            />
                                            {errors['deliveryAddress_number'] && (
                                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                                    {errors['deliveryAddress_number']}
                                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Complemento</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="Apto, Bloco, etc"
                                                value={shipping.deliveryAddress?.complement || ""}
                                                onChange={e => updateDeliveryAddress('complement', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 relative group/field">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Bairro <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`w-full bg-white dark:bg-slate-950 border px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 transition-all ${errors['deliveryAddress_neighborhood'] ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'}`}
                                                placeholder="Seu bairro"
                                                value={shipping.deliveryAddress?.neighborhood || ""}
                                                onChange={e => updateDeliveryAddress('neighborhood', e.target.value)}
                                            />
                                            {errors['deliveryAddress_neighborhood'] && (
                                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                                    {errors['deliveryAddress_neighborhood']}
                                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-[1.5] relative group/field">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Cidade <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`w-full bg-white dark:bg-slate-950 border px-3 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 transition-all ${errors['deliveryAddress_city'] ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'}`}
                                                placeholder="Nome da cidade"
                                                value={shipping.deliveryAddress?.city || ""}
                                                onChange={e => updateDeliveryAddress('city', e.target.value)}
                                            />
                                            {errors['deliveryAddress_city'] && (
                                                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                                                    {errors['deliveryAddress_city']}
                                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <SmartInput
                                            label="Ponto de Referência / Observação de Entrega"
                                            value={shipping.deliveryAddress?.observation || ""}
                                            onValueChange={val => updateDeliveryAddress('observation', val)}
                                            tableName="orders"
                                            columnName="observation"
                                            placeholder="Ex: Casa verde em frente a padaria..."
                                            icon="bi-geo-alt"
                                            className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <FreteDistancia
                            value={shipping.value}
                            distance={shipping.distance}
                            routeUrl={route}
                            onChangeValue={onChangeShippingValue}
                            onChangeDistance={onChangeDistance}
                            onAutoCalculateDistance={onAutoCalculateDistance}
                            autoCalculateValue={shipping.autoCalculateValue}
                            onToggleAutoCalculate={() => setShipping(prev => {
                                const newValue = !prev.autoCalculateValue;
                                let newShippingValue = prev.value;
                                if (newValue && prev.distance !== undefined && settings.freightPerKm > 0) {
                                    newShippingValue = prev.distance * settings.freightPerKm;
                                }
                                return { ...prev, autoCalculateValue: newValue, value: newShippingValue };
                            })}
                            isCalculatingDistance={isCalculatingDistance}
                            errors={errors}
                        />
                    </div>
                )}
                <Agendamento
                    scheduling={shipping.scheduling}
                    onChangeScheduling={onChangeScheduling}
                    errors={errors}
                    isPickup={shipping.deliveryMethod === 'pickup'}
                />
            </div>

            {shipping.destinationCoords && shipping.deliveryMethod !== 'pickup' && (
                <div className="w-full flex flex-col gap-2 relative group -mt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Rota de Entrega</label>
                    <MapRoute
                        destinationCoords={shipping.destinationCoords}
                        routeGeoJSON={shipping.routeGeoJSON}
                        className="h-80 w-full animate-slide-up"
                    />
                </div>
            )}
        </div>
    );
};

export default ShippingData;