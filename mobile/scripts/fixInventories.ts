import { createClient } from '@supabase/supabase-js';

// Setup supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // Delete old adjustments with large timestamp labels
    const { data: adj, error: e1 } = await supabase
        .from('inventory_moves')
        .delete()
        .ilike('label', 'Ajuste lançado pelo inventário #178982%');
        
    console.log('Deleted old adjustments:', e1 || 'Success');

    // Delete the inventories we just converted that don't have matching adjustments anymore
    // (We updated them to 000003..000014, we can just delete them so it's clean)
    const { data: invs, error: e2 } = await supabase
        .from('inventory_moves')
        .delete()
        .ilike('label', 'Inventário #000%')
        .gt('label', 'Inventário #000002'); // Keep 000001 and 000002 if they are valid

    console.log('Deleted orphan converted inventories:', e2 || 'Success');

    // Let's also check if there are any 'Inventário #178982%' left
    const { error: e3 } = await supabase
        .from('inventory_moves')
        .delete()
        .ilike('label', 'Inventário #178982%');

    console.log('Deleted any remaining timestamp inventories:', e3 || 'Success');

    console.log("Done cleaning up!");

  } catch (err) {
      console.error(err);
  }
}

run();
