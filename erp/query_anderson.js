
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function searchProfiles() {
    console.log("Searching in 'profiles'...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) {
        console.error("Error:", error);
        return;
    }

    const matches = profiles.filter(p => JSON.stringify(p).toLowerCase().includes('anderson'));
    console.log(`Found ${matches.length} matching profiles.`);
    if (matches.length > 0) {
        console.log("Matches:", JSON.stringify(matches, null, 2));
    }
}

searchProfiles();
