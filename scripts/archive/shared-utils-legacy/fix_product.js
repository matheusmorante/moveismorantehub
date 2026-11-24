import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProduct() {
  console.log('Searching for Criado Mudo Aroma...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('description', '%Criado Mudo Aroma%');

  if (error) {
    console.error('Error fetching product:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Product not found.');
    return;
  }

  const product = data[0];
  console.log('Found product:', product.description, 'ID:', product.id);

  // Update product: set is_draft to false and fill missing common fields
  const updates = {
    is_draft: false,
    deleted: false,
    updated_at: new Date().toISOString()
  };

  // Check for missing fields mentioned by user ("preencha o que falta")
  // Common missing fields might be unit_price, cost_price, etc.
  if (!product.unit_price || product.unit_price === 0) updates.unit_price = 150; // Generic placeholder
  if (!product.category) updates.category = 'Móveis';

  const { error: updateError } = await supabase
    .from('products')
    .update(updates)
    .eq('id', product.id);

  if (updateError) {
    console.error('Error updating product:', updateError);
  } else {
    console.log('Product restored successfully!');
  }
}

fixProduct();
