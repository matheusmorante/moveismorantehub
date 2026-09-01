import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillSnapshots() {
  console.log("Iniciando backfill de snapshot de Clientes e Vendedores nas vendas passadas...");
  
  // 1. Carregar people (clientes e colaboradores)
  const { data: people, error: peopleErr } = await supabase.from('people').select('*');
  if (peopleErr) {
    console.error("Erro ao buscar people:", peopleErr);
    return;
  }
  
  const peopleById = new Map();
  const peopleByName = new Map();
  const employeesByName = new Map();
  
  for (const p of (people || [])) {
    if (p.id) peopleById.set(String(p.id), p);
    if (p.fullName) {
      const cleanName = p.fullName.trim().toLowerCase();
      peopleByName.set(cleanName, p);
      if (p.type === 'employees' || (p.roles && p.roles.length > 0)) {
        employeesByName.set(cleanName, p);
      }
    }
  }

  // 2. Carregar todas as ordens
  const { data: orders, error: ordersErr } = await supabase.from('orders').select('*');
  if (ordersErr) {
    console.error("Erro ao buscar orders:", ordersErr);
    return;
  }

  console.log(`Total de pedidos encontrados: ${orders.length}`);

  let updatedCount = 0;
  
  for (const order of orders) {
    const oData = { ...(order.order_data || {}) };
    let changed = false;

    // --- A. BACKFILL CLIENTE ---
    const currentCustomerData = oData.customerData || {};
    const hasFullCustomer = !!(
      currentCustomerData.fullName &&
      (currentCustomerData.phone || currentCustomerData.noPhone) &&
      (currentCustomerData.fullAddress?.street || currentCustomerData.noAddress || currentCustomerData.fullAddress?.city)
    );

    if (!hasFullCustomer) {
      // Tenta achar person
      let p = null;
      if (order.customer_id && peopleById.has(String(order.customer_id))) {
        p = peopleById.get(String(order.customer_id));
      } else if (currentCustomerData.id && peopleById.has(String(currentCustomerData.id))) {
        p = peopleById.get(String(currentCustomerData.id));
      } else if (order.customer_name && peopleByName.has(order.customer_name.trim().toLowerCase())) {
        p = peopleByName.get(order.customer_name.trim().toLowerCase());
      } else if (currentCustomerData.fullName && peopleByName.has(currentCustomerData.fullName.trim().toLowerCase())) {
        p = peopleByName.get(currentCustomerData.fullName.trim().toLowerCase());
      }

      if (p) {
        oData.customerData = {
          id: String(p.id || currentCustomerData.id || ''),
          fullName: p.fullName || order.customer_name || currentCustomerData.fullName || '',
          phone: p.phone || currentCustomerData.phone || '',
          noPhone: p.noPhone ?? currentCustomerData.noPhone ?? false,
          email: p.email || currentCustomerData.email || '',
          cpfCnpj: p.cpfCnpj || currentCustomerData.cpfCnpj || '',
          noAddress: p.noAddress ?? currentCustomerData.noAddress ?? false,
          fullAddress: {
            cep: p.fullAddress?.cep || currentCustomerData.fullAddress?.cep || '',
            street: p.fullAddress?.street || currentCustomerData.fullAddress?.street || '',
            number: p.fullAddress?.number || currentCustomerData.fullAddress?.number || '',
            neighborhood: p.fullAddress?.neighborhood || currentCustomerData.fullAddress?.neighborhood || '',
            city: p.fullAddress?.city || currentCustomerData.fullAddress?.city || '',
            state: p.fullAddress?.state || currentCustomerData.fullAddress?.state || '',
            complement: p.fullAddress?.complement || currentCustomerData.fullAddress?.complement || '',
            housingType: p.fullAddress?.housingType || currentCustomerData.fullAddress?.housingType || '',
            observation: p.fullAddress?.observation || currentCustomerData.fullAddress?.observation || '',
            mapsUrl: p.fullAddress?.mapsUrl || currentCustomerData.fullAddress?.mapsUrl || ''
          },
          additionalContacts: p.additionalContacts || currentCustomerData.additionalContacts || [],
          observations: p.observations || currentCustomerData.observations || ''
        };
        changed = true;
      } else if (order.customer_name && !currentCustomerData.fullName) {
        // Pelo menos coloca o nome do cliente no snapshot
        oData.customerData = {
          ...currentCustomerData,
          fullName: order.customer_name
        };
        changed = true;
      }
    }

    // --- B. BACKFILL VENDEDOR ---
    const sellerName = oData.seller || order.seller_name || '';
    const currentSellerId = oData.sellerId || order.seller_id;

    if (sellerName && !currentSellerId) {
      const emp = employeesByName.get(sellerName.trim().toLowerCase()) || peopleByName.get(sellerName.trim().toLowerCase());
      if (emp && emp.id) {
        oData.sellerId = String(emp.id);
        changed = true;
      }
    }

    if (changed) {
      const updatePayload = {
        order_data: oData,
        customer_name: oData.customerData?.fullName || order.customer_name || null,
        seller_name: oData.seller || order.seller_name || null,
        seller_id: oData.sellerId || order.seller_id || null
      };

      if (oData.customerData?.id && !order.customer_id) {
        updatePayload.customer_id = oData.customerData.id;
      }

      const { error: updErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id);

      if (updErr) {
        console.error(`Erro ao atualizar pedido ${order.id}:`, updErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Backfill concluído! Total de pedidos atualizados com snapshot de cliente e vendedor: ${updatedCount}`);
}

backfillSnapshots();
