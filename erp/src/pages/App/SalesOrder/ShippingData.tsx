import React from "react";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import Shipping from "../../types/Shipping.type";
import CustomerData from "../../types/customerData.type";
import { getShippingRouteUrl, getAddressByCep } from "../../utils/maps";
import { ValidationErrors } from "../../utils/validations";
import { calculateFreightByDistance } from "../../utils/shippingPricing";
import FreteDistancia from "./ShippingComponents/FreteDistancia";
import Agendamento from "./ShippingComponents/Agendamento";
import MapRoute from "./ShippingComponents/MapRoute";
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;
import SmartInput from "../../../components/SmartInput";
import AddressVerificationMap from "./AddressVerificationMap";

interface Props {
    shipping: Shipping;
    setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
    customerData: CustomerData;
    isCalculatingDistance?: boolean;
    onAutoCalculateDistance?: () => void;
    errors: ValidationErrors;
    orderType?: string;
}

const ShippingData = ({ shipping, setShipping, customerData, isCalculatingDistance, onAutoCalculateDistance, errors, orderType }: Props) => {
    
    // Auto-enable noAddress for "Consumidor Final" or if it is a Pickup
    React.useEffect(() => {
        const isFinalConsumer = customerData.fullName?.toLowerCase().trim() === 'consumidor final';
        const isPickup = shipping.deliveryMethod === 'pickup';
        
        if ((isFinalConsumer || isPickup) && !shipping.noAddress) {
            setShipping(prev => ({ ...prev, noAddress: true }));
        }
    }, [customerData.fullName, shipping.deliveryMethod]);

    const activeAddress = orderType === 'budget' 
        ? customerData.fullAddress
        : ((shipping.useCustomerAddress === false) && shipping.deliveryAddress
            ? shipping.deliveryAddress
            : customerData.fullAddress);

    const route = getShippingRouteUrl(activeAddress);
    const onChangeShippingValue = (newValue: number) => {
        setShipping((prev: Shipping) => ({ ...prev, value: newValue, autoCalculateValue: false }));
    };

    const onChangeDistance = (newValue: string) => {
        const numValue = parseFloat(newValue.replace(',', '.'));
        setShipping((prev: Shipping) => {
            const distance = isNaN(numValue) ? undefined : numValue;
            let value = prev.value;

            // Calcula o frete baseado na distância APENAS se o cálculo automático estiver ativado
            if (distance !== undefined && prev.autoCalculateValue) {
                value = calculateFreightByDistance(distance);
            }

            return { ...prev, distance, value };
        });
    };

    const onChangeScheduling = (
        key: keyof Shipping["scheduling"],
        value: string | Date | boolean
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
                            street: data.street || prev.deliveryAddress?.street || "",
                            neighborhood: data.neighborhood || prev.deliveryAddress?.neighborhood || "",
                            city: data.city || prev.deliveryAddress?.city || "",
                            state: (data.state || prev.deliveryAddress?.state || "PR").toUpperCase(),
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
                <div className="flex flex-col gap-10">
                        {/* Address Type Selector (Informar / Não Informar) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    {shipping.deliveryMethod === 'pickup' ? 'Local de Retirada / Endereço' : 'Endereço de Entrega'}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setShipping(prev => ({ ...prev, noAddress: !prev.noAddress }))}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                        shipping.noAddress 
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' 
                                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    <i className={`bi ${shipping.noAddress ? 'bi-geo-fill text-amber-500' : 'bi-geo-alt'}`}></i>
                                    {shipping.noAddress ? 'Endereço não informado' : 'Não informar endereço'}
                                </button>
                            </div>
                            
                            {shipping.noAddress && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 animate-fade-in">
                                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed flex items-center gap-2">
                                        <i className="bi bi-info-circle-fill"></i>
                                        O endereço de entrega foi marcado como não informado. O sistema permitirá prosseguir sem preencher os campos de rua e número.
                                    </p>
                                </div>
                            )}
                        </div>

                        {!shipping.noAddress && (
                            <div className="flex flex-col gap-10 animate-slide-up">
                        {/* Custom Delivery Address Toggle */}
                        {orderType !== 'budget' && (
                            <label className="flex w-fit cursor-pointer items-center gap-3 group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={shipping.useCustomerAddress !== false}
                                        onChange={(e) => setShipping(prev => ({ ...prev, useCustomerAddress: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400">
                                    Usar o mesmo endereço do cliente?
                                </span>
                            </label>
                        )}

                        {orderType !== 'budget' && shipping.useCustomerAddress === false && (
                            <div className="mt-0 flex flex-col gap-4 animate-slide-up">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Endereço de Entrega Alternativo
                                </h4>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-[1]">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">CEP</label>
                                        <PatternFormat
                                            format="#####-###"
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 dark:border-slate-800 dark:text-slate-300 dark:focus:border-blue-500"
                                            placeholder="00000-000"
                                            value={shipping.deliveryAddress?.cep || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDeliveryAddress('cep', e.target.value)}
                                            onBlur={handleCepBlur}
                                        />
                                    </div>
                                    <AddressAutocompleteInput
                                        value={shipping.deliveryAddress?.street || ""}
                                        onChange={val => updateDeliveryAddress('street', val)}
                                        onSelectAddress={data => {
                                            setShipping(prev => ({
                                                ...prev,
                                                deliveryAddress: {
                                                    ...prev.deliveryAddress!,
                                                    street: data.street,
                                                    neighborhood: data.neighborhood || prev.deliveryAddress?.neighborhood || "",
                                                    city: data.city || prev.deliveryAddress?.city || "",
                                                    state: data.state || prev.deliveryAddress?.state || "PR",
                                                    cep: data.cep || prev.deliveryAddress?.cep || "",
                                                    number: data.number || prev.deliveryAddress?.number || "",
                                                    mapsUrl: data.mapsUrl || prev.deliveryAddress?.mapsUrl
                                                }
                                            }));
                                        }}
                                        cityHint={shipping.deliveryAddress?.city}
                                        stateHint={shipping.deliveryAddress?.state || "PR"}
                                        variant="underline"
                                        hasError={!!errors['deliveryAddress_street']}
                                        label="Rua/Avenida"
                                        placeholder="Nome da rua"
                                        required
                                        className="flex-[3] relative group/field"
                                    />
                                    <div className="flex-[1] relative group/field">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Número <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${errors['deliveryAddress_number'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            placeholder="Ex: 123"
                                            value={shipping.deliveryAddress?.number || ""}
                                            onChange={e => updateDeliveryAddress('number', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Complemento</label>
                                        <input
                                            type="text"
                                            className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 dark:border-slate-800 dark:text-slate-300 dark:focus:border-blue-500"
                                            placeholder="Apto, Bloco, etc"
                                            value={shipping.deliveryAddress?.complement || ""}
                                            onChange={e => updateDeliveryAddress('complement', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 relative group/field">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Bairro</label>
                                        <input
                                            type="text"
                                            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${errors['deliveryAddress_neighborhood'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            placeholder="Seu bairro"
                                            value={shipping.deliveryAddress?.neighborhood || ""}
                                            onChange={e => updateDeliveryAddress('neighborhood', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-[1.5] relative group/field">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Cidade <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${errors['deliveryAddress_city'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            placeholder="Nome da cidade"
                                            value={shipping.deliveryAddress?.city || ""}
                                            onChange={e => updateDeliveryAddress('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-[0.6] relative group/field">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">UF</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            className="w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500 text-center"
                                            placeholder="PR"
                                            value={shipping.deliveryAddress?.state || "PR"}
                                            onChange={e => updateDeliveryAddress('state', e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative group/field">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">Tipo de Moradia</label>
                                        <select
                                            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${errors['deliveryAddress_housingType'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            value={shipping.deliveryAddress?.housingType || ""}
                                            onChange={e => updateDeliveryAddress('housingType', e.target.value)}
                                        >
                                            <option value="" disabled>Selecione o tipo...</option>
                                            <option value="Casa">Casa</option>
                                            <option value="Apartamento">Apartamento</option>
                                            <option value="Condomínio Residencial">Condomínio Residencial</option>
                                            <option value="Kitnet">Kitnet</option>
                                            <option value="Estabelecimento Comercial">Estabelecimento Comercial</option>
                                            <option value="Chácara">Chácara</option>
                                        </select>
                                    </div>
                                    <div className="flex-[2]">
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

                                {/* Address Verification Map for custom address */}
                                <div className="mt-2 animate-fade-in">
                                    <AddressVerificationMap 
                                        address={{
                                            street: shipping.deliveryAddress?.street || "",
                                            number: shipping.deliveryAddress?.number || "",
                                            neighborhood: shipping.deliveryAddress?.neighborhood || "",
                                            city: shipping.deliveryAddress?.city || ""
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <FreteDistancia
                            value={shipping.value}
                            distance={shipping.distance}
                            routeUrl={route}
                            onChangeValue={onChangeShippingValue}
                            onChangeDistance={onChangeDistance}
                            onAutoCalculateDistance={onAutoCalculateDistance}
                            autoCalculateValue={shipping.autoCalculateValue}
                            onToggleAutoCalculate={() => {
                                const isCurrentlyAuto = shipping.autoCalculateValue !== false;
                                const willBeAuto = !isCurrentlyAuto;
                                setShipping(prev => {
                                    let newShippingValue = prev.value;
                                    if (willBeAuto && prev.distance !== undefined) {
                                        newShippingValue = calculateFreightByDistance(prev.distance);
                                    }
                                    return { ...prev, autoCalculateValue: willBeAuto, value: newShippingValue };
                                });
                                if (willBeAuto && onAutoCalculateDistance) {
                                    onAutoCalculateDistance();
                                }
                            }}
                            isCalculatingDistance={isCalculatingDistance}
                            errors={errors}
                        />
                            </div>
                        )}
                    </div>
                {orderType !== 'budget' && (
                    <Agendamento
                        scheduling={shipping.scheduling}
                        onChangeScheduling={onChangeScheduling}
                        errors={errors}
                        isPickup={shipping.deliveryMethod === 'pickup'}
                    />
                )}
            </div>

            {shipping.destinationCoords && shipping.deliveryMethod !== 'pickup' && (
                <div className="w-full flex flex-col gap-2 relative group -mt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Rota de Entrega</label>
                    <MapRoute
                        destinationCoords={shipping.destinationCoords as [number, number]}
                        routeGeoJSON={shipping.routeGeoJSON}
                        className="h-80 w-full animate-slide-up"
                    />
                </div>
            )}
        </div>
    );
};

export default ShippingData;
