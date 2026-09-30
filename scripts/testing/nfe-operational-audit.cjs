// Read-only operational evidence for an existing order. Values never leave this process.
const crypto = require('node:crypto');
async function captureOperationalState(db, id) {
  const results = await Promise.all([
    db.from('orders').select('*').eq('id', id),
    db.from('order_items').select('*').eq('order_id', id),
    db.from('order_payments').select('*').eq('order_id', id),
    db.from('inventory_moves').select('*').or(`order_id.eq.${id},source_order_id.eq.${id}`),
    db.from('accounts_receivable').select('*').eq('order_id', id),
    db.from('financial_transactions').select('*').eq('reference_id', id),
  ]);
  return results.map((result) => {
    if (result.error) throw new Error('Could not verify operational isolation.');
    const rows = (result.data || []).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return { count: rows.length, hash: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  });
}
module.exports = { captureOperationalState };
