import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingCustomerData() {
  const { data: orders, error } = await supabase.from('orders').select('id, customer_name, customer_id, order_data');
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  const { data: people } = await supabase.from('people').select('*');
  const peopleMapById = new Map();
  const peopleMapByName = new Map();
  
  for (const p of (people || [])) {
    if (p.id) peopleMapById.set(String(p.id), p);
    if (p.fullName) peopleMapByName.set(p.fullName.trim().toLowerCase(), p);
    if (p.socialName) peopleMapByName.set(p.socialName.trim().toLowerCase(), p);
  }

  let totalWithoutCustomerData = 0;
  let totalFixed = 0;
  let sampleMissing = [];

  for (const o of orders) {
    const od = o.order_data || {};
    const cd = od.customerData || {};
    const hasData = cd.fullName || cd.phone || cd.cpfCnpj || (cd.fullAddress && (cd.fullAddress.street || cd.fullAddress.cep));
    
    if (!hasData) {
      totalWithoutCustomerData++;
      // Tentar encontrar o cliente
      let matchedPerson = null;
      if (o.customer_id && peopleMapById.has(String(o.customer_id))) {
        matchedPerson = peopleMapById.get(String(o.customer_id));
      } else if (cd.id && peopleMapById.has(String(cd.id))) {
        matchedPerson = peopleMapById.get(String(cd.id));
      } else if (o.customer_name && peopleMapByName.has(o.customer_name.trim().toLowerCase())) {
        matchedPerson = peopleMapByName.get(o.customer_name.trim().toLowerCase());
      } else if (cd.fullName && peopleMapByName.has(cd.fullName.trim().toLowerCase())) {
        matchedPerson = peopleMapByName.get(cd.fullName.trim().toLowerCase());
      }

      sampleMissing.push({
        orderId: o.id,
        customer_name: o.customer_name,
        customer_id: o.customer_id,
        cd,
        hasMatched: !!matchedPerson
      });
    }
  }

  console.log("Total orders:", orders.length);
  console.log("Total orders without complete customerData in order_data:", totalWithoutCustomerData);
  console.log("Sample missing:", sampleMissing.slice(0, 15));
}

checkMissingCustomerData();
