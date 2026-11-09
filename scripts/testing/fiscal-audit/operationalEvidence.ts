import { createHash } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

export async function runOperationalAudit(root: string): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('AUDIT_PROJECT_MISMATCH');
  const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '', {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:doc,error} = await db.from('nfe_documents').select('id,order_id,ambiente,modelo,numero_nfe,serie,status,emission_request_id,fiscal_snapshot_id,chave_acesso,xml_nfe,hml_response_history,numero_protocolo,updated_at')
    .eq('emission_request_id','aa1146c0-ea67-47aa-9ec6-8af7e5907dcd').single();
  if (error || doc?.ambiente !== 2) throw new Error('AUDIT_DOCUMENT_MISMATCH');
  const {captureOperationalState} = require(path.join(root,'scripts/testing/nfe-operational-audit.cjs'));
  const operational = await captureOperationalState(db,doc.order_id);
  const {data:snapshot,error:snapshotError} = await db.from('nfe_fiscal_snapshots').select('snapshot_data,snapshot_sha256').eq('id',doc.fiscal_snapshot_id).single();
  if (snapshotError) throw new Error('AUDIT_SNAPSHOT_MISSING');
  const hash = (value:string) => createHash('sha256').update(value).digest('hex');
  console.log(JSON.stringify({projectRef:'hkoxhourxwlddgsfdgws',emissionRequestId:doc.emission_request_id,
    documentId:doc.id,orderId:doc.order_id,model:doc.modelo,environment:doc.ambiente,number:doc.numero_nfe,series:doc.serie,status:doc.status,
    keyHash:hash(doc.chave_acesso||''),xmlHash:hash(doc.xml_nfe||''),xmlBytes:Buffer.byteLength(doc.xml_nfe||''),
    snapshotId:doc.fiscal_snapshot_id,snapshotHash:hash(JSON.stringify(snapshot.snapshot_data)),
    protocolPresent:Boolean(doc.numero_protocolo),historyCount:doc.hml_response_history?.length,updatedAt:doc.updated_at,
    operational:operational.map((item:{count:number;hash:string},index:number)=>({table:['orders','order_items','order_payments','inventory_moves','accounts_receivable','financial_transactions'][index],...item}))}));
}
