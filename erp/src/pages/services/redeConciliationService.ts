import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';

export const redeConciliationService = {
  /**
   * Consulta o status de uma transação específica na Rede
   */
  async checkTransactionStatus(tid: string) {
    try {
      const { data, error } = await supabase.functions.invoke('rede-gateway', {
        body: {
          action: 'get-transaction',
          payload: { tid },
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao consultar status na Rede:', err);
      return null;
    }
  },

  /**
   * Processa a conciliação de uma transação aprovada
   */
  async reconcileApprovedTransaction(transaction: any) {
    const { tid, order_id, amount, payment_method } = transaction;

    console.log(`Conciliando transação ${tid} para o pedido ${order_id}...`);

    try {
      // 1. Atualizar registro na rede_transactions
      await supabase
        .from('rede_transactions')
        .update({ status: 'approved', last_check: new Date().toISOString() })
        .eq('tid', tid);

      if (order_id) {
        // 2. Tentar encontrar e baixar conta a receber vinculada
        const { data: receivables } = await supabase
          .from('accounts_receivable')
          .select('id')
          .eq('order_id', order_id)
          .eq('status', 'pending');

        if (receivables && receivables.length > 0) {
          for (const rec of receivables) {
            await supabase
              .from('accounts_receivable')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                paid_amount: amount,
              })
              .eq('id', rec.id);
          }
        }

        // 3. Atualizar status do pedido se necessário
        // (Opcional: implementar lógica de "Pago Parcial" vs "Pago Total")

        toast.success(`Pagamento Pix aprovado! Pedido: ${order_id}`);
      }
    } catch (err) {
      console.error('Erro na conciliação:', err);
    }
  },

  /**
   * Busca todas as transações pendentes e atualiza o status
   */
  async syncPendingTransactions() {
    const { data: pending } = await supabase
      .from('rede_transactions')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_method', 'pix');

    if (!pending || pending.length === 0) return;

    for (const tx of pending) {
      const status = await this.checkTransactionStatus(tx.tid);
      if (status && (status.returnCode === '00' || status.returnCode === '0')) {
        await this.reconcileApprovedTransaction({ ...tx, ...status });
      } else {
        // Atualiza apenas a data da última checagem
        await supabase
          .from('rede_transactions')
          .update({ last_check: new Date().toISOString() })
          .eq('tid', tx.tid);
      }
    }
  },
};
