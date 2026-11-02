import type CustomerData from '@/pages/types/customerData.type';
import type Order from '@/pages/types/order.type';
import type Person from '@/pages/types/person.type';
import { isTestOrder } from '@/pages/utils/hmlTestData';
import { isTestPerson } from '@/pages/utils/personService';

export interface CustomerSearchEntry {
  id: string;
  fullName: string;
  phone: string;
  source: 'cadastro' | 'pedido';
  totalOrders: number;
  lastOrder?: string;
  customerData: CustomerData;
}

export function buildCustomerSearchEntries(
  people: Person[],
  orders: Partial<Order>[],
): CustomerSearchEntry[] {
  const map = new Map<string, CustomerSearchEntry>();

  people.forEach((p) => {
    if (isTestPerson(p)) return;
    const name = (p.fullName || p.tradeName || '').trim();
    if (!name) return;
    const key = name.toLowerCase();

    map.set(key, {
      id: p.id || key,
      fullName: name,
      phone: p.phone || '',
      source: 'cadastro',
      totalOrders: 0,
      customerData: {
        id: p.id,
        personType: p.personType || (p.cpfCnpj && p.cpfCnpj.length > 14 ? 'PJ' : 'PF'),
        cpfCnpj: p.cpfCnpj || '',
        ie: p.ie || p.rgIe || '',
        rgIe: p.rgIe || p.ie || '',
        ieIndicator: p.ieIndicator || '9',
        email: p.email || '',
        fullName: name,
        phone: p.phone || '',
        noPhone: p.noPhone || false,
        fullAddress: p.fullAddress || {
          cep: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          observation: '',
        },
      },
    });
  });

  orders.forEach((o) => {
    if (isTestOrder(o)) return;
    const name = (o.customerData?.fullName || '').trim();
    if (!name) return;
    const key = name.toLowerCase();

    const existing = map.get(key);
    if (existing) {
      existing.totalOrders += 1;
      if (!existing.lastOrder || o.date > (existing.lastOrder || '')) {
        existing.lastOrder = o.date;
      }
      if (o.customerData?.fullAddress?.street && !existing.customerData.fullAddress.street) {
        existing.customerData = {
          ...existing.customerData,
          ...o.customerData,
        };
      }
    } else {
      map.set(key, {
        id: key,
        fullName: name,
        phone: o.customerData?.phone || '',
        source: 'pedido',
        totalOrders: 1,
        lastOrder: o.date,
        customerData: {
          fullName: name,
          phone: o.customerData?.phone || '',
          noPhone: o.customerData?.noPhone || false,
          fullAddress: o.customerData?.fullAddress || {
            cep: '',
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            observation: '',
          },
        },
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.source === 'cadastro' && b.source !== 'cadastro') return -1;
    if (b.source === 'cadastro' && a.source !== 'cadastro') return 1;
    if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
    return a.fullName.localeCompare(b.fullName);
  });
}
