import Order from "@/pages/types/order.type";
import { AppSettings } from "../../settingsService";

export interface DanfeData {
    order: Order;
    settings: AppSettings;
    accessKey: string;
    nfeNumber: number;
    series: string;
    protocolNumber: string;
    protocolDate: string;
    model: '55' | '65';
    environment: 1 | 2;
    status: 'autorizada' | 'homologada' | 'pendente';
    natOp?: string;
}
